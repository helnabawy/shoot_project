import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_bookings_assignments_status" AS ENUM('open', 'pending', 'confirmed', 'declined', 'lapsed');
  CREATE TYPE "public"."enum_bookings_state" AS ENUM('quoted', 'accepted', 'confirmed', 'paid', 'scheduled', 'delivered', 'completed', 'cancelled', 'expired', 'on-hold');
  CREATE TYPE "public"."enum_bookings_client_locale" AS ENUM('en', 'ar');
  CREATE TYPE "public"."enum_quotations_lines_kind" AS ENUM('tier', 'travel', 'addon', 'discount', 'adjustment');
  CREATE TYPE "public"."enum_payments_kind" AS ENUM('received', 'payout', 'refund');
  CREATE TYPE "public"."enum_payments_method" AS ENUM('bank-transfer', 'cash', 'card', 'other');
  CREATE TYPE "public"."enum_availability_blocks_kind" AS ENUM('blocked', 'booking');
  CREATE TYPE "public"."enum_booking_events_from" AS ENUM('quoted', 'accepted', 'confirmed', 'paid', 'scheduled', 'delivered', 'completed', 'cancelled', 'expired', 'on-hold', 'assignment');
  CREATE TYPE "public"."enum_booking_events_to" AS ENUM('quoted', 'accepted', 'confirmed', 'paid', 'scheduled', 'delivered', 'completed', 'cancelled', 'expired', 'on-hold', 'assignment');
  CREATE TYPE "public"."enum_booking_events_actor_role" AS ENUM('client', 'creator', 'admin', 'system');
  CREATE TYPE "public"."enum_notifications_event" AS ENUM('quoted', 'accepted', 'confirmed', 'declined', 'lapsed', 'reassigned', 'adjusted', 'paid', 'scheduled', 'delivered', 'completed', 'on-hold', 'cancelled', 'expired', 'delivery-overdue');
  CREATE TYPE "public"."enum_notifications_audience" AS ENUM('client', 'creator', 'admin');
  CREATE TYPE "public"."enum_notifications_channel" AS ENUM('whatsapp', 'email', 'in-app');
  CREATE TYPE "public"."enum_notifications_locale" AS ENUM('en', 'ar');
  CREATE TYPE "public"."enum_promo_codes_kind" AS ENUM('percent', 'fixed');
  CREATE TYPE "public"."enum_site_settings_quick_match_channels_client" AS ENUM('whatsapp', 'email', 'in-app');
  CREATE TYPE "public"."enum_site_settings_quick_match_channels_creator" AS ENUM('whatsapp', 'email', 'in-app');
  CREATE TYPE "public"."enum_site_settings_quick_match_channels_admin" AS ENUM('whatsapp', 'email', 'in-app');
  CREATE TYPE "public"."enum_site_settings_quick_match_templates_event" AS ENUM('quoted', 'accepted', 'confirmed', 'declined', 'lapsed', 'reassigned', 'adjusted', 'paid', 'scheduled', 'delivered', 'completed', 'on-hold', 'cancelled', 'expired', 'delivery-overdue');
  CREATE TYPE "public"."enum_site_settings_quick_match_templates_audience" AS ENUM('client', 'creator', 'admin');
  CREATE TABLE "creator_listings_texts" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"text" varchar
  );
  
  CREATE TABLE "bookings_assignments" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"persona_id" integer NOT NULL,
  	"creator_id" integer,
  	"status" "enum_bookings_assignments_status" DEFAULT 'open',
  	"respond_by" timestamp(3) with time zone,
  	"responded_at" timestamp(3) with time zone,
  	"decline_reason" varchar
  );
  
  CREATE TABLE "bookings" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"reference" varchar NOT NULL,
  	"state" "enum_bookings_state" DEFAULT 'quoted' NOT NULL,
  	"revision" numeric DEFAULT 0,
  	"brief_id" integer NOT NULL,
  	"quotation_id" integer,
  	"member_id" integer,
  	"access_salt" varchar,
  	"client_name" varchar,
  	"client_whatsapp" varchar,
  	"client_locale" "enum_bookings_client_locale" DEFAULT 'en',
  	"date" varchar,
  	"location" varchar,
  	"total_fils" numeric,
  	"hold_reason" varchar,
  	"admin_note" varchar,
  	"quote_valid_until" timestamp(3) with time zone,
  	"accepted_at" timestamp(3) with time zone,
  	"confirmed_at" timestamp(3) with time zone,
  	"paid_at" timestamp(3) with time zone,
  	"scheduled_at" timestamp(3) with time zone,
  	"delivered_at" timestamp(3) with time zone,
  	"completed_at" timestamp(3) with time zone,
  	"payout_due_at" timestamp(3) with time zone,
  	"on_hold_at" timestamp(3) with time zone,
  	"cancelled_at" timestamp(3) with time zone,
  	"expired_at" timestamp(3) with time zone,
  	"overdue_notified_at" timestamp(3) with time zone,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "bookings_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"personas_id" integer
  );
  
  CREATE TABLE "quotations_lines" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"kind" "enum_quotations_lines_kind" NOT NULL,
  	"label_en" varchar NOT NULL,
  	"label_ar" varchar NOT NULL,
  	"amount_fils" numeric NOT NULL,
  	"persona_id" integer,
  	"deliverables" jsonb
  );
  
  CREATE TABLE "quotations" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"reference" varchar NOT NULL,
  	"booking_id" integer NOT NULL,
  	"brief_id" integer NOT NULL,
  	"version" numeric DEFAULT 1 NOT NULL,
  	"superseded_by_id" integer,
  	"subtotal_fils" numeric NOT NULL,
  	"discount_fils" numeric DEFAULT 0,
  	"total_fils" numeric NOT NULL,
  	"promo_code" varchar,
  	"valid_until" timestamp(3) with time zone NOT NULL,
  	"issued_at" timestamp(3) with time zone NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payments" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"booking_id" integer NOT NULL,
  	"kind" "enum_payments_kind" DEFAULT 'received' NOT NULL,
  	"amount" numeric NOT NULL,
  	"method" "enum_payments_method" DEFAULT 'bank-transfer' NOT NULL,
  	"note" varchar,
  	"recorded_by_id" integer,
  	"recorded_at" timestamp(3) with time zone,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "availability_blocks" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"creator_id" integer NOT NULL,
  	"user_id" integer NOT NULL,
  	"date" varchar NOT NULL,
  	"kind" "enum_availability_blocks_kind" DEFAULT 'blocked' NOT NULL,
  	"booking_id" integer,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "booking_events" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"booking_id" integer NOT NULL,
  	"event" varchar NOT NULL,
  	"from" "enum_booking_events_from",
  	"to" "enum_booking_events_to",
  	"actor_role" "enum_booking_events_actor_role" NOT NULL,
  	"actor_id" integer,
  	"note" varchar,
  	"at" timestamp(3) with time zone NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "notifications" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"booking_id" integer NOT NULL,
  	"event" "enum_notifications_event" NOT NULL,
  	"audience" "enum_notifications_audience" NOT NULL,
  	"channel" "enum_notifications_channel" NOT NULL,
  	"locale" "enum_notifications_locale" DEFAULT 'en',
  	"user_id" integer,
  	"text" varchar NOT NULL,
  	"link" varchar,
  	"dedupe_key" varchar NOT NULL,
  	"read_at" timestamp(3) with time zone,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "service_tiers_deliverables" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "service_tiers_deliverables_locales" (
  	"text" varchar NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "service_tiers" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"persona_id" integer NOT NULL,
  	"duration" varchar NOT NULL,
  	"price" numeric NOT NULL,
  	"active" boolean DEFAULT true,
  	"order" numeric DEFAULT 100,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "service_tiers_locales" (
  	"title" varchar NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "travel_fees" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"location" varchar NOT NULL,
  	"fee" numeric NOT NULL,
  	"active" boolean DEFAULT true,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "add_ons" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"price" numeric NOT NULL,
  	"active" boolean DEFAULT true,
  	"order" numeric DEFAULT 100,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "add_ons_locales" (
  	"title" varchar NOT NULL,
  	"description" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "add_ons_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"personas_id" integer
  );
  
  CREATE TABLE "promo_codes" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"code" varchar NOT NULL,
  	"kind" "enum_promo_codes_kind" DEFAULT 'percent' NOT NULL,
  	"value" numeric NOT NULL,
  	"starts_at" timestamp(3) with time zone,
  	"ends_at" timestamp(3) with time zone,
  	"usage_limit" numeric,
  	"used_count" numeric DEFAULT 0,
  	"active" boolean DEFAULT true,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "site_settings_quick_match_channels_client" (
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"value" "enum_site_settings_quick_match_channels_client",
  	"id" serial PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "site_settings_quick_match_channels_creator" (
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"value" "enum_site_settings_quick_match_channels_creator",
  	"id" serial PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "site_settings_quick_match_channels_admin" (
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"value" "enum_site_settings_quick_match_channels_admin",
  	"id" serial PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "site_settings_quick_match_templates" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"event" "enum_site_settings_quick_match_templates_event" NOT NULL,
  	"audience" "enum_site_settings_quick_match_templates_audience" NOT NULL
  );
  
  CREATE TABLE "site_settings_quick_match_templates_locales" (
  	"text" varchar NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  ALTER TABLE "option_sets_options" ADD COLUMN "matches_any" boolean DEFAULT false;
  ALTER TABLE "option_sets_options" ADD COLUMN "category_id" integer;
  ALTER TABLE "briefs" ADD COLUMN "access_salt" varchar;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "bookings_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "quotations_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "payments_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "availability_blocks_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "booking_events_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "notifications_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "service_tiers_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "travel_fees_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "add_ons_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "promo_codes_id" integer;
  ALTER TABLE "landing_page_brief_builder_slots" ADD COLUMN "filters_creators" boolean DEFAULT false;
  ALTER TABLE "_landing_page_v_version_brief_builder_slots" ADD COLUMN "filters_creators" boolean DEFAULT false;
  ALTER TABLE "site_settings" ADD COLUMN "quick_match_enabled" boolean DEFAULT false;
  ALTER TABLE "site_settings" ADD COLUMN "quick_match_quotation_valid_days" numeric DEFAULT 7;
  ALTER TABLE "site_settings" ADD COLUMN "quick_match_confirm_hours" numeric DEFAULT 24;
  ALTER TABLE "site_settings" ADD COLUMN "quick_match_delivery_confirm_days" numeric DEFAULT 7;
  ALTER TABLE "site_settings" ADD COLUMN "quick_match_payout_days" numeric DEFAULT 10;
  ALTER TABLE "site_settings" ADD COLUMN "quick_match_quote_limit_per_hour" numeric DEFAULT 5;
  ALTER TABLE "site_settings_locales" ADD COLUMN "quick_match_payment_instructions" jsonb;
  ALTER TABLE "site_settings_locales" ADD COLUMN "quick_match_quotation_terms" jsonb;
  ALTER TABLE "creator_listings_texts" ADD CONSTRAINT "creator_listings_texts_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."creator_listings"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "bookings_assignments" ADD CONSTRAINT "bookings_assignments_persona_id_personas_id_fk" FOREIGN KEY ("persona_id") REFERENCES "public"."personas"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "bookings_assignments" ADD CONSTRAINT "bookings_assignments_creator_id_creator_profiles_id_fk" FOREIGN KEY ("creator_id") REFERENCES "public"."creator_profiles"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "bookings_assignments" ADD CONSTRAINT "bookings_assignments_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."bookings"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "bookings" ADD CONSTRAINT "bookings_brief_id_briefs_id_fk" FOREIGN KEY ("brief_id") REFERENCES "public"."briefs"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "bookings" ADD CONSTRAINT "bookings_quotation_id_quotations_id_fk" FOREIGN KEY ("quotation_id") REFERENCES "public"."quotations"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "bookings" ADD CONSTRAINT "bookings_member_id_users_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "bookings_rels" ADD CONSTRAINT "bookings_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."bookings"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "bookings_rels" ADD CONSTRAINT "bookings_rels_personas_fk" FOREIGN KEY ("personas_id") REFERENCES "public"."personas"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "quotations_lines" ADD CONSTRAINT "quotations_lines_persona_id_personas_id_fk" FOREIGN KEY ("persona_id") REFERENCES "public"."personas"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "quotations_lines" ADD CONSTRAINT "quotations_lines_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."quotations"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "quotations" ADD CONSTRAINT "quotations_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "quotations" ADD CONSTRAINT "quotations_brief_id_briefs_id_fk" FOREIGN KEY ("brief_id") REFERENCES "public"."briefs"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "quotations" ADD CONSTRAINT "quotations_superseded_by_id_quotations_id_fk" FOREIGN KEY ("superseded_by_id") REFERENCES "public"."quotations"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payments" ADD CONSTRAINT "payments_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payments" ADD CONSTRAINT "payments_recorded_by_id_users_id_fk" FOREIGN KEY ("recorded_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "availability_blocks" ADD CONSTRAINT "availability_blocks_creator_id_creator_profiles_id_fk" FOREIGN KEY ("creator_id") REFERENCES "public"."creator_profiles"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "availability_blocks" ADD CONSTRAINT "availability_blocks_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "availability_blocks" ADD CONSTRAINT "availability_blocks_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "booking_events" ADD CONSTRAINT "booking_events_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "booking_events" ADD CONSTRAINT "booking_events_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "notifications" ADD CONSTRAINT "notifications_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "service_tiers_deliverables" ADD CONSTRAINT "service_tiers_deliverables_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."service_tiers"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "service_tiers_deliverables_locales" ADD CONSTRAINT "service_tiers_deliverables_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."service_tiers_deliverables"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "service_tiers" ADD CONSTRAINT "service_tiers_persona_id_personas_id_fk" FOREIGN KEY ("persona_id") REFERENCES "public"."personas"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "service_tiers_locales" ADD CONSTRAINT "service_tiers_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."service_tiers"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "add_ons_locales" ADD CONSTRAINT "add_ons_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."add_ons"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "add_ons_rels" ADD CONSTRAINT "add_ons_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."add_ons"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "add_ons_rels" ADD CONSTRAINT "add_ons_rels_personas_fk" FOREIGN KEY ("personas_id") REFERENCES "public"."personas"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "site_settings_quick_match_channels_client" ADD CONSTRAINT "site_settings_quick_match_channels_client_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."site_settings"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "site_settings_quick_match_channels_creator" ADD CONSTRAINT "site_settings_quick_match_channels_creator_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."site_settings"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "site_settings_quick_match_channels_admin" ADD CONSTRAINT "site_settings_quick_match_channels_admin_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."site_settings"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "site_settings_quick_match_templates" ADD CONSTRAINT "site_settings_quick_match_templates_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."site_settings"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "site_settings_quick_match_templates_locales" ADD CONSTRAINT "site_settings_quick_match_templates_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."site_settings_quick_match_templates"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "creator_listings_texts_order_parent" ON "creator_listings_texts" USING btree ("order","parent_id");
  CREATE INDEX "bookings_assignments_order_idx" ON "bookings_assignments" USING btree ("_order");
  CREATE INDEX "bookings_assignments_parent_id_idx" ON "bookings_assignments" USING btree ("_parent_id");
  CREATE INDEX "bookings_assignments_persona_idx" ON "bookings_assignments" USING btree ("persona_id");
  CREATE INDEX "bookings_assignments_creator_idx" ON "bookings_assignments" USING btree ("creator_id");
  CREATE UNIQUE INDEX "bookings_reference_idx" ON "bookings" USING btree ("reference");
  CREATE INDEX "bookings_state_idx" ON "bookings" USING btree ("state");
  CREATE INDEX "bookings_brief_idx" ON "bookings" USING btree ("brief_id");
  CREATE INDEX "bookings_quotation_idx" ON "bookings" USING btree ("quotation_id");
  CREATE INDEX "bookings_member_idx" ON "bookings" USING btree ("member_id");
  CREATE INDEX "bookings_date_idx" ON "bookings" USING btree ("date");
  CREATE INDEX "bookings_updated_at_idx" ON "bookings" USING btree ("updated_at");
  CREATE INDEX "bookings_created_at_idx" ON "bookings" USING btree ("created_at");
  CREATE INDEX "bookings_rels_order_idx" ON "bookings_rels" USING btree ("order");
  CREATE INDEX "bookings_rels_parent_idx" ON "bookings_rels" USING btree ("parent_id");
  CREATE INDEX "bookings_rels_path_idx" ON "bookings_rels" USING btree ("path");
  CREATE INDEX "bookings_rels_personas_id_idx" ON "bookings_rels" USING btree ("personas_id");
  CREATE INDEX "quotations_lines_order_idx" ON "quotations_lines" USING btree ("_order");
  CREATE INDEX "quotations_lines_parent_id_idx" ON "quotations_lines" USING btree ("_parent_id");
  CREATE INDEX "quotations_lines_persona_idx" ON "quotations_lines" USING btree ("persona_id");
  CREATE UNIQUE INDEX "quotations_reference_idx" ON "quotations" USING btree ("reference");
  CREATE INDEX "quotations_booking_idx" ON "quotations" USING btree ("booking_id");
  CREATE INDEX "quotations_brief_idx" ON "quotations" USING btree ("brief_id");
  CREATE INDEX "quotations_superseded_by_idx" ON "quotations" USING btree ("superseded_by_id");
  CREATE INDEX "quotations_updated_at_idx" ON "quotations" USING btree ("updated_at");
  CREATE INDEX "quotations_created_at_idx" ON "quotations" USING btree ("created_at");
  CREATE INDEX "payments_booking_idx" ON "payments" USING btree ("booking_id");
  CREATE INDEX "payments_recorded_by_idx" ON "payments" USING btree ("recorded_by_id");
  CREATE INDEX "payments_updated_at_idx" ON "payments" USING btree ("updated_at");
  CREATE INDEX "payments_created_at_idx" ON "payments" USING btree ("created_at");
  CREATE INDEX "availability_blocks_creator_idx" ON "availability_blocks" USING btree ("creator_id");
  CREATE INDEX "availability_blocks_user_idx" ON "availability_blocks" USING btree ("user_id");
  CREATE INDEX "availability_blocks_date_idx" ON "availability_blocks" USING btree ("date");
  CREATE INDEX "availability_blocks_booking_idx" ON "availability_blocks" USING btree ("booking_id");
  CREATE INDEX "availability_blocks_updated_at_idx" ON "availability_blocks" USING btree ("updated_at");
  CREATE INDEX "availability_blocks_created_at_idx" ON "availability_blocks" USING btree ("created_at");
  CREATE UNIQUE INDEX "creator_date_idx" ON "availability_blocks" USING btree ("creator_id","date");
  CREATE INDEX "booking_events_booking_idx" ON "booking_events" USING btree ("booking_id");
  CREATE INDEX "booking_events_actor_idx" ON "booking_events" USING btree ("actor_id");
  CREATE INDEX "booking_events_at_idx" ON "booking_events" USING btree ("at");
  CREATE INDEX "booking_events_updated_at_idx" ON "booking_events" USING btree ("updated_at");
  CREATE INDEX "booking_events_created_at_idx" ON "booking_events" USING btree ("created_at");
  CREATE INDEX "notifications_booking_idx" ON "notifications" USING btree ("booking_id");
  CREATE INDEX "notifications_channel_idx" ON "notifications" USING btree ("channel");
  CREATE INDEX "notifications_user_idx" ON "notifications" USING btree ("user_id");
  CREATE UNIQUE INDEX "notifications_dedupe_key_idx" ON "notifications" USING btree ("dedupe_key");
  CREATE INDEX "notifications_updated_at_idx" ON "notifications" USING btree ("updated_at");
  CREATE INDEX "notifications_created_at_idx" ON "notifications" USING btree ("created_at");
  CREATE INDEX "service_tiers_deliverables_order_idx" ON "service_tiers_deliverables" USING btree ("_order");
  CREATE INDEX "service_tiers_deliverables_parent_id_idx" ON "service_tiers_deliverables" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "service_tiers_deliverables_locales_locale_parent_id_unique" ON "service_tiers_deliverables_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "service_tiers_deliverables_locales_parent_id_idx" ON "service_tiers_deliverables_locales" USING btree ("_parent_id");
  CREATE INDEX "service_tiers_persona_idx" ON "service_tiers" USING btree ("persona_id");
  CREATE INDEX "service_tiers_duration_idx" ON "service_tiers" USING btree ("duration");
  CREATE INDEX "service_tiers_active_idx" ON "service_tiers" USING btree ("active");
  CREATE INDEX "service_tiers_updated_at_idx" ON "service_tiers" USING btree ("updated_at");
  CREATE INDEX "service_tiers_created_at_idx" ON "service_tiers" USING btree ("created_at");
  CREATE UNIQUE INDEX "service_tiers_locales_locale_parent_id_unique" ON "service_tiers_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "service_tiers_locales_parent_id_idx" ON "service_tiers_locales" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "travel_fees_location_idx" ON "travel_fees" USING btree ("location");
  CREATE INDEX "travel_fees_updated_at_idx" ON "travel_fees" USING btree ("updated_at");
  CREATE INDEX "travel_fees_created_at_idx" ON "travel_fees" USING btree ("created_at");
  CREATE INDEX "add_ons_updated_at_idx" ON "add_ons" USING btree ("updated_at");
  CREATE INDEX "add_ons_created_at_idx" ON "add_ons" USING btree ("created_at");
  CREATE UNIQUE INDEX "add_ons_locales_locale_parent_id_unique" ON "add_ons_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "add_ons_locales_parent_id_idx" ON "add_ons_locales" USING btree ("_parent_id");
  CREATE INDEX "add_ons_rels_order_idx" ON "add_ons_rels" USING btree ("order");
  CREATE INDEX "add_ons_rels_parent_idx" ON "add_ons_rels" USING btree ("parent_id");
  CREATE INDEX "add_ons_rels_path_idx" ON "add_ons_rels" USING btree ("path");
  CREATE INDEX "add_ons_rels_personas_id_idx" ON "add_ons_rels" USING btree ("personas_id");
  CREATE UNIQUE INDEX "promo_codes_code_idx" ON "promo_codes" USING btree ("code");
  CREATE INDEX "promo_codes_updated_at_idx" ON "promo_codes" USING btree ("updated_at");
  CREATE INDEX "promo_codes_created_at_idx" ON "promo_codes" USING btree ("created_at");
  CREATE INDEX "site_settings_quick_match_channels_client_order_idx" ON "site_settings_quick_match_channels_client" USING btree ("order");
  CREATE INDEX "site_settings_quick_match_channels_client_parent_idx" ON "site_settings_quick_match_channels_client" USING btree ("parent_id");
  CREATE INDEX "site_settings_quick_match_channels_creator_order_idx" ON "site_settings_quick_match_channels_creator" USING btree ("order");
  CREATE INDEX "site_settings_quick_match_channels_creator_parent_idx" ON "site_settings_quick_match_channels_creator" USING btree ("parent_id");
  CREATE INDEX "site_settings_quick_match_channels_admin_order_idx" ON "site_settings_quick_match_channels_admin" USING btree ("order");
  CREATE INDEX "site_settings_quick_match_channels_admin_parent_idx" ON "site_settings_quick_match_channels_admin" USING btree ("parent_id");
  CREATE INDEX "site_settings_quick_match_templates_order_idx" ON "site_settings_quick_match_templates" USING btree ("_order");
  CREATE INDEX "site_settings_quick_match_templates_parent_id_idx" ON "site_settings_quick_match_templates" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "site_settings_quick_match_templates_locales_locale_parent_id" ON "site_settings_quick_match_templates_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "site_settings_quick_match_templates_locales_parent_id_idx" ON "site_settings_quick_match_templates_locales" USING btree ("_parent_id");
  ALTER TABLE "option_sets_options" ADD CONSTRAINT "option_sets_options_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_bookings_fk" FOREIGN KEY ("bookings_id") REFERENCES "public"."bookings"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_quotations_fk" FOREIGN KEY ("quotations_id") REFERENCES "public"."quotations"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_payments_fk" FOREIGN KEY ("payments_id") REFERENCES "public"."payments"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_availability_blocks_fk" FOREIGN KEY ("availability_blocks_id") REFERENCES "public"."availability_blocks"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_booking_events_fk" FOREIGN KEY ("booking_events_id") REFERENCES "public"."booking_events"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_notifications_fk" FOREIGN KEY ("notifications_id") REFERENCES "public"."notifications"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_service_tiers_fk" FOREIGN KEY ("service_tiers_id") REFERENCES "public"."service_tiers"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_travel_fees_fk" FOREIGN KEY ("travel_fees_id") REFERENCES "public"."travel_fees"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_add_ons_fk" FOREIGN KEY ("add_ons_id") REFERENCES "public"."add_ons"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_promo_codes_fk" FOREIGN KEY ("promo_codes_id") REFERENCES "public"."promo_codes"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "option_sets_options_category_idx" ON "option_sets_options" USING btree ("category_id");
  CREATE INDEX "payload_locked_documents_rels_bookings_id_idx" ON "payload_locked_documents_rels" USING btree ("bookings_id");
  CREATE INDEX "payload_locked_documents_rels_quotations_id_idx" ON "payload_locked_documents_rels" USING btree ("quotations_id");
  CREATE INDEX "payload_locked_documents_rels_payments_id_idx" ON "payload_locked_documents_rels" USING btree ("payments_id");
  CREATE INDEX "payload_locked_documents_rels_availability_blocks_id_idx" ON "payload_locked_documents_rels" USING btree ("availability_blocks_id");
  CREATE INDEX "payload_locked_documents_rels_booking_events_id_idx" ON "payload_locked_documents_rels" USING btree ("booking_events_id");
  CREATE INDEX "payload_locked_documents_rels_notifications_id_idx" ON "payload_locked_documents_rels" USING btree ("notifications_id");
  CREATE INDEX "payload_locked_documents_rels_service_tiers_id_idx" ON "payload_locked_documents_rels" USING btree ("service_tiers_id");
  CREATE INDEX "payload_locked_documents_rels_travel_fees_id_idx" ON "payload_locked_documents_rels" USING btree ("travel_fees_id");
  CREATE INDEX "payload_locked_documents_rels_add_ons_id_idx" ON "payload_locked_documents_rels" USING btree ("add_ons_id");
  CREATE INDEX "payload_locked_documents_rels_promo_codes_id_idx" ON "payload_locked_documents_rels" USING btree ("promo_codes_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "creator_listings_texts" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "bookings_assignments" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "bookings" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "bookings_rels" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "quotations_lines" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "quotations" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "payments" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "availability_blocks" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "booking_events" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "notifications" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "service_tiers_deliverables" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "service_tiers_deliverables_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "service_tiers" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "service_tiers_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "travel_fees" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "add_ons" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "add_ons_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "add_ons_rels" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "promo_codes" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "site_settings_quick_match_channels_client" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "site_settings_quick_match_channels_creator" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "site_settings_quick_match_channels_admin" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "site_settings_quick_match_templates" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "site_settings_quick_match_templates_locales" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "creator_listings_texts" CASCADE;
  DROP TABLE "bookings_assignments" CASCADE;
  DROP TABLE "bookings" CASCADE;
  DROP TABLE "bookings_rels" CASCADE;
  DROP TABLE "quotations_lines" CASCADE;
  DROP TABLE "quotations" CASCADE;
  DROP TABLE "payments" CASCADE;
  DROP TABLE "availability_blocks" CASCADE;
  DROP TABLE "booking_events" CASCADE;
  DROP TABLE "notifications" CASCADE;
  DROP TABLE "service_tiers_deliverables" CASCADE;
  DROP TABLE "service_tiers_deliverables_locales" CASCADE;
  DROP TABLE "service_tiers" CASCADE;
  DROP TABLE "service_tiers_locales" CASCADE;
  DROP TABLE "travel_fees" CASCADE;
  DROP TABLE "add_ons" CASCADE;
  DROP TABLE "add_ons_locales" CASCADE;
  DROP TABLE "add_ons_rels" CASCADE;
  DROP TABLE "promo_codes" CASCADE;
  DROP TABLE "site_settings_quick_match_channels_client" CASCADE;
  DROP TABLE "site_settings_quick_match_channels_creator" CASCADE;
  DROP TABLE "site_settings_quick_match_channels_admin" CASCADE;
  DROP TABLE "site_settings_quick_match_templates" CASCADE;
  DROP TABLE "site_settings_quick_match_templates_locales" CASCADE;
  ALTER TABLE "option_sets_options" DROP CONSTRAINT "option_sets_options_category_id_categories_id_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_bookings_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_quotations_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_payments_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_availability_blocks_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_booking_events_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_notifications_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_service_tiers_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_travel_fees_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_add_ons_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_promo_codes_fk";
  
  DROP INDEX "option_sets_options_category_idx";
  DROP INDEX "payload_locked_documents_rels_bookings_id_idx";
  DROP INDEX "payload_locked_documents_rels_quotations_id_idx";
  DROP INDEX "payload_locked_documents_rels_payments_id_idx";
  DROP INDEX "payload_locked_documents_rels_availability_blocks_id_idx";
  DROP INDEX "payload_locked_documents_rels_booking_events_id_idx";
  DROP INDEX "payload_locked_documents_rels_notifications_id_idx";
  DROP INDEX "payload_locked_documents_rels_service_tiers_id_idx";
  DROP INDEX "payload_locked_documents_rels_travel_fees_id_idx";
  DROP INDEX "payload_locked_documents_rels_add_ons_id_idx";
  DROP INDEX "payload_locked_documents_rels_promo_codes_id_idx";
  ALTER TABLE "option_sets_options" DROP COLUMN "matches_any";
  ALTER TABLE "option_sets_options" DROP COLUMN "category_id";
  ALTER TABLE "briefs" DROP COLUMN "access_salt";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "bookings_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "quotations_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "payments_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "availability_blocks_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "booking_events_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "notifications_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "service_tiers_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "travel_fees_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "add_ons_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "promo_codes_id";
  ALTER TABLE "landing_page_brief_builder_slots" DROP COLUMN "filters_creators";
  ALTER TABLE "_landing_page_v_version_brief_builder_slots" DROP COLUMN "filters_creators";
  ALTER TABLE "site_settings" DROP COLUMN "quick_match_enabled";
  ALTER TABLE "site_settings" DROP COLUMN "quick_match_quotation_valid_days";
  ALTER TABLE "site_settings" DROP COLUMN "quick_match_confirm_hours";
  ALTER TABLE "site_settings" DROP COLUMN "quick_match_delivery_confirm_days";
  ALTER TABLE "site_settings" DROP COLUMN "quick_match_payout_days";
  ALTER TABLE "site_settings" DROP COLUMN "quick_match_quote_limit_per_hour";
  ALTER TABLE "site_settings_locales" DROP COLUMN "quick_match_payment_instructions";
  ALTER TABLE "site_settings_locales" DROP COLUMN "quick_match_quotation_terms";
  DROP TYPE "public"."enum_bookings_assignments_status";
  DROP TYPE "public"."enum_bookings_state";
  DROP TYPE "public"."enum_bookings_client_locale";
  DROP TYPE "public"."enum_quotations_lines_kind";
  DROP TYPE "public"."enum_payments_kind";
  DROP TYPE "public"."enum_payments_method";
  DROP TYPE "public"."enum_availability_blocks_kind";
  DROP TYPE "public"."enum_booking_events_from";
  DROP TYPE "public"."enum_booking_events_to";
  DROP TYPE "public"."enum_booking_events_actor_role";
  DROP TYPE "public"."enum_notifications_event";
  DROP TYPE "public"."enum_notifications_audience";
  DROP TYPE "public"."enum_notifications_channel";
  DROP TYPE "public"."enum_notifications_locale";
  DROP TYPE "public"."enum_promo_codes_kind";
  DROP TYPE "public"."enum_site_settings_quick_match_channels_client";
  DROP TYPE "public"."enum_site_settings_quick_match_channels_creator";
  DROP TYPE "public"."enum_site_settings_quick_match_channels_admin";
  DROP TYPE "public"."enum_site_settings_quick_match_templates_event";
  DROP TYPE "public"."enum_site_settings_quick_match_templates_audience";`)
}
