import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "users" DROP CONSTRAINT "users_persona_id_personas_id_fk";
  
  DROP INDEX "users_persona_idx";
  ALTER TABLE "users_rels" ADD COLUMN "personas_id" integer;
  ALTER TABLE "users_rels" ADD CONSTRAINT "users_rels_personas_fk" FOREIGN KEY ("personas_id") REFERENCES "public"."personas"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "users_rels_personas_id_idx" ON "users_rels" USING btree ("personas_id");
  -- Keep every provider's profession: the single column becomes the first row of the list.
  INSERT INTO "users_rels" ("order", "parent_id", "path", "personas_id")
    SELECT 1, "id", 'persona', "persona_id" FROM "users" WHERE "persona_id" IS NOT NULL;
  ALTER TABLE "users" DROP COLUMN "persona_id";`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "users_rels" DROP CONSTRAINT "users_rels_personas_fk";
  
  DROP INDEX "users_rels_personas_id_idx";
  ALTER TABLE "users" ADD COLUMN "persona_id" integer;
  ALTER TABLE "users" ADD CONSTRAINT "users_persona_id_personas_id_fk" FOREIGN KEY ("persona_id") REFERENCES "public"."personas"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "users_persona_idx" ON "users" USING btree ("persona_id");
  -- Back to one profession: the primary (first) one.
  UPDATE "users" u SET "persona_id" = r."personas_id"
    FROM (SELECT DISTINCT ON ("parent_id") "parent_id", "personas_id" FROM "users_rels"
          WHERE "path" = 'persona' AND "personas_id" IS NOT NULL ORDER BY "parent_id", "order") r
    WHERE u."id" = r."parent_id";
  DELETE FROM "users_rels" WHERE "path" = 'persona';
  ALTER TABLE "users_rels" DROP COLUMN "personas_id";`)
}
