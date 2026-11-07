import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

// Reviewed for data loss: glyphs move from the base tables to the English locale rows and back.
export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "personas_locales" ADD COLUMN "glyph" varchar;
  ALTER TABLE "categories_locales" ADD COLUMN "glyph" varchar;
  ALTER TABLE "option_sets_options_locales" ADD COLUMN "glyph" varchar;
  ALTER TABLE "landing_page_blocks_features_items_locales" ADD COLUMN "glyph" varchar;
  ALTER TABLE "_landing_page_v_blocks_features_items_locales" ADD COLUMN "glyph" varchar;
  -- Keep existing glyphs as the English value (Arabic falls back to English until translated).
  UPDATE "personas_locales" l SET "glyph" = p."glyph" FROM "personas" p WHERE l."_parent_id" = p."id" AND l."_locale" = 'en';
  UPDATE "categories_locales" l SET "glyph" = p."glyph" FROM "categories" p WHERE l."_parent_id" = p."id" AND l."_locale" = 'en';
  UPDATE "option_sets_options_locales" l SET "glyph" = p."glyph" FROM "option_sets_options" p WHERE l."_parent_id" = p."id" AND l."_locale" = 'en';
  UPDATE "landing_page_blocks_features_items_locales" l SET "glyph" = p."glyph" FROM "landing_page_blocks_features_items" p WHERE l."_parent_id" = p."id" AND l."_locale" = 'en';
  UPDATE "_landing_page_v_blocks_features_items_locales" l SET "glyph" = p."glyph" FROM "_landing_page_v_blocks_features_items" p WHERE l."_parent_id" = p."id" AND l."_locale" = 'en';
  ALTER TABLE "personas" DROP COLUMN "glyph";
  ALTER TABLE "categories" DROP COLUMN "glyph";
  ALTER TABLE "option_sets_options" DROP COLUMN "glyph";
  ALTER TABLE "landing_page_blocks_features_items" DROP COLUMN "glyph";
  ALTER TABLE "_landing_page_v_blocks_features_items" DROP COLUMN "glyph";`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "personas" ADD COLUMN "glyph" varchar;
  ALTER TABLE "categories" ADD COLUMN "glyph" varchar;
  ALTER TABLE "option_sets_options" ADD COLUMN "glyph" varchar;
  ALTER TABLE "landing_page_blocks_features_items" ADD COLUMN "glyph" varchar;
  ALTER TABLE "_landing_page_v_blocks_features_items" ADD COLUMN "glyph" varchar;
  UPDATE "personas" p SET "glyph" = l."glyph" FROM "personas_locales" l WHERE l."_parent_id" = p."id" AND l."_locale" = 'en';
  UPDATE "categories" p SET "glyph" = l."glyph" FROM "categories_locales" l WHERE l."_parent_id" = p."id" AND l."_locale" = 'en';
  UPDATE "option_sets_options" p SET "glyph" = l."glyph" FROM "option_sets_options_locales" l WHERE l."_parent_id" = p."id" AND l."_locale" = 'en';
  UPDATE "landing_page_blocks_features_items" p SET "glyph" = l."glyph" FROM "landing_page_blocks_features_items_locales" l WHERE l."_parent_id" = p."id" AND l."_locale" = 'en';
  UPDATE "_landing_page_v_blocks_features_items" p SET "glyph" = l."glyph" FROM "_landing_page_v_blocks_features_items_locales" l WHERE l."_parent_id" = p."id" AND l."_locale" = 'en';
  ALTER TABLE "personas_locales" DROP COLUMN "glyph";
  ALTER TABLE "categories_locales" DROP COLUMN "glyph";
  ALTER TABLE "option_sets_options_locales" DROP COLUMN "glyph";
  ALTER TABLE "landing_page_blocks_features_items_locales" DROP COLUMN "glyph";
  ALTER TABLE "_landing_page_v_blocks_features_items_locales" DROP COLUMN "glyph";`)
}
