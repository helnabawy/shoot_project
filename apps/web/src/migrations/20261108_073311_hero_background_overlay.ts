import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "landing_page" ADD COLUMN "hero_overlay_id" integer;
  ALTER TABLE "landing_page" ADD COLUMN "hero_overlay_opacity" numeric DEFAULT 8;
  ALTER TABLE "_landing_page_v" ADD COLUMN "version_hero_overlay_id" integer;
  ALTER TABLE "_landing_page_v" ADD COLUMN "version_hero_overlay_opacity" numeric DEFAULT 8;
  ALTER TABLE "landing_page" ADD CONSTRAINT "landing_page_hero_overlay_id_media_id_fk" FOREIGN KEY ("hero_overlay_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_landing_page_v" ADD CONSTRAINT "_landing_page_v_version_hero_overlay_id_media_id_fk" FOREIGN KEY ("version_hero_overlay_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "landing_page_hero_hero_overlay_idx" ON "landing_page" USING btree ("hero_overlay_id");
  CREATE INDEX "_landing_page_v_version_hero_version_hero_overlay_idx" ON "_landing_page_v" USING btree ("version_hero_overlay_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "landing_page" DROP CONSTRAINT "landing_page_hero_overlay_id_media_id_fk";
  
  ALTER TABLE "_landing_page_v" DROP CONSTRAINT "_landing_page_v_version_hero_overlay_id_media_id_fk";
  
  DROP INDEX "landing_page_hero_hero_overlay_idx";
  DROP INDEX "_landing_page_v_version_hero_version_hero_overlay_idx";
  ALTER TABLE "landing_page" DROP COLUMN "hero_overlay_id";
  ALTER TABLE "landing_page" DROP COLUMN "hero_overlay_opacity";
  ALTER TABLE "_landing_page_v" DROP COLUMN "version_hero_overlay_id";
  ALTER TABLE "_landing_page_v" DROP COLUMN "version_hero_overlay_opacity";`)
}
