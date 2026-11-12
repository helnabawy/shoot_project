import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

// Idempotent: the hosted database already had this schema (pushed before the migration was recorded),
// so every statement skips what exists and `payload migrate` can record it without failing.
export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TABLE IF NOT EXISTS "site_settings_account_about" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL
  );

  CREATE TABLE IF NOT EXISTS "site_settings_account_about_locales" (
  	"line" varchar NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );

  ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "account_finish_dismissed_at" timestamp(3) with time zone;
  DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'site_settings_account_about_parent_id_fk') THEN
      ALTER TABLE "site_settings_account_about" ADD CONSTRAINT "site_settings_account_about_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."site_settings"("id") ON DELETE cascade ON UPDATE no action;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'site_settings_account_about_locales_parent_id_fk') THEN
      ALTER TABLE "site_settings_account_about_locales" ADD CONSTRAINT "site_settings_account_about_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."site_settings_account_about"("id") ON DELETE cascade ON UPDATE no action;
    END IF;
  END $$;
  CREATE INDEX IF NOT EXISTS "site_settings_account_about_order_idx" ON "site_settings_account_about" USING btree ("_order");
  CREATE INDEX IF NOT EXISTS "site_settings_account_about_parent_id_idx" ON "site_settings_account_about" USING btree ("_parent_id");
  CREATE UNIQUE INDEX IF NOT EXISTS "site_settings_account_about_locales_locale_parent_id_unique" ON "site_settings_account_about_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX IF NOT EXISTS "site_settings_account_about_locales_parent_id_idx" ON "site_settings_account_about_locales" USING btree ("_parent_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "site_settings_account_about" CASCADE;
  DROP TABLE "site_settings_account_about_locales" CASCADE;
  ALTER TABLE "users" DROP COLUMN "account_finish_dismissed_at";`)
}
