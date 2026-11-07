import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TABLE "pages_intent_presets" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"token" varchar,
  	"value" varchar
  );
  
  CREATE TABLE "pages_intent_faq" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "pages_intent_faq_locales" (
  	"question" varchar,
  	"answer" jsonb,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "_pages_v_version_intent_presets" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"token" varchar,
  	"value" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_pages_v_version_intent_faq" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_pages_v_version_intent_faq_locales" (
  	"question" varchar,
  	"answer" jsonb,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  ALTER TABLE "pages" ADD COLUMN "intent_persona_id" integer;
  ALTER TABLE "pages" ADD COLUMN "intent_specialty_id" integer;
  ALTER TABLE "pages" ADD COLUMN "intent_location_id" integer;
  ALTER TABLE "pages_locales" ADD COLUMN "intent_intro" varchar;
  ALTER TABLE "pages_locales" ADD COLUMN "intent_service_name" varchar;
  ALTER TABLE "pages_locales" ADD COLUMN "intent_area_served" varchar;
  ALTER TABLE "_pages_v" ADD COLUMN "version_intent_persona_id" integer;
  ALTER TABLE "_pages_v" ADD COLUMN "version_intent_specialty_id" integer;
  ALTER TABLE "_pages_v" ADD COLUMN "version_intent_location_id" integer;
  ALTER TABLE "_pages_v_locales" ADD COLUMN "version_intent_intro" varchar;
  ALTER TABLE "_pages_v_locales" ADD COLUMN "version_intent_service_name" varchar;
  ALTER TABLE "_pages_v_locales" ADD COLUMN "version_intent_area_served" varchar;
  ALTER TABLE "pages_intent_presets" ADD CONSTRAINT "pages_intent_presets_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_intent_faq" ADD CONSTRAINT "pages_intent_faq_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_intent_faq_locales" ADD CONSTRAINT "pages_intent_faq_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_intent_faq"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_version_intent_presets" ADD CONSTRAINT "_pages_v_version_intent_presets_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_version_intent_faq" ADD CONSTRAINT "_pages_v_version_intent_faq_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_version_intent_faq_locales" ADD CONSTRAINT "_pages_v_version_intent_faq_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v_version_intent_faq"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "pages_intent_presets_order_idx" ON "pages_intent_presets" USING btree ("_order");
  CREATE INDEX "pages_intent_presets_parent_id_idx" ON "pages_intent_presets" USING btree ("_parent_id");
  CREATE INDEX "pages_intent_faq_order_idx" ON "pages_intent_faq" USING btree ("_order");
  CREATE INDEX "pages_intent_faq_parent_id_idx" ON "pages_intent_faq" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "pages_intent_faq_locales_locale_parent_id_unique" ON "pages_intent_faq_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "pages_intent_faq_locales_parent_id_idx" ON "pages_intent_faq_locales" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_version_intent_presets_order_idx" ON "_pages_v_version_intent_presets" USING btree ("_order");
  CREATE INDEX "_pages_v_version_intent_presets_parent_id_idx" ON "_pages_v_version_intent_presets" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_version_intent_faq_order_idx" ON "_pages_v_version_intent_faq" USING btree ("_order");
  CREATE INDEX "_pages_v_version_intent_faq_parent_id_idx" ON "_pages_v_version_intent_faq" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "_pages_v_version_intent_faq_locales_locale_parent_id_unique" ON "_pages_v_version_intent_faq_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_pages_v_version_intent_faq_locales_parent_id_idx" ON "_pages_v_version_intent_faq_locales" USING btree ("_parent_id");
  ALTER TABLE "pages" ADD CONSTRAINT "pages_intent_persona_id_personas_id_fk" FOREIGN KEY ("intent_persona_id") REFERENCES "public"."personas"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "pages" ADD CONSTRAINT "pages_intent_specialty_id_categories_id_fk" FOREIGN KEY ("intent_specialty_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "pages" ADD CONSTRAINT "pages_intent_location_id_locations_id_fk" FOREIGN KEY ("intent_location_id") REFERENCES "public"."locations"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_pages_v" ADD CONSTRAINT "_pages_v_version_intent_persona_id_personas_id_fk" FOREIGN KEY ("version_intent_persona_id") REFERENCES "public"."personas"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_pages_v" ADD CONSTRAINT "_pages_v_version_intent_specialty_id_categories_id_fk" FOREIGN KEY ("version_intent_specialty_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_pages_v" ADD CONSTRAINT "_pages_v_version_intent_location_id_locations_id_fk" FOREIGN KEY ("version_intent_location_id") REFERENCES "public"."locations"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "pages_intent_intent_persona_idx" ON "pages" USING btree ("intent_persona_id");
  CREATE INDEX "pages_intent_intent_specialty_idx" ON "pages" USING btree ("intent_specialty_id");
  CREATE INDEX "pages_intent_intent_location_idx" ON "pages" USING btree ("intent_location_id");
  CREATE INDEX "_pages_v_version_intent_version_intent_persona_idx" ON "_pages_v" USING btree ("version_intent_persona_id");
  CREATE INDEX "_pages_v_version_intent_version_intent_specialty_idx" ON "_pages_v" USING btree ("version_intent_specialty_id");
  CREATE INDEX "_pages_v_version_intent_version_intent_location_idx" ON "_pages_v" USING btree ("version_intent_location_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "pages_intent_presets" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pages_intent_faq" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pages_intent_faq_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_v_version_intent_presets" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_v_version_intent_faq" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_v_version_intent_faq_locales" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "pages_intent_presets" CASCADE;
  DROP TABLE "pages_intent_faq" CASCADE;
  DROP TABLE "pages_intent_faq_locales" CASCADE;
  DROP TABLE "_pages_v_version_intent_presets" CASCADE;
  DROP TABLE "_pages_v_version_intent_faq" CASCADE;
  DROP TABLE "_pages_v_version_intent_faq_locales" CASCADE;
  ALTER TABLE "pages" DROP CONSTRAINT "pages_intent_persona_id_personas_id_fk";
  
  ALTER TABLE "pages" DROP CONSTRAINT "pages_intent_specialty_id_categories_id_fk";
  
  ALTER TABLE "pages" DROP CONSTRAINT "pages_intent_location_id_locations_id_fk";
  
  ALTER TABLE "_pages_v" DROP CONSTRAINT "_pages_v_version_intent_persona_id_personas_id_fk";
  
  ALTER TABLE "_pages_v" DROP CONSTRAINT "_pages_v_version_intent_specialty_id_categories_id_fk";
  
  ALTER TABLE "_pages_v" DROP CONSTRAINT "_pages_v_version_intent_location_id_locations_id_fk";
  
  DROP INDEX "pages_intent_intent_persona_idx";
  DROP INDEX "pages_intent_intent_specialty_idx";
  DROP INDEX "pages_intent_intent_location_idx";
  DROP INDEX "_pages_v_version_intent_version_intent_persona_idx";
  DROP INDEX "_pages_v_version_intent_version_intent_specialty_idx";
  DROP INDEX "_pages_v_version_intent_version_intent_location_idx";
  ALTER TABLE "pages" DROP COLUMN "intent_persona_id";
  ALTER TABLE "pages" DROP COLUMN "intent_specialty_id";
  ALTER TABLE "pages" DROP COLUMN "intent_location_id";
  ALTER TABLE "pages_locales" DROP COLUMN "intent_intro";
  ALTER TABLE "pages_locales" DROP COLUMN "intent_service_name";
  ALTER TABLE "pages_locales" DROP COLUMN "intent_area_served";
  ALTER TABLE "_pages_v" DROP COLUMN "version_intent_persona_id";
  ALTER TABLE "_pages_v" DROP COLUMN "version_intent_specialty_id";
  ALTER TABLE "_pages_v" DROP COLUMN "version_intent_location_id";
  ALTER TABLE "_pages_v_locales" DROP COLUMN "version_intent_intro";
  ALTER TABLE "_pages_v_locales" DROP COLUMN "version_intent_service_name";
  ALTER TABLE "_pages_v_locales" DROP COLUMN "version_intent_area_served";`)
}
