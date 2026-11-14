import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_payments_source" AS ENUM('manual', 'online');
  CREATE TYPE "public"."enum_payment_sessions_provider" AS ENUM('stripe');
  CREATE TYPE "public"."enum_payment_sessions_status" AS ENUM('open', 'paid', 'expired');
  ALTER TYPE "public"."enum_payments_method" ADD VALUE 'card-online' BEFORE 'other';
  ALTER TYPE "public"."enum_notifications_event" ADD VALUE 'payment-attention';
  ALTER TYPE "public"."enum_site_settings_quick_match_templates_event" ADD VALUE 'payment-attention';
  CREATE TABLE "payment_sessions" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"booking_id" integer NOT NULL,
  	"revision" numeric NOT NULL,
  	"amount_fils" numeric NOT NULL,
  	"provider" "enum_payment_sessions_provider" DEFAULT 'stripe' NOT NULL,
  	"provider_session_id" varchar NOT NULL,
  	"url" varchar NOT NULL,
  	"status" "enum_payment_sessions_status" DEFAULT 'open' NOT NULL,
  	"expires_at" timestamp(3) with time zone NOT NULL,
  	"payment_ref" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "payments" ADD COLUMN "source" "enum_payments_source" DEFAULT 'manual';
  ALTER TABLE "payments" ADD COLUMN "provider_ref" varchar;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "payment_sessions_id" integer;
  ALTER TABLE "payment_sessions" ADD CONSTRAINT "payment_sessions_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "payment_sessions_booking_idx" ON "payment_sessions" USING btree ("booking_id");
  CREATE UNIQUE INDEX "payment_sessions_provider_session_id_idx" ON "payment_sessions" USING btree ("provider_session_id");
  CREATE INDEX "payment_sessions_status_idx" ON "payment_sessions" USING btree ("status");
  CREATE INDEX "payment_sessions_updated_at_idx" ON "payment_sessions" USING btree ("updated_at");
  CREATE INDEX "payment_sessions_created_at_idx" ON "payment_sessions" USING btree ("created_at");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_payment_sessions_fk" FOREIGN KEY ("payment_sessions_id") REFERENCES "public"."payment_sessions"("id") ON DELETE cascade ON UPDATE no action;
  CREATE UNIQUE INDEX "payments_provider_ref_idx" ON "payments" USING btree ("provider_ref");
  CREATE INDEX "payload_locked_documents_rels_payment_sessions_id_idx" ON "payload_locked_documents_rels" USING btree ("payment_sessions_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "payment_sessions" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "payment_sessions" CASCADE;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_payment_sessions_fk";
  
  ALTER TABLE "payments" ALTER COLUMN "method" SET DATA TYPE text;
  ALTER TABLE "payments" ALTER COLUMN "method" SET DEFAULT 'bank-transfer'::text;
  DROP TYPE "public"."enum_payments_method";
  CREATE TYPE "public"."enum_payments_method" AS ENUM('bank-transfer', 'cash', 'card', 'other');
  ALTER TABLE "payments" ALTER COLUMN "method" SET DEFAULT 'bank-transfer'::"public"."enum_payments_method";
  ALTER TABLE "payments" ALTER COLUMN "method" SET DATA TYPE "public"."enum_payments_method" USING "method"::"public"."enum_payments_method";
  ALTER TABLE "notifications" ALTER COLUMN "event" SET DATA TYPE text;
  DROP TYPE "public"."enum_notifications_event";
  CREATE TYPE "public"."enum_notifications_event" AS ENUM('quoted', 'accepted', 'confirmed', 'declined', 'lapsed', 'reassigned', 'adjusted', 'paid', 'scheduled', 'delivered', 'completed', 'on-hold', 'cancelled', 'expired', 'delivery-overdue', 'brief-accepted', 'brief-new');
  ALTER TABLE "notifications" ALTER COLUMN "event" SET DATA TYPE "public"."enum_notifications_event" USING "event"::"public"."enum_notifications_event";
  ALTER TABLE "site_settings_quick_match_templates" ALTER COLUMN "event" SET DATA TYPE text;
  DROP TYPE "public"."enum_site_settings_quick_match_templates_event";
  CREATE TYPE "public"."enum_site_settings_quick_match_templates_event" AS ENUM('quoted', 'accepted', 'confirmed', 'declined', 'lapsed', 'reassigned', 'adjusted', 'paid', 'scheduled', 'delivered', 'completed', 'on-hold', 'cancelled', 'expired', 'delivery-overdue', 'brief-accepted', 'brief-new');
  ALTER TABLE "site_settings_quick_match_templates" ALTER COLUMN "event" SET DATA TYPE "public"."enum_site_settings_quick_match_templates_event" USING "event"::"public"."enum_site_settings_quick_match_templates_event";
  DROP INDEX "payments_provider_ref_idx";
  DROP INDEX "payload_locked_documents_rels_payment_sessions_id_idx";
  ALTER TABLE "payments" DROP COLUMN "source";
  ALTER TABLE "payments" DROP COLUMN "provider_ref";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "payment_sessions_id";
  DROP TYPE "public"."enum_payments_source";
  DROP TYPE "public"."enum_payment_sessions_provider";
  DROP TYPE "public"."enum_payment_sessions_status";`)
}
