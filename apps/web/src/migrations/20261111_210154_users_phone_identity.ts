/*
 * Feature 009, users_phone_identity (specs/009-otp-sign-in/data-model.md "Migration"). Reviewed for data loss:
 * - up: creates the empty otp_challenges table (+ its enums, indexes and the locked-documents column);
 *   adds users.username (NULL for every existing row) with a unique index (Postgres allows many NULLs);
 *   drops NOT NULL on users.email and users.name. No column is dropped or retyped, no row is rewritten,
 *   and existing (unverified) phone values are not copied into username.
 * - down: drops otp_challenges and username and restores NOT NULL on email and name. It fails while code
 *   accounts exist (no email or no name), which is correct: rolling back would destroy them.
 */
import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_otp_challenges_channel" AS ENUM('sms', 'whatsapp');
  CREATE TYPE "public"."enum_otp_challenges_locale" AS ENUM('en', 'ar');
  CREATE TABLE "otp_challenges" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"public_id" varchar NOT NULL,
  	"phone_hash" varchar NOT NULL,
  	"code_hash" varchar NOT NULL,
  	"channel" "enum_otp_challenges_channel" NOT NULL,
  	"locale" "enum_otp_challenges_locale" NOT NULL,
  	"attempts" numeric DEFAULT 0 NOT NULL,
  	"expires_at" timestamp(3) with time zone NOT NULL,
  	"resend_at" timestamp(3) with time zone NOT NULL,
  	"used_at" timestamp(3) with time zone,
  	"superseded_at" timestamp(3) with time zone,
  	"provider_ref" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "users" ALTER COLUMN "name" DROP NOT NULL;
  ALTER TABLE "users" ALTER COLUMN "email" DROP NOT NULL;
  ALTER TABLE "users" ADD COLUMN "username" varchar;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "otp_challenges_id" integer;
  CREATE UNIQUE INDEX "otp_challenges_public_id_idx" ON "otp_challenges" USING btree ("public_id");
  CREATE INDEX "otp_challenges_phone_hash_idx" ON "otp_challenges" USING btree ("phone_hash");
  CREATE INDEX "otp_challenges_expires_at_idx" ON "otp_challenges" USING btree ("expires_at");
  CREATE INDEX "otp_challenges_updated_at_idx" ON "otp_challenges" USING btree ("updated_at");
  CREATE INDEX "otp_challenges_created_at_idx" ON "otp_challenges" USING btree ("created_at");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_otp_challenges_fk" FOREIGN KEY ("otp_challenges_id") REFERENCES "public"."otp_challenges"("id") ON DELETE cascade ON UPDATE no action;
  CREATE UNIQUE INDEX "users_username_idx" ON "users" USING btree ("username");
  CREATE INDEX "payload_locked_documents_rels_otp_challenges_id_idx" ON "payload_locked_documents_rels" USING btree ("otp_challenges_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "otp_challenges" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "otp_challenges" CASCADE;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_otp_challenges_fk";
  
  DROP INDEX "users_username_idx";
  DROP INDEX "payload_locked_documents_rels_otp_challenges_id_idx";
  ALTER TABLE "users" ALTER COLUMN "name" SET NOT NULL;
  ALTER TABLE "users" ALTER COLUMN "email" SET NOT NULL;
  ALTER TABLE "users" DROP COLUMN "username";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "otp_challenges_id";
  DROP TYPE "public"."enum_otp_challenges_channel";
  DROP TYPE "public"."enum_otp_challenges_locale";`)
}
