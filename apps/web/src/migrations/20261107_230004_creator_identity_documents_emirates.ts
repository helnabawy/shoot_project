import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_identity_documents_kind" AS ENUM('emirates-id', 'trade-license');
  CREATE TYPE "public"."enum_identity_documents_status" AS ENUM('pending', 'verified', 'rejected');
  CREATE TABLE "identity_documents" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"kind" "enum_identity_documents_kind" NOT NULL,
  	"status" "enum_identity_documents_status" DEFAULT 'pending' NOT NULL,
  	"note" varchar,
  	"reviewed_at" timestamp(3) with time zone,
  	"user_id" integer NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"url" varchar,
  	"thumbnail_u_r_l" varchar,
  	"filename" varchar,
  	"mime_type" varchar,
  	"filesize" numeric,
  	"width" numeric,
  	"height" numeric,
  	"focal_x" numeric,
  	"focal_y" numeric
  );
  
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "identity_documents_id" integer;
  ALTER TABLE "identity_documents" ADD CONSTRAINT "identity_documents_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "identity_documents_kind_idx" ON "identity_documents" USING btree ("kind");
  CREATE INDEX "identity_documents_status_idx" ON "identity_documents" USING btree ("status");
  CREATE INDEX "identity_documents_user_idx" ON "identity_documents" USING btree ("user_id");
  CREATE INDEX "identity_documents_updated_at_idx" ON "identity_documents" USING btree ("updated_at");
  CREATE INDEX "identity_documents_created_at_idx" ON "identity_documents" USING btree ("created_at");
  CREATE UNIQUE INDEX "identity_documents_filename_idx" ON "identity_documents" USING btree ("filename");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_identity_documents_fk" FOREIGN KEY ("identity_documents_id") REFERENCES "public"."identity_documents"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_identity_documents_id_idx" ON "payload_locked_documents_rels" USING btree ("identity_documents_id");`)

  // CP-FR-012 data: profiles name emirates only. Each city on a profile (live rows and versions) becomes its
  // emirate; where the emirate is already there, the city row is dropped instead. Not reversible: the cities
  // a creator picked are not kept (they never changed where the creator is listed, which was by emirate).
  for (const [table, path] of [
    ['creator_profiles_rels', 'cities'],
    ['_creator_profiles_v_rels', 'version.cities'],
  ]) {
    await db.execute(sql.raw(`
      DELETE FROM "${table}" r
      USING "locations" l
      WHERE r."path" = '${path}' AND r."locations_id" = l."id" AND l."parent_id" IS NOT NULL
        AND EXISTS (
          SELECT 1 FROM "${table}" o
          WHERE o."parent_id" = r."parent_id" AND o."path" = '${path}' AND o."locations_id" = l."parent_id"
        );
      DELETE FROM "${table}" r
      USING "${table}" o, "locations" l, "locations" lo
      WHERE r."path" = '${path}' AND o."path" = '${path}' AND r."parent_id" = o."parent_id" AND r."id" > o."id"
        AND r."locations_id" = l."id" AND o."locations_id" = lo."id"
        AND COALESCE(l."parent_id", l."id") = COALESCE(lo."parent_id", lo."id");
      UPDATE "${table}" r
      SET "locations_id" = l."parent_id"
      FROM "locations" l
      WHERE r."path" = '${path}' AND r."locations_id" = l."id" AND l."parent_id" IS NOT NULL;
    `))
  }
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "identity_documents" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "identity_documents" CASCADE;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_identity_documents_fk";
  
  DROP INDEX "payload_locked_documents_rels_identity_documents_id_idx";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "identity_documents_id";
  DROP TYPE "public"."enum_identity_documents_kind";
  DROP TYPE "public"."enum_identity_documents_status";`)
}
