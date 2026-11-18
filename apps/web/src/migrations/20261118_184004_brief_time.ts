import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

/**
 * Feature 026: the brief's start time. Schema: the switch group `briefTime` in the site settings and the
 * brief's `startTime` (additive only, nothing is dropped or rewritten). Data: the "Start times" option set
 * (07:00 to 21:00, every hour, value HH-MM) is created when no set has that slug, linked to the switch, and
 * the switch's words are filled in English and Arabic where empty. The switch stays off, so the site is
 * unchanged until the owner turns it on. Down drops the columns; the option set is left (it is content).
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "briefs" ADD COLUMN "start_time" varchar;
  ALTER TABLE "site_settings" ADD COLUMN "brief_time_enabled" boolean DEFAULT false;
  ALTER TABLE "site_settings" ADD COLUMN "brief_time_times_id" integer;
  ALTER TABLE "site_settings" ADD COLUMN "brief_time_required" boolean DEFAULT false;
  ALTER TABLE "site_settings_locales" ADD COLUMN "brief_time_group_label" varchar;
  ALTER TABLE "site_settings_locales" ADD COLUMN "brief_time_any_time" varchar;
  ALTER TABLE "site_settings_locales" ADD COLUMN "brief_time_connector" varchar;
  ALTER TABLE "site_settings" ADD CONSTRAINT "site_settings_brief_time_times_id_option_sets_id_fk" FOREIGN KEY ("brief_time_times_id") REFERENCES "public"."option_sets"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "site_settings_brief_time_brief_time_times_idx" ON "site_settings" USING btree ("brief_time_times_id");`)

  await db.execute(sql`
  DO $$
  DECLARE set_id integer;
  BEGIN
    IF NOT EXISTS (SELECT 1 FROM "option_sets" WHERE "slug" = 'start-times') THEN
      INSERT INTO "option_sets" ("slug") VALUES ('start-times') RETURNING "id" INTO set_id;
      INSERT INTO "option_sets_locales" ("name", "_locale", "_parent_id") VALUES ('Start times', 'en', set_id), ('أوقات البدء', 'ar', set_id);
      INSERT INTO "option_sets_options" ("_order", "_parent_id", "id", "value", "order", "active", "matches_any")
        SELECT h - 6, set_id, substr(md5('026-start-times-' || h), 1, 24), lpad(h::text, 2, '0') || '-00', (h - 6) * 10, true, false
        FROM generate_series(7, 21) AS h;
      INSERT INTO "option_sets_options_locales" ("label", "glyph", "_locale", "_parent_id")
        SELECT lpad(h::text, 2, '0') || ':00', lpad(h::text, 2, '0'), l::"_locales", substr(md5('026-start-times-' || h), 1, 24)
        FROM generate_series(7, 21) AS h, unnest(ARRAY['en', 'ar']) AS l;
    END IF;
    SELECT "id" INTO set_id FROM "option_sets" WHERE "slug" = 'start-times';
    UPDATE "site_settings" SET "brief_time_times_id" = set_id WHERE "brief_time_times_id" IS NULL;
  END $$;
  UPDATE "site_settings_locales" SET
    "brief_time_group_label" = COALESCE("brief_time_group_label", 'Start time'),
    "brief_time_any_time" = COALESCE("brief_time_any_time", 'any time'),
    "brief_time_connector" = COALESCE("brief_time_connector", 'at')
    WHERE "_locale" = 'en';
  UPDATE "site_settings_locales" SET
    "brief_time_group_label" = COALESCE("brief_time_group_label", 'وقت البدء'),
    "brief_time_any_time" = COALESCE("brief_time_any_time", 'أي وقت'),
    "brief_time_connector" = COALESCE("brief_time_connector", 'الساعة')
    WHERE "_locale" = 'ar';`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "site_settings" DROP CONSTRAINT "site_settings_brief_time_times_id_option_sets_id_fk";
  
  DROP INDEX "site_settings_brief_time_brief_time_times_idx";
  ALTER TABLE "briefs" DROP COLUMN "start_time";
  ALTER TABLE "site_settings" DROP COLUMN "brief_time_enabled";
  ALTER TABLE "site_settings" DROP COLUMN "brief_time_times_id";
  ALTER TABLE "site_settings" DROP COLUMN "brief_time_required";
  ALTER TABLE "site_settings_locales" DROP COLUMN "brief_time_group_label";
  ALTER TABLE "site_settings_locales" DROP COLUMN "brief_time_any_time";
  ALTER TABLE "site_settings_locales" DROP COLUMN "brief_time_connector";`)
}
