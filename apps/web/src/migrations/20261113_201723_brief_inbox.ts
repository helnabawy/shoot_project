import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_brief_answers_decision" AS ENUM('accepted', 'rejected');
  CREATE TYPE "public"."enum_push_devices_platform" AS ENUM('ios', 'android');
  CREATE TYPE "public"."enum_push_devices_locale" AS ENUM('en', 'ar');
  ALTER TYPE "public"."enum_notifications_event" ADD VALUE 'brief-accepted';
  ALTER TYPE "public"."enum_notifications_event" ADD VALUE 'brief-new';
  ALTER TYPE "public"."enum_notifications_channel" ADD VALUE 'push';
  ALTER TYPE "public"."enum_site_settings_quick_match_templates_event" ADD VALUE 'brief-accepted';
  ALTER TYPE "public"."enum_site_settings_quick_match_templates_event" ADD VALUE 'brief-new';
  CREATE TABLE "brief_answers" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"brief_id" integer NOT NULL,
  	"creator_id" integer NOT NULL,
  	"persona_id" integer NOT NULL,
  	"decision" "enum_brief_answers_decision" NOT NULL,
  	"reason" varchar,
  	"note" varchar,
  	"answered_at" timestamp(3) with time zone NOT NULL,
  	"withdrawn_at" timestamp(3) with time zone,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "push_devices" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"user_id" integer NOT NULL,
  	"token" varchar NOT NULL,
  	"platform" "enum_push_devices_platform" NOT NULL,
  	"locale" "enum_push_devices_locale" DEFAULT 'en' NOT NULL,
  	"last_seen_at" timestamp(3) with time zone,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "notifications" ALTER COLUMN "booking_id" DROP NOT NULL;
  ALTER TABLE "users" ADD COLUMN "push_enabled" boolean DEFAULT true;
  ALTER TABLE "notifications" ADD COLUMN "brief_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "brief_answers_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "push_devices_id" integer;
  ALTER TABLE "site_settings" ADD COLUMN "quick_match_inbox_days" numeric DEFAULT 30;
  ALTER TABLE "brief_answers" ADD CONSTRAINT "brief_answers_brief_id_briefs_id_fk" FOREIGN KEY ("brief_id") REFERENCES "public"."briefs"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "brief_answers" ADD CONSTRAINT "brief_answers_creator_id_creator_profiles_id_fk" FOREIGN KEY ("creator_id") REFERENCES "public"."creator_profiles"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "brief_answers" ADD CONSTRAINT "brief_answers_persona_id_personas_id_fk" FOREIGN KEY ("persona_id") REFERENCES "public"."personas"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "push_devices" ADD CONSTRAINT "push_devices_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "brief_answers_brief_idx" ON "brief_answers" USING btree ("brief_id");
  CREATE INDEX "brief_answers_creator_idx" ON "brief_answers" USING btree ("creator_id");
  CREATE INDEX "brief_answers_persona_idx" ON "brief_answers" USING btree ("persona_id");
  CREATE INDEX "brief_answers_updated_at_idx" ON "brief_answers" USING btree ("updated_at");
  CREATE INDEX "brief_answers_created_at_idx" ON "brief_answers" USING btree ("created_at");
  CREATE UNIQUE INDEX "brief_creator_persona_idx" ON "brief_answers" USING btree ("brief_id","creator_id","persona_id");
  CREATE INDEX "push_devices_user_idx" ON "push_devices" USING btree ("user_id");
  CREATE UNIQUE INDEX "push_devices_token_idx" ON "push_devices" USING btree ("token");
  CREATE INDEX "push_devices_updated_at_idx" ON "push_devices" USING btree ("updated_at");
  CREATE INDEX "push_devices_created_at_idx" ON "push_devices" USING btree ("created_at");
  ALTER TABLE "notifications" ADD CONSTRAINT "notifications_brief_id_briefs_id_fk" FOREIGN KEY ("brief_id") REFERENCES "public"."briefs"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_brief_answers_fk" FOREIGN KEY ("brief_answers_id") REFERENCES "public"."brief_answers"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_push_devices_fk" FOREIGN KEY ("push_devices_id") REFERENCES "public"."push_devices"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "notifications_brief_idx" ON "notifications" USING btree ("brief_id");
  CREATE INDEX "payload_locked_documents_rels_brief_answers_id_idx" ON "payload_locked_documents_rels" USING btree ("brief_answers_id");
  CREATE INDEX "payload_locked_documents_rels_push_devices_id_idx" ON "payload_locked_documents_rels" USING btree ("push_devices_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "brief_answers" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "push_devices" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "brief_answers" CASCADE;
  DROP TABLE "push_devices" CASCADE;
  ALTER TABLE "notifications" DROP CONSTRAINT "notifications_brief_id_briefs_id_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_brief_answers_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_push_devices_fk";
  
  ALTER TABLE "notifications" ALTER COLUMN "event" SET DATA TYPE text;
  DROP TYPE "public"."enum_notifications_event";
  CREATE TYPE "public"."enum_notifications_event" AS ENUM('quoted', 'accepted', 'confirmed', 'declined', 'lapsed', 'reassigned', 'adjusted', 'paid', 'scheduled', 'delivered', 'completed', 'on-hold', 'cancelled', 'expired', 'delivery-overdue');
  ALTER TABLE "notifications" ALTER COLUMN "event" SET DATA TYPE "public"."enum_notifications_event" USING "event"::"public"."enum_notifications_event";
  ALTER TABLE "notifications" ALTER COLUMN "channel" SET DATA TYPE text;
  DROP TYPE "public"."enum_notifications_channel";
  CREATE TYPE "public"."enum_notifications_channel" AS ENUM('whatsapp', 'email', 'in-app');
  ALTER TABLE "notifications" ALTER COLUMN "channel" SET DATA TYPE "public"."enum_notifications_channel" USING "channel"::"public"."enum_notifications_channel";
  ALTER TABLE "site_settings_quick_match_templates" ALTER COLUMN "event" SET DATA TYPE text;
  DROP TYPE "public"."enum_site_settings_quick_match_templates_event";
  CREATE TYPE "public"."enum_site_settings_quick_match_templates_event" AS ENUM('quoted', 'accepted', 'confirmed', 'declined', 'lapsed', 'reassigned', 'adjusted', 'paid', 'scheduled', 'delivered', 'completed', 'on-hold', 'cancelled', 'expired', 'delivery-overdue');
  ALTER TABLE "site_settings_quick_match_templates" ALTER COLUMN "event" SET DATA TYPE "public"."enum_site_settings_quick_match_templates_event" USING "event"::"public"."enum_site_settings_quick_match_templates_event";
  DROP INDEX "notifications_brief_idx";
  DROP INDEX "payload_locked_documents_rels_brief_answers_id_idx";
  DROP INDEX "payload_locked_documents_rels_push_devices_id_idx";
  ALTER TABLE "notifications" ALTER COLUMN "booking_id" SET NOT NULL;
  ALTER TABLE "users" DROP COLUMN "push_enabled";
  ALTER TABLE "notifications" DROP COLUMN "brief_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "brief_answers_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "push_devices_id";
  ALTER TABLE "site_settings" DROP COLUMN "quick_match_inbox_days";
  DROP TYPE "public"."enum_brief_answers_decision";
  DROP TYPE "public"."enum_push_devices_platform";
  DROP TYPE "public"."enum_push_devices_locale";`)
}
