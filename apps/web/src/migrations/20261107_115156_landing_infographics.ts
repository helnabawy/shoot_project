import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_landing_page_blocks_how_it_works_steps_visual" AS ENUM('none', 'brief', 'match', 'work');
  CREATE TYPE "public"."enum_landing_page_blocks_features_items_points_at" AS ENUM('none', 'sentence', 'language', 'send', 'whatsapp');
  CREATE TYPE "public"."enum__landing_page_v_blocks_how_it_works_steps_visual" AS ENUM('none', 'brief', 'match', 'work');
  CREATE TYPE "public"."enum__landing_page_v_blocks_features_items_points_at" AS ENUM('none', 'sentence', 'language', 'send', 'whatsapp');
  ALTER TABLE "landing_page_blocks_how_it_works_steps" ADD COLUMN "visual" "enum_landing_page_blocks_how_it_works_steps_visual" DEFAULT 'none';
  ALTER TABLE "landing_page_blocks_features_items" ADD COLUMN "points_at" "enum_landing_page_blocks_features_items_points_at" DEFAULT 'none';
  ALTER TABLE "_landing_page_v_blocks_how_it_works_steps" ADD COLUMN "visual" "enum__landing_page_v_blocks_how_it_works_steps_visual" DEFAULT 'none';
  ALTER TABLE "_landing_page_v_blocks_features_items" ADD COLUMN "points_at" "enum__landing_page_v_blocks_features_items_points_at" DEFAULT 'none';`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "landing_page_blocks_how_it_works_steps" DROP COLUMN "visual";
  ALTER TABLE "landing_page_blocks_features_items" DROP COLUMN "points_at";
  ALTER TABLE "_landing_page_v_blocks_how_it_works_steps" DROP COLUMN "visual";
  ALTER TABLE "_landing_page_v_blocks_features_items" DROP COLUMN "points_at";
  DROP TYPE "public"."enum_landing_page_blocks_how_it_works_steps_visual";
  DROP TYPE "public"."enum_landing_page_blocks_features_items_points_at";
  DROP TYPE "public"."enum__landing_page_v_blocks_how_it_works_steps_visual";
  DROP TYPE "public"."enum__landing_page_v_blocks_features_items_points_at";`)
}
