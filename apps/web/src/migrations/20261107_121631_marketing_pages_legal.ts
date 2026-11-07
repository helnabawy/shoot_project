import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_legal_documents_versions_state" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum_legal_documents_kind" AS ENUM('terms', 'professional-terms', 'privacy');
  CREATE TYPE "public"."enum_legal_acceptances_kind" AS ENUM('terms', 'professional-terms', 'privacy');
  CREATE TYPE "public"."enum_legal_acceptances_locale" AS ENUM('en', 'ar');
  CREATE TABLE "legal_documents_versions" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"version" numeric,
  	"effective_from" timestamp(3) with time zone,
  	"state" "enum_legal_documents_versions_state" DEFAULT 'draft' NOT NULL,
  	"placeholder" boolean DEFAULT false,
  	"published_at" timestamp(3) with time zone,
  	"published_by_id" integer
  );
  
  CREATE TABLE "legal_documents_versions_locales" (
  	"change_summary" varchar,
  	"body" jsonb,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "legal_documents" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"kind" "enum_legal_documents_kind" NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "legal_documents_locales" (
  	"title" varchar NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "legal_acceptances" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"user_id" integer NOT NULL,
  	"kind" "enum_legal_acceptances_kind" NOT NULL,
  	"version" numeric NOT NULL,
  	"accepted_at" timestamp(3) with time zone NOT NULL,
  	"locale" "enum_legal_acceptances_locale" NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "legal_documents_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "legal_acceptances_id" integer;
  ALTER TABLE "legal_documents_versions" ADD CONSTRAINT "legal_documents_versions_published_by_id_users_id_fk" FOREIGN KEY ("published_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "legal_documents_versions" ADD CONSTRAINT "legal_documents_versions_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."legal_documents"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "legal_documents_versions_locales" ADD CONSTRAINT "legal_documents_versions_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."legal_documents_versions"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "legal_documents_locales" ADD CONSTRAINT "legal_documents_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."legal_documents"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "legal_acceptances" ADD CONSTRAINT "legal_acceptances_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "legal_documents_versions_order_idx" ON "legal_documents_versions" USING btree ("_order");
  CREATE INDEX "legal_documents_versions_parent_id_idx" ON "legal_documents_versions" USING btree ("_parent_id");
  CREATE INDEX "legal_documents_versions_published_by_idx" ON "legal_documents_versions" USING btree ("published_by_id");
  CREATE UNIQUE INDEX "legal_documents_versions_locales_locale_parent_id_unique" ON "legal_documents_versions_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "legal_documents_versions_locales_parent_id_idx" ON "legal_documents_versions_locales" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "legal_documents_kind_idx" ON "legal_documents" USING btree ("kind");
  CREATE INDEX "legal_documents_updated_at_idx" ON "legal_documents" USING btree ("updated_at");
  CREATE INDEX "legal_documents_created_at_idx" ON "legal_documents" USING btree ("created_at");
  CREATE UNIQUE INDEX "legal_documents_locales_locale_parent_id_unique" ON "legal_documents_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "legal_documents_locales_parent_id_idx" ON "legal_documents_locales" USING btree ("_parent_id");
  CREATE INDEX "legal_acceptances_user_idx" ON "legal_acceptances" USING btree ("user_id");
  CREATE INDEX "legal_acceptances_updated_at_idx" ON "legal_acceptances" USING btree ("updated_at");
  CREATE INDEX "legal_acceptances_created_at_idx" ON "legal_acceptances" USING btree ("created_at");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_legal_documents_fk" FOREIGN KEY ("legal_documents_id") REFERENCES "public"."legal_documents"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_legal_acceptances_fk" FOREIGN KEY ("legal_acceptances_id") REFERENCES "public"."legal_acceptances"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_legal_documents_id_idx" ON "payload_locked_documents_rels" USING btree ("legal_documents_id");
  CREATE INDEX "payload_locked_documents_rels_legal_acceptances_id_idx" ON "payload_locked_documents_rels" USING btree ("legal_acceptances_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "legal_documents_versions" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "legal_documents_versions_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "legal_documents" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "legal_documents_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "legal_acceptances" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "legal_documents_versions" CASCADE;
  DROP TABLE "legal_documents_versions_locales" CASCADE;
  DROP TABLE "legal_documents" CASCADE;
  DROP TABLE "legal_documents_locales" CASCADE;
  DROP TABLE "legal_acceptances" CASCADE;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_legal_documents_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_legal_acceptances_fk";
  
  DROP INDEX "payload_locked_documents_rels_legal_documents_id_idx";
  DROP INDEX "payload_locked_documents_rels_legal_acceptances_id_idx";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "legal_documents_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "legal_acceptances_id";
  DROP TYPE "public"."enum_legal_documents_versions_state";
  DROP TYPE "public"."enum_legal_documents_kind";
  DROP TYPE "public"."enum_legal_acceptances_kind";
  DROP TYPE "public"."enum_legal_acceptances_locale";`)
}
