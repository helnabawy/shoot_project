import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

// Reviewed for data loss (FR-063): each brief's single persona is copied into "briefs_rels" before
// the column is dropped; going down keeps the first persona each brief chose.

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TABLE "briefs_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"personas_id" integer
  );
  
  ALTER TABLE "briefs" DROP CONSTRAINT "briefs_persona_id_personas_id_fk";
  
  DROP INDEX "briefs_persona_idx";
  ALTER TABLE "landing_page_brief_builder_slots" ADD COLUMN "multiple" boolean DEFAULT false;
  ALTER TABLE "_landing_page_v_version_brief_builder_slots" ADD COLUMN "multiple" boolean DEFAULT false;
  ALTER TABLE "briefs_rels" ADD CONSTRAINT "briefs_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."briefs"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "briefs_rels" ADD CONSTRAINT "briefs_rels_personas_fk" FOREIGN KEY ("personas_id") REFERENCES "public"."personas"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "briefs_rels_order_idx" ON "briefs_rels" USING btree ("order");
  CREATE INDEX "briefs_rels_parent_idx" ON "briefs_rels" USING btree ("parent_id");
  CREATE INDEX "briefs_rels_path_idx" ON "briefs_rels" USING btree ("path");
  CREATE INDEX "briefs_rels_personas_id_idx" ON "briefs_rels" USING btree ("personas_id");
  INSERT INTO "briefs_rels" ("order", "parent_id", "path", "personas_id")
    SELECT 1, "id", 'persona', "persona_id" FROM "briefs" WHERE "persona_id" IS NOT NULL;
  ALTER TABLE "briefs" DROP COLUMN "persona_id";`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "briefs" ADD COLUMN "persona_id" integer;
  UPDATE "briefs" b SET "persona_id" = r."personas_id" FROM (
    SELECT DISTINCT ON ("parent_id") "parent_id", "personas_id" FROM "briefs_rels"
    WHERE "path" = 'persona' ORDER BY "parent_id", "order"
  ) r WHERE r."parent_id" = b."id";
  ALTER TABLE "briefs" ALTER COLUMN "persona_id" SET NOT NULL;
  ALTER TABLE "briefs_rels" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "briefs_rels" CASCADE;
  ALTER TABLE "briefs" ADD CONSTRAINT "briefs_persona_id_personas_id_fk" FOREIGN KEY ("persona_id") REFERENCES "public"."personas"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "briefs_persona_idx" ON "briefs" USING btree ("persona_id");
  ALTER TABLE "landing_page_brief_builder_slots" DROP COLUMN "multiple";
  ALTER TABLE "_landing_page_v_version_brief_builder_slots" DROP COLUMN "multiple";`)
}
