import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_categories_scene" AS ENUM('none', 'wedding', 'events', 'portrait', 'product', 'property', 'office', 'food');
  ALTER TABLE "categories" ADD COLUMN "scene" "enum_categories_scene" DEFAULT 'none';`)
  // One-time backfill for the specialties the seed creates, so an existing site shows their drawings
  // without a reseed. Editors choose the scene from here on; any other specialty stays 'none'.
  await db.execute(sql`
   UPDATE "categories" SET "scene" = CASE "slug"
     WHEN 'portrait' THEN 'portrait'::"enum_categories_scene"
     WHEN 'events' THEN 'events'::"enum_categories_scene"
     WHEN 'fashion-beauty' THEN 'product'::"enum_categories_scene"
     WHEN 'wedding-engagement' THEN 'wedding'::"enum_categories_scene"
     WHEN 'corporate-branding' THEN 'office'::"enum_categories_scene"
     WHEN 'real-estate-architecture' THEN 'property'::"enum_categories_scene"
     ELSE "scene" END;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "categories" DROP COLUMN "scene";
  DROP TYPE "public"."enum_categories_scene";`)
}
