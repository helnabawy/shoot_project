import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_briefs_offers_mode" AS ENUM('fixed', 'offers');
  CREATE TYPE "public"."enum_briefs_place_source" AS ENUM('search', 'drag', 'device', 'fallback');
  CREATE TYPE "public"."enum_brief_answers_client_decision" AS ENUM('declined');
  ALTER TYPE "public"."enum_quotations_lines_kind" ADD VALUE 'offer';
  ALTER TYPE "public"."enum_quotations_lines_kind" ADD VALUE 'fee';
  ALTER TYPE "public"."enum_notifications_event" ADD VALUE 'offer-new';
  ALTER TYPE "public"."enum_notifications_event" ADD VALUE 'offer-declined';
  ALTER TYPE "public"."enum_notifications_event" ADD VALUE 'offer-lost';
  ALTER TYPE "public"."enum_site_settings_quick_match_templates_event" ADD VALUE 'offer-new';
  ALTER TYPE "public"."enum_site_settings_quick_match_templates_event" ADD VALUE 'offer-declined';
  ALTER TYPE "public"."enum_site_settings_quick_match_templates_event" ADD VALUE 'offer-lost';
  CREATE TABLE "briefs_budgets" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"persona_id" integer NOT NULL,
  	"suggested_fils" numeric,
  	"amount_fils" numeric NOT NULL
  );
  
  ALTER TABLE "locations" ADD COLUMN "google_name" varchar;
  ALTER TABLE "creator_profiles" ADD COLUMN "base_lat" numeric;
  ALTER TABLE "creator_profiles" ADD COLUMN "base_lng" numeric;
  ALTER TABLE "creator_profiles_locales" ADD COLUMN "base_area" varchar;
  ALTER TABLE "_creator_profiles_v" ADD COLUMN "version_base_lat" numeric;
  ALTER TABLE "_creator_profiles_v" ADD COLUMN "version_base_lng" numeric;
  ALTER TABLE "_creator_profiles_v_locales" ADD COLUMN "version_base_area" varchar;
  ALTER TABLE "briefs" ADD COLUMN "offers_mode" "enum_briefs_offers_mode" DEFAULT 'fixed';
  ALTER TABLE "briefs" ADD COLUMN "offers_fee_percent" numeric;
  ALTER TABLE "briefs" ADD COLUMN "offers_min_percent" numeric;
  ALTER TABLE "briefs" ADD COLUMN "offers_max_percent" numeric;
  ALTER TABLE "briefs" ADD COLUMN "offers_sent_to" numeric;
  ALTER TABLE "briefs" ADD COLUMN "place_lat" numeric;
  ALTER TABLE "briefs" ADD COLUMN "place_lng" numeric;
  ALTER TABLE "briefs" ADD COLUMN "place_public_lat" numeric;
  ALTER TABLE "briefs" ADD COLUMN "place_public_lng" numeric;
  ALTER TABLE "briefs" ADD COLUMN "place_address" varchar;
  ALTER TABLE "briefs" ADD COLUMN "place_area" varchar;
  ALTER TABLE "briefs" ADD COLUMN "place_emirate_id" integer;
  ALTER TABLE "briefs" ADD COLUMN "place_place_id" varchar;
  ALTER TABLE "briefs" ADD COLUMN "place_source" "enum_briefs_place_source";
  ALTER TABLE "brief_answers" ADD COLUMN "amount_fils" numeric;
  ALTER TABLE "brief_answers" ADD COLUMN "revisions" numeric DEFAULT 0;
  ALTER TABLE "brief_answers" ADD COLUMN "client_decision" "enum_brief_answers_client_decision";
  ALTER TABLE "brief_answers" ADD COLUMN "client_decided_at" timestamp(3) with time zone;
  ALTER TABLE "site_settings" ADD COLUMN "quick_match_offers_enabled" boolean DEFAULT false;
  ALTER TABLE "site_settings" ADD COLUMN "quick_match_offers_fee_percent" numeric DEFAULT 10;
  ALTER TABLE "site_settings" ADD COLUMN "quick_match_offers_min_percent" numeric DEFAULT 70;
  ALTER TABLE "site_settings" ADD COLUMN "quick_match_offers_max_percent" numeric DEFAULT 200;
  ALTER TABLE "briefs_budgets" ADD CONSTRAINT "briefs_budgets_persona_id_personas_id_fk" FOREIGN KEY ("persona_id") REFERENCES "public"."personas"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "briefs_budgets" ADD CONSTRAINT "briefs_budgets_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."briefs"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "briefs_budgets_order_idx" ON "briefs_budgets" USING btree ("_order");
  CREATE INDEX "briefs_budgets_parent_id_idx" ON "briefs_budgets" USING btree ("_parent_id");
  CREATE INDEX "briefs_budgets_persona_idx" ON "briefs_budgets" USING btree ("persona_id");
  ALTER TABLE "briefs" ADD CONSTRAINT "briefs_place_emirate_id_locations_id_fk" FOREIGN KEY ("place_emirate_id") REFERENCES "public"."locations"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "briefs_place_place_emirate_idx" ON "briefs" USING btree ("place_emirate_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "briefs_budgets" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "briefs_budgets" CASCADE;
  ALTER TABLE "briefs" DROP CONSTRAINT "briefs_place_emirate_id_locations_id_fk";
  
  ALTER TABLE "quotations_lines" ALTER COLUMN "kind" SET DATA TYPE text;
  DROP TYPE "public"."enum_quotations_lines_kind";
  CREATE TYPE "public"."enum_quotations_lines_kind" AS ENUM('tier', 'travel', 'addon', 'discount', 'adjustment');
  ALTER TABLE "quotations_lines" ALTER COLUMN "kind" SET DATA TYPE "public"."enum_quotations_lines_kind" USING "kind"::"public"."enum_quotations_lines_kind";
  ALTER TABLE "notifications" ALTER COLUMN "event" SET DATA TYPE text;
  DROP TYPE "public"."enum_notifications_event";
  CREATE TYPE "public"."enum_notifications_event" AS ENUM('quoted', 'accepted', 'confirmed', 'declined', 'lapsed', 'reassigned', 'adjusted', 'paid', 'scheduled', 'delivered', 'completed', 'on-hold', 'cancelled', 'expired', 'delivery-overdue', 'brief-accepted', 'brief-new', 'payment-attention');
  ALTER TABLE "notifications" ALTER COLUMN "event" SET DATA TYPE "public"."enum_notifications_event" USING "event"::"public"."enum_notifications_event";
  ALTER TABLE "site_settings_quick_match_templates" ALTER COLUMN "event" SET DATA TYPE text;
  DROP TYPE "public"."enum_site_settings_quick_match_templates_event";
  CREATE TYPE "public"."enum_site_settings_quick_match_templates_event" AS ENUM('quoted', 'accepted', 'confirmed', 'declined', 'lapsed', 'reassigned', 'adjusted', 'paid', 'scheduled', 'delivered', 'completed', 'on-hold', 'cancelled', 'expired', 'delivery-overdue', 'brief-accepted', 'brief-new', 'payment-attention');
  ALTER TABLE "site_settings_quick_match_templates" ALTER COLUMN "event" SET DATA TYPE "public"."enum_site_settings_quick_match_templates_event" USING "event"::"public"."enum_site_settings_quick_match_templates_event";
  DROP INDEX "briefs_place_place_emirate_idx";
  ALTER TABLE "locations" DROP COLUMN "google_name";
  ALTER TABLE "creator_profiles" DROP COLUMN "base_lat";
  ALTER TABLE "creator_profiles" DROP COLUMN "base_lng";
  ALTER TABLE "creator_profiles_locales" DROP COLUMN "base_area";
  ALTER TABLE "_creator_profiles_v" DROP COLUMN "version_base_lat";
  ALTER TABLE "_creator_profiles_v" DROP COLUMN "version_base_lng";
  ALTER TABLE "_creator_profiles_v_locales" DROP COLUMN "version_base_area";
  ALTER TABLE "briefs" DROP COLUMN "offers_mode";
  ALTER TABLE "briefs" DROP COLUMN "offers_fee_percent";
  ALTER TABLE "briefs" DROP COLUMN "offers_min_percent";
  ALTER TABLE "briefs" DROP COLUMN "offers_max_percent";
  ALTER TABLE "briefs" DROP COLUMN "offers_sent_to";
  ALTER TABLE "briefs" DROP COLUMN "place_lat";
  ALTER TABLE "briefs" DROP COLUMN "place_lng";
  ALTER TABLE "briefs" DROP COLUMN "place_public_lat";
  ALTER TABLE "briefs" DROP COLUMN "place_public_lng";
  ALTER TABLE "briefs" DROP COLUMN "place_address";
  ALTER TABLE "briefs" DROP COLUMN "place_area";
  ALTER TABLE "briefs" DROP COLUMN "place_emirate_id";
  ALTER TABLE "briefs" DROP COLUMN "place_place_id";
  ALTER TABLE "briefs" DROP COLUMN "place_source";
  ALTER TABLE "brief_answers" DROP COLUMN "amount_fils";
  ALTER TABLE "brief_answers" DROP COLUMN "revisions";
  ALTER TABLE "brief_answers" DROP COLUMN "client_decision";
  ALTER TABLE "brief_answers" DROP COLUMN "client_decided_at";
  ALTER TABLE "site_settings" DROP COLUMN "quick_match_offers_enabled";
  ALTER TABLE "site_settings" DROP COLUMN "quick_match_offers_fee_percent";
  ALTER TABLE "site_settings" DROP COLUMN "quick_match_offers_min_percent";
  ALTER TABLE "site_settings" DROP COLUMN "quick_match_offers_max_percent";
  DROP TYPE "public"."enum_briefs_offers_mode";
  DROP TYPE "public"."enum_briefs_place_source";
  DROP TYPE "public"."enum_brief_answers_client_decision";`)
}
