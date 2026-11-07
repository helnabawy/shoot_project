import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."_locales" AS ENUM('en', 'ar');
  CREATE TYPE "public"."enum_users_roles" AS ENUM('admin', 'editor', 'member');
  CREATE TYPE "public"."enum_users_account_type" AS ENUM('seeker', 'provider');
  CREATE TYPE "public"."enum_briefs_status" AS ENUM('new', 'contacted', 'closed');
  CREATE TYPE "public"."enum_briefs_locale" AS ENUM('en', 'ar');
  CREATE TYPE "public"."enum_landing_page_brief_builder_slots_kind" AS ENUM('persona', 'options', 'date', 'number');
  CREATE TYPE "public"."enum_landing_page_blocks_how_it_works_cta_kind" AS ENUM('whatsapp', 'link', 'call');
  CREATE TYPE "public"."enum_landing_page_blocks_categories_grid_source" AS ENUM('active', 'manual');
  CREATE TYPE "public"."enum_landing_page_blocks_categories_grid_cta_kind" AS ENUM('whatsapp', 'link', 'call');
  CREATE TYPE "public"."enum_landing_page_blocks_persona_band_layout" AS ENUM('combined', 'perPersona');
  CREATE TYPE "public"."enum_landing_page_blocks_persona_band_cta_kind" AS ENUM('whatsapp', 'link', 'call');
  CREATE TYPE "public"."enum_landing_page_blocks_call_to_action_primary_kind" AS ENUM('whatsapp', 'link', 'call');
  CREATE TYPE "public"."enum_landing_page_blocks_call_to_action_secondary_kind" AS ENUM('whatsapp', 'link', 'call');
  CREATE TYPE "public"."enum_landing_page_hero_layout" AS ENUM('briefBuilder', 'ctas');
  CREATE TYPE "public"."enum_landing_page_hero_primary_cta_kind" AS ENUM('whatsapp', 'link', 'call');
  CREATE TYPE "public"."enum_landing_page_hero_secondary_cta_kind" AS ENUM('whatsapp', 'link', 'call');
  CREATE TYPE "public"."enum_landing_page_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__landing_page_v_version_brief_builder_slots_kind" AS ENUM('persona', 'options', 'date', 'number');
  CREATE TYPE "public"."enum__landing_page_v_blocks_how_it_works_cta_kind" AS ENUM('whatsapp', 'link', 'call');
  CREATE TYPE "public"."enum__landing_page_v_blocks_categories_grid_source" AS ENUM('active', 'manual');
  CREATE TYPE "public"."enum__landing_page_v_blocks_categories_grid_cta_kind" AS ENUM('whatsapp', 'link', 'call');
  CREATE TYPE "public"."enum__landing_page_v_blocks_persona_band_layout" AS ENUM('combined', 'perPersona');
  CREATE TYPE "public"."enum__landing_page_v_blocks_persona_band_cta_kind" AS ENUM('whatsapp', 'link', 'call');
  CREATE TYPE "public"."enum__landing_page_v_blocks_call_to_action_primary_kind" AS ENUM('whatsapp', 'link', 'call');
  CREATE TYPE "public"."enum__landing_page_v_blocks_call_to_action_secondary_kind" AS ENUM('whatsapp', 'link', 'call');
  CREATE TYPE "public"."enum__landing_page_v_version_hero_layout" AS ENUM('briefBuilder', 'ctas');
  CREATE TYPE "public"."enum__landing_page_v_version_hero_primary_cta_kind" AS ENUM('whatsapp', 'link', 'call');
  CREATE TYPE "public"."enum__landing_page_v_version_hero_secondary_cta_kind" AS ENUM('whatsapp', 'link', 'call');
  CREATE TYPE "public"."enum__landing_page_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__landing_page_v_published_locale" AS ENUM('en', 'ar');
  CREATE TYPE "public"."enum_site_settings_social_platform" AS ENUM('instagram', 'linkedin', 'youtube', 'tiktok', 'x');
  CREATE TABLE "users_roles" (
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"value" "enum_users_roles",
  	"id" serial PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "users_sessions" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"created_at" timestamp(3) with time zone,
  	"expires_at" timestamp(3) with time zone NOT NULL
  );
  
  CREATE TABLE "users" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"account_type" "enum_users_account_type" DEFAULT 'seeker' NOT NULL,
  	"persona_id" integer,
  	"phone" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"email" varchar NOT NULL,
  	"reset_password_token" varchar,
  	"reset_password_expiration" timestamp(3) with time zone,
  	"salt" varchar,
  	"hash" varchar,
  	"reset_password_requested_at" timestamp(3) with time zone,
  	"login_attempts" numeric DEFAULT 0,
  	"lock_until" timestamp(3) with time zone
  );
  
  CREATE TABLE "users_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"categories_id" integer
  );
  
  CREATE TABLE "personas" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"slug" varchar NOT NULL,
  	"glyph" varchar,
  	"icon_id" integer,
  	"order" numeric DEFAULT 100,
  	"active" boolean DEFAULT true,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "personas_locales" (
  	"singular" varchar NOT NULL,
  	"plural" varchar NOT NULL,
  	"description" varchar,
  	"copy_seeker_cta" varchar,
  	"copy_provider_cta" varchar,
  	"copy_provider_pitch" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "categories" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"slug" varchar NOT NULL,
  	"glyph" varchar,
  	"image_id" integer,
  	"order" numeric DEFAULT 100,
  	"active" boolean DEFAULT true,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "categories_locales" (
  	"name" varchar NOT NULL,
  	"description" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "categories_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"personas_id" integer
  );
  
  CREATE TABLE "option_sets_options" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"value" varchar NOT NULL,
  	"glyph" varchar,
  	"order" numeric DEFAULT 100,
  	"active" boolean DEFAULT true
  );
  
  CREATE TABLE "option_sets_options_locales" (
  	"label" varchar NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "option_sets" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"slug" varchar NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "option_sets_locales" (
  	"name" varchar NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "option_sets_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"personas_id" integer
  );
  
  CREATE TABLE "briefs_selections" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"token" varchar NOT NULL,
  	"value" varchar,
  	"label" varchar,
  	"custom" boolean DEFAULT false
  );
  
  CREATE TABLE "briefs" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"reference" varchar,
  	"status" "enum_briefs_status" DEFAULT 'new',
  	"sentence" varchar,
  	"persona_id" integer NOT NULL,
  	"date" timestamp(3) with time zone,
  	"locale" "enum_briefs_locale" DEFAULT 'en',
  	"member_id" integer,
  	"contact_name" varchar,
  	"contact_whatsapp" varchar,
  	"source_path" varchar,
  	"fingerprint" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "media" (
  	"id" serial PRIMARY KEY NOT NULL,
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
  	"focal_y" numeric,
  	"sizes_thumbnail_url" varchar,
  	"sizes_thumbnail_width" numeric,
  	"sizes_thumbnail_height" numeric,
  	"sizes_thumbnail_mime_type" varchar,
  	"sizes_thumbnail_filesize" numeric,
  	"sizes_thumbnail_filename" varchar,
  	"sizes_card_url" varchar,
  	"sizes_card_width" numeric,
  	"sizes_card_height" numeric,
  	"sizes_card_mime_type" varchar,
  	"sizes_card_filesize" numeric,
  	"sizes_card_filename" varchar,
  	"sizes_hero_url" varchar,
  	"sizes_hero_width" numeric,
  	"sizes_hero_height" numeric,
  	"sizes_hero_mime_type" varchar,
  	"sizes_hero_filesize" numeric,
  	"sizes_hero_filename" varchar
  );
  
  CREATE TABLE "media_locales" (
  	"alt" varchar NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "rate_limits" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"key" varchar NOT NULL,
  	"count" numeric DEFAULT 0 NOT NULL,
  	"window_start" timestamp(3) with time zone NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload_kv" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"key" varchar NOT NULL,
  	"data" jsonb NOT NULL
  );
  
  CREATE TABLE "payload_locked_documents" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"global_slug" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload_locked_documents_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"users_id" integer,
  	"personas_id" integer,
  	"categories_id" integer,
  	"option_sets_id" integer,
  	"briefs_id" integer,
  	"media_id" integer,
  	"rate_limits_id" integer
  );
  
  CREATE TABLE "payload_preferences" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"key" varchar,
  	"value" jsonb,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload_preferences_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"users_id" integer
  );
  
  CREATE TABLE "payload_migrations" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar,
  	"batch" numeric,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "landing_page_hero_trust_chips" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "landing_page_hero_trust_chips_locales" (
  	"text" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "landing_page_brief_builder_slots" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"token" varchar,
  	"kind" "enum_landing_page_brief_builder_slots_kind" DEFAULT 'options',
  	"option_set_id" integer,
  	"default_value" varchar,
  	"required" boolean DEFAULT true,
  	"allow_custom" boolean DEFAULT false
  );
  
  CREATE TABLE "landing_page_brief_builder_slots_locales" (
  	"group_label" varchar,
  	"placeholder" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "landing_page_brief_builder_steps" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "landing_page_brief_builder_steps_locales" (
  	"title" varchar,
  	"description" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "landing_page_navigation" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"target" varchar
  );
  
  CREATE TABLE "landing_page_navigation_locales" (
  	"label" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "landing_page_blocks_how_it_works_steps" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "landing_page_blocks_how_it_works_steps_locales" (
  	"title" varchar,
  	"body" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "landing_page_blocks_how_it_works" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"anchor" varchar DEFAULT 'how-it-works',
  	"cta_kind" "enum_landing_page_blocks_how_it_works_cta_kind" DEFAULT 'whatsapp',
  	"cta_href" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "landing_page_blocks_how_it_works_locales" (
  	"heading" varchar,
  	"subheading" varchar,
  	"cta_label" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "landing_page_blocks_features_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"glyph" varchar
  );
  
  CREATE TABLE "landing_page_blocks_features_items_locales" (
  	"title" varchar,
  	"body" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "landing_page_blocks_features" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"anchor" varchar DEFAULT 'why-us',
  	"block_name" varchar
  );
  
  CREATE TABLE "landing_page_blocks_features_locales" (
  	"heading" varchar,
  	"subheading" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "landing_page_blocks_categories_grid" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"anchor" varchar DEFAULT 'specialties',
  	"source" "enum_landing_page_blocks_categories_grid_source" DEFAULT 'active',
  	"cta_kind" "enum_landing_page_blocks_categories_grid_cta_kind" DEFAULT 'whatsapp',
  	"cta_href" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "landing_page_blocks_categories_grid_locales" (
  	"heading" varchar,
  	"subheading" varchar,
  	"cta_label" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "landing_page_blocks_persona_band" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"anchor" varchar DEFAULT 'for-professionals',
  	"layout" "enum_landing_page_blocks_persona_band_layout" DEFAULT 'combined',
  	"cta_kind" "enum_landing_page_blocks_persona_band_cta_kind" DEFAULT 'whatsapp',
  	"cta_href" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "landing_page_blocks_persona_band_locales" (
  	"heading" varchar,
  	"body" varchar,
  	"cta_label" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "landing_page_blocks_faq_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "landing_page_blocks_faq_items_locales" (
  	"question" varchar,
  	"answer" jsonb,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "landing_page_blocks_faq" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"anchor" varchar DEFAULT 'faq',
  	"block_name" varchar
  );
  
  CREATE TABLE "landing_page_blocks_faq_locales" (
  	"heading" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "landing_page_blocks_logo_cloud_logos" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"name" varchar,
  	"image_id" integer,
  	"image_dark_id" integer
  );
  
  CREATE TABLE "landing_page_blocks_logo_cloud" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"anchor" varchar DEFAULT 'trusted-by',
  	"block_name" varchar
  );
  
  CREATE TABLE "landing_page_blocks_logo_cloud_locales" (
  	"heading" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "landing_page_blocks_rich_text" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"anchor" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "landing_page_blocks_rich_text_locales" (
  	"content" jsonb,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "landing_page_blocks_call_to_action" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"anchor" varchar,
  	"primary_kind" "enum_landing_page_blocks_call_to_action_primary_kind" DEFAULT 'whatsapp',
  	"primary_href" varchar,
  	"secondary_kind" "enum_landing_page_blocks_call_to_action_secondary_kind" DEFAULT 'whatsapp',
  	"secondary_href" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "landing_page_blocks_call_to_action_locales" (
  	"heading" varchar,
  	"body" varchar,
  	"primary_label" varchar,
  	"secondary_label" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "landing_page" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"hero_layout" "enum_landing_page_hero_layout" DEFAULT 'briefBuilder',
  	"hero_primary_cta_kind" "enum_landing_page_hero_primary_cta_kind" DEFAULT 'whatsapp',
  	"hero_primary_cta_href" varchar,
  	"hero_secondary_cta_kind" "enum_landing_page_hero_secondary_cta_kind" DEFAULT 'whatsapp',
  	"hero_secondary_cta_href" varchar,
  	"hero_image_id" integer,
  	"hero_image_mobile_id" integer,
  	"brief_builder_enabled" boolean DEFAULT true,
  	"seo_og_image_id" integer,
  	"published_at" timestamp(3) with time zone,
  	"published_by_id" integer,
  	"_status" "enum_landing_page_status" DEFAULT 'draft',
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  CREATE TABLE "landing_page_locales" (
  	"hero_eyebrow" varchar,
  	"hero_headline" varchar DEFAULT 'You brief. We shoot.',
  	"hero_subheadline" varchar,
  	"hero_primary_cta_label" varchar,
  	"hero_secondary_cta_label" varchar,
  	"brief_builder_sentence" varchar DEFAULT 'I need a {persona} for {occasion} on {date} for {duration} in {location}, shot by {shotBy}.',
  	"brief_builder_submit_label" varchar DEFAULT 'See who''s free',
  	"brief_builder_helper_text" varchar,
  	"brief_builder_whatsapp_template" varchar,
  	"brief_builder_success_message" varchar,
  	"seo_title" varchar,
  	"seo_description" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "landing_page_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"categories_id" integer
  );
  
  CREATE TABLE "_landing_page_v_version_hero_trust_chips" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_landing_page_v_version_hero_trust_chips_locales" (
  	"text" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_landing_page_v_version_brief_builder_slots" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"token" varchar,
  	"kind" "enum__landing_page_v_version_brief_builder_slots_kind" DEFAULT 'options',
  	"option_set_id" integer,
  	"default_value" varchar,
  	"required" boolean DEFAULT true,
  	"allow_custom" boolean DEFAULT false,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_landing_page_v_version_brief_builder_slots_locales" (
  	"group_label" varchar,
  	"placeholder" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_landing_page_v_version_brief_builder_steps" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_landing_page_v_version_brief_builder_steps_locales" (
  	"title" varchar,
  	"description" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_landing_page_v_version_navigation" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"target" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_landing_page_v_version_navigation_locales" (
  	"label" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_landing_page_v_blocks_how_it_works_steps" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_landing_page_v_blocks_how_it_works_steps_locales" (
  	"title" varchar,
  	"body" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_landing_page_v_blocks_how_it_works" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"anchor" varchar DEFAULT 'how-it-works',
  	"cta_kind" "enum__landing_page_v_blocks_how_it_works_cta_kind" DEFAULT 'whatsapp',
  	"cta_href" varchar,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_landing_page_v_blocks_how_it_works_locales" (
  	"heading" varchar,
  	"subheading" varchar,
  	"cta_label" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_landing_page_v_blocks_features_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"glyph" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_landing_page_v_blocks_features_items_locales" (
  	"title" varchar,
  	"body" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_landing_page_v_blocks_features" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"anchor" varchar DEFAULT 'why-us',
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_landing_page_v_blocks_features_locales" (
  	"heading" varchar,
  	"subheading" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_landing_page_v_blocks_categories_grid" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"anchor" varchar DEFAULT 'specialties',
  	"source" "enum__landing_page_v_blocks_categories_grid_source" DEFAULT 'active',
  	"cta_kind" "enum__landing_page_v_blocks_categories_grid_cta_kind" DEFAULT 'whatsapp',
  	"cta_href" varchar,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_landing_page_v_blocks_categories_grid_locales" (
  	"heading" varchar,
  	"subheading" varchar,
  	"cta_label" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_landing_page_v_blocks_persona_band" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"anchor" varchar DEFAULT 'for-professionals',
  	"layout" "enum__landing_page_v_blocks_persona_band_layout" DEFAULT 'combined',
  	"cta_kind" "enum__landing_page_v_blocks_persona_band_cta_kind" DEFAULT 'whatsapp',
  	"cta_href" varchar,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_landing_page_v_blocks_persona_band_locales" (
  	"heading" varchar,
  	"body" varchar,
  	"cta_label" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_landing_page_v_blocks_faq_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_landing_page_v_blocks_faq_items_locales" (
  	"question" varchar,
  	"answer" jsonb,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_landing_page_v_blocks_faq" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"anchor" varchar DEFAULT 'faq',
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_landing_page_v_blocks_faq_locales" (
  	"heading" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_landing_page_v_blocks_logo_cloud_logos" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar,
  	"image_id" integer,
  	"image_dark_id" integer,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_landing_page_v_blocks_logo_cloud" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"anchor" varchar DEFAULT 'trusted-by',
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_landing_page_v_blocks_logo_cloud_locales" (
  	"heading" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_landing_page_v_blocks_rich_text" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"anchor" varchar,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_landing_page_v_blocks_rich_text_locales" (
  	"content" jsonb,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_landing_page_v_blocks_call_to_action" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"anchor" varchar,
  	"primary_kind" "enum__landing_page_v_blocks_call_to_action_primary_kind" DEFAULT 'whatsapp',
  	"primary_href" varchar,
  	"secondary_kind" "enum__landing_page_v_blocks_call_to_action_secondary_kind" DEFAULT 'whatsapp',
  	"secondary_href" varchar,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_landing_page_v_blocks_call_to_action_locales" (
  	"heading" varchar,
  	"body" varchar,
  	"primary_label" varchar,
  	"secondary_label" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_landing_page_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"version_hero_layout" "enum__landing_page_v_version_hero_layout" DEFAULT 'briefBuilder',
  	"version_hero_primary_cta_kind" "enum__landing_page_v_version_hero_primary_cta_kind" DEFAULT 'whatsapp',
  	"version_hero_primary_cta_href" varchar,
  	"version_hero_secondary_cta_kind" "enum__landing_page_v_version_hero_secondary_cta_kind" DEFAULT 'whatsapp',
  	"version_hero_secondary_cta_href" varchar,
  	"version_hero_image_id" integer,
  	"version_hero_image_mobile_id" integer,
  	"version_brief_builder_enabled" boolean DEFAULT true,
  	"version_seo_og_image_id" integer,
  	"version_published_at" timestamp(3) with time zone,
  	"version_published_by_id" integer,
  	"version__status" "enum__landing_page_v_version_status" DEFAULT 'draft',
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"snapshot" boolean,
  	"published_locale" "enum__landing_page_v_published_locale",
  	"latest" boolean
  );
  
  CREATE TABLE "_landing_page_v_locales" (
  	"version_hero_eyebrow" varchar,
  	"version_hero_headline" varchar DEFAULT 'You brief. We shoot.',
  	"version_hero_subheadline" varchar,
  	"version_hero_primary_cta_label" varchar,
  	"version_hero_secondary_cta_label" varchar,
  	"version_brief_builder_sentence" varchar DEFAULT 'I need a {persona} for {occasion} on {date} for {duration} in {location}, shot by {shotBy}.',
  	"version_brief_builder_submit_label" varchar DEFAULT 'See who''s free',
  	"version_brief_builder_helper_text" varchar,
  	"version_brief_builder_whatsapp_template" varchar,
  	"version_brief_builder_success_message" varchar,
  	"version_seo_title" varchar,
  	"version_seo_description" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_landing_page_v_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"categories_id" integer
  );
  
  CREATE TABLE "site_settings_social" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"platform" "enum_site_settings_social_platform" NOT NULL,
  	"url" varchar NOT NULL
  );
  
  CREATE TABLE "site_settings" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"logo_id" integer,
  	"logo_dark_id" integer,
  	"whatsapp_number" varchar NOT NULL,
  	"phone_number" varchar,
  	"contact_email" varchar,
  	"brief_limit_per_hour" numeric DEFAULT 5,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  CREATE TABLE "site_settings_locales" (
  	"site_name" varchar NOT NULL,
  	"whatsapp_default_message" varchar,
  	"expected_reply_time" varchar,
  	"labels_seeker_label" varchar,
  	"labels_provider_label" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "site_settings_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"personas_id" integer
  );
  
  ALTER TABLE "users_roles" ADD CONSTRAINT "users_roles_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "users_sessions" ADD CONSTRAINT "users_sessions_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "users" ADD CONSTRAINT "users_persona_id_personas_id_fk" FOREIGN KEY ("persona_id") REFERENCES "public"."personas"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "users_rels" ADD CONSTRAINT "users_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "users_rels" ADD CONSTRAINT "users_rels_categories_fk" FOREIGN KEY ("categories_id") REFERENCES "public"."categories"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "personas" ADD CONSTRAINT "personas_icon_id_media_id_fk" FOREIGN KEY ("icon_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "personas_locales" ADD CONSTRAINT "personas_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."personas"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "categories" ADD CONSTRAINT "categories_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "categories_locales" ADD CONSTRAINT "categories_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."categories"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "categories_rels" ADD CONSTRAINT "categories_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."categories"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "categories_rels" ADD CONSTRAINT "categories_rels_personas_fk" FOREIGN KEY ("personas_id") REFERENCES "public"."personas"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "option_sets_options" ADD CONSTRAINT "option_sets_options_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."option_sets"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "option_sets_options_locales" ADD CONSTRAINT "option_sets_options_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."option_sets_options"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "option_sets_locales" ADD CONSTRAINT "option_sets_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."option_sets"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "option_sets_rels" ADD CONSTRAINT "option_sets_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."option_sets"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "option_sets_rels" ADD CONSTRAINT "option_sets_rels_personas_fk" FOREIGN KEY ("personas_id") REFERENCES "public"."personas"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "briefs_selections" ADD CONSTRAINT "briefs_selections_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."briefs"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "briefs" ADD CONSTRAINT "briefs_persona_id_personas_id_fk" FOREIGN KEY ("persona_id") REFERENCES "public"."personas"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "briefs" ADD CONSTRAINT "briefs_member_id_users_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "media_locales" ADD CONSTRAINT "media_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."media"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."payload_locked_documents"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_personas_fk" FOREIGN KEY ("personas_id") REFERENCES "public"."personas"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_categories_fk" FOREIGN KEY ("categories_id") REFERENCES "public"."categories"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_option_sets_fk" FOREIGN KEY ("option_sets_id") REFERENCES "public"."option_sets"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_briefs_fk" FOREIGN KEY ("briefs_id") REFERENCES "public"."briefs"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_media_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_rate_limits_fk" FOREIGN KEY ("rate_limits_id") REFERENCES "public"."rate_limits"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_preferences_rels" ADD CONSTRAINT "payload_preferences_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."payload_preferences"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_preferences_rels" ADD CONSTRAINT "payload_preferences_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "landing_page_hero_trust_chips" ADD CONSTRAINT "landing_page_hero_trust_chips_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."landing_page"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "landing_page_hero_trust_chips_locales" ADD CONSTRAINT "landing_page_hero_trust_chips_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."landing_page_hero_trust_chips"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "landing_page_brief_builder_slots" ADD CONSTRAINT "landing_page_brief_builder_slots_option_set_id_option_sets_id_fk" FOREIGN KEY ("option_set_id") REFERENCES "public"."option_sets"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "landing_page_brief_builder_slots" ADD CONSTRAINT "landing_page_brief_builder_slots_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."landing_page"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "landing_page_brief_builder_slots_locales" ADD CONSTRAINT "landing_page_brief_builder_slots_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."landing_page_brief_builder_slots"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "landing_page_brief_builder_steps" ADD CONSTRAINT "landing_page_brief_builder_steps_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."landing_page"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "landing_page_brief_builder_steps_locales" ADD CONSTRAINT "landing_page_brief_builder_steps_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."landing_page_brief_builder_steps"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "landing_page_navigation" ADD CONSTRAINT "landing_page_navigation_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."landing_page"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "landing_page_navigation_locales" ADD CONSTRAINT "landing_page_navigation_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."landing_page_navigation"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "landing_page_blocks_how_it_works_steps" ADD CONSTRAINT "landing_page_blocks_how_it_works_steps_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."landing_page_blocks_how_it_works"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "landing_page_blocks_how_it_works_steps_locales" ADD CONSTRAINT "landing_page_blocks_how_it_works_steps_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."landing_page_blocks_how_it_works_steps"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "landing_page_blocks_how_it_works" ADD CONSTRAINT "landing_page_blocks_how_it_works_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."landing_page"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "landing_page_blocks_how_it_works_locales" ADD CONSTRAINT "landing_page_blocks_how_it_works_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."landing_page_blocks_how_it_works"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "landing_page_blocks_features_items" ADD CONSTRAINT "landing_page_blocks_features_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."landing_page_blocks_features"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "landing_page_blocks_features_items_locales" ADD CONSTRAINT "landing_page_blocks_features_items_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."landing_page_blocks_features_items"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "landing_page_blocks_features" ADD CONSTRAINT "landing_page_blocks_features_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."landing_page"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "landing_page_blocks_features_locales" ADD CONSTRAINT "landing_page_blocks_features_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."landing_page_blocks_features"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "landing_page_blocks_categories_grid" ADD CONSTRAINT "landing_page_blocks_categories_grid_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."landing_page"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "landing_page_blocks_categories_grid_locales" ADD CONSTRAINT "landing_page_blocks_categories_grid_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."landing_page_blocks_categories_grid"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "landing_page_blocks_persona_band" ADD CONSTRAINT "landing_page_blocks_persona_band_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."landing_page"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "landing_page_blocks_persona_band_locales" ADD CONSTRAINT "landing_page_blocks_persona_band_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."landing_page_blocks_persona_band"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "landing_page_blocks_faq_items" ADD CONSTRAINT "landing_page_blocks_faq_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."landing_page_blocks_faq"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "landing_page_blocks_faq_items_locales" ADD CONSTRAINT "landing_page_blocks_faq_items_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."landing_page_blocks_faq_items"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "landing_page_blocks_faq" ADD CONSTRAINT "landing_page_blocks_faq_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."landing_page"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "landing_page_blocks_faq_locales" ADD CONSTRAINT "landing_page_blocks_faq_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."landing_page_blocks_faq"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "landing_page_blocks_logo_cloud_logos" ADD CONSTRAINT "landing_page_blocks_logo_cloud_logos_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "landing_page_blocks_logo_cloud_logos" ADD CONSTRAINT "landing_page_blocks_logo_cloud_logos_image_dark_id_media_id_fk" FOREIGN KEY ("image_dark_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "landing_page_blocks_logo_cloud_logos" ADD CONSTRAINT "landing_page_blocks_logo_cloud_logos_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."landing_page_blocks_logo_cloud"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "landing_page_blocks_logo_cloud" ADD CONSTRAINT "landing_page_blocks_logo_cloud_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."landing_page"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "landing_page_blocks_logo_cloud_locales" ADD CONSTRAINT "landing_page_blocks_logo_cloud_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."landing_page_blocks_logo_cloud"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "landing_page_blocks_rich_text" ADD CONSTRAINT "landing_page_blocks_rich_text_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."landing_page"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "landing_page_blocks_rich_text_locales" ADD CONSTRAINT "landing_page_blocks_rich_text_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."landing_page_blocks_rich_text"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "landing_page_blocks_call_to_action" ADD CONSTRAINT "landing_page_blocks_call_to_action_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."landing_page"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "landing_page_blocks_call_to_action_locales" ADD CONSTRAINT "landing_page_blocks_call_to_action_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."landing_page_blocks_call_to_action"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "landing_page" ADD CONSTRAINT "landing_page_hero_image_id_media_id_fk" FOREIGN KEY ("hero_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "landing_page" ADD CONSTRAINT "landing_page_hero_image_mobile_id_media_id_fk" FOREIGN KEY ("hero_image_mobile_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "landing_page" ADD CONSTRAINT "landing_page_seo_og_image_id_media_id_fk" FOREIGN KEY ("seo_og_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "landing_page" ADD CONSTRAINT "landing_page_published_by_id_users_id_fk" FOREIGN KEY ("published_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "landing_page_locales" ADD CONSTRAINT "landing_page_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."landing_page"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "landing_page_rels" ADD CONSTRAINT "landing_page_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."landing_page"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "landing_page_rels" ADD CONSTRAINT "landing_page_rels_categories_fk" FOREIGN KEY ("categories_id") REFERENCES "public"."categories"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_landing_page_v_version_hero_trust_chips" ADD CONSTRAINT "_landing_page_v_version_hero_trust_chips_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_landing_page_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_landing_page_v_version_hero_trust_chips_locales" ADD CONSTRAINT "_landing_page_v_version_hero_trust_chips_locales_parent_i_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_landing_page_v_version_hero_trust_chips"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_landing_page_v_version_brief_builder_slots" ADD CONSTRAINT "_landing_page_v_version_brief_builder_slots_option_set_id_option_sets_id_fk" FOREIGN KEY ("option_set_id") REFERENCES "public"."option_sets"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_landing_page_v_version_brief_builder_slots" ADD CONSTRAINT "_landing_page_v_version_brief_builder_slots_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_landing_page_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_landing_page_v_version_brief_builder_slots_locales" ADD CONSTRAINT "_landing_page_v_version_brief_builder_slots_locales_paren_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_landing_page_v_version_brief_builder_slots"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_landing_page_v_version_brief_builder_steps" ADD CONSTRAINT "_landing_page_v_version_brief_builder_steps_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_landing_page_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_landing_page_v_version_brief_builder_steps_locales" ADD CONSTRAINT "_landing_page_v_version_brief_builder_steps_locales_paren_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_landing_page_v_version_brief_builder_steps"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_landing_page_v_version_navigation" ADD CONSTRAINT "_landing_page_v_version_navigation_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_landing_page_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_landing_page_v_version_navigation_locales" ADD CONSTRAINT "_landing_page_v_version_navigation_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_landing_page_v_version_navigation"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_landing_page_v_blocks_how_it_works_steps" ADD CONSTRAINT "_landing_page_v_blocks_how_it_works_steps_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_landing_page_v_blocks_how_it_works"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_landing_page_v_blocks_how_it_works_steps_locales" ADD CONSTRAINT "_landing_page_v_blocks_how_it_works_steps_locales_parent__fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_landing_page_v_blocks_how_it_works_steps"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_landing_page_v_blocks_how_it_works" ADD CONSTRAINT "_landing_page_v_blocks_how_it_works_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_landing_page_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_landing_page_v_blocks_how_it_works_locales" ADD CONSTRAINT "_landing_page_v_blocks_how_it_works_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_landing_page_v_blocks_how_it_works"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_landing_page_v_blocks_features_items" ADD CONSTRAINT "_landing_page_v_blocks_features_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_landing_page_v_blocks_features"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_landing_page_v_blocks_features_items_locales" ADD CONSTRAINT "_landing_page_v_blocks_features_items_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_landing_page_v_blocks_features_items"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_landing_page_v_blocks_features" ADD CONSTRAINT "_landing_page_v_blocks_features_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_landing_page_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_landing_page_v_blocks_features_locales" ADD CONSTRAINT "_landing_page_v_blocks_features_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_landing_page_v_blocks_features"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_landing_page_v_blocks_categories_grid" ADD CONSTRAINT "_landing_page_v_blocks_categories_grid_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_landing_page_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_landing_page_v_blocks_categories_grid_locales" ADD CONSTRAINT "_landing_page_v_blocks_categories_grid_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_landing_page_v_blocks_categories_grid"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_landing_page_v_blocks_persona_band" ADD CONSTRAINT "_landing_page_v_blocks_persona_band_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_landing_page_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_landing_page_v_blocks_persona_band_locales" ADD CONSTRAINT "_landing_page_v_blocks_persona_band_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_landing_page_v_blocks_persona_band"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_landing_page_v_blocks_faq_items" ADD CONSTRAINT "_landing_page_v_blocks_faq_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_landing_page_v_blocks_faq"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_landing_page_v_blocks_faq_items_locales" ADD CONSTRAINT "_landing_page_v_blocks_faq_items_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_landing_page_v_blocks_faq_items"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_landing_page_v_blocks_faq" ADD CONSTRAINT "_landing_page_v_blocks_faq_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_landing_page_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_landing_page_v_blocks_faq_locales" ADD CONSTRAINT "_landing_page_v_blocks_faq_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_landing_page_v_blocks_faq"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_landing_page_v_blocks_logo_cloud_logos" ADD CONSTRAINT "_landing_page_v_blocks_logo_cloud_logos_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_landing_page_v_blocks_logo_cloud_logos" ADD CONSTRAINT "_landing_page_v_blocks_logo_cloud_logos_image_dark_id_media_id_fk" FOREIGN KEY ("image_dark_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_landing_page_v_blocks_logo_cloud_logos" ADD CONSTRAINT "_landing_page_v_blocks_logo_cloud_logos_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_landing_page_v_blocks_logo_cloud"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_landing_page_v_blocks_logo_cloud" ADD CONSTRAINT "_landing_page_v_blocks_logo_cloud_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_landing_page_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_landing_page_v_blocks_logo_cloud_locales" ADD CONSTRAINT "_landing_page_v_blocks_logo_cloud_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_landing_page_v_blocks_logo_cloud"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_landing_page_v_blocks_rich_text" ADD CONSTRAINT "_landing_page_v_blocks_rich_text_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_landing_page_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_landing_page_v_blocks_rich_text_locales" ADD CONSTRAINT "_landing_page_v_blocks_rich_text_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_landing_page_v_blocks_rich_text"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_landing_page_v_blocks_call_to_action" ADD CONSTRAINT "_landing_page_v_blocks_call_to_action_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_landing_page_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_landing_page_v_blocks_call_to_action_locales" ADD CONSTRAINT "_landing_page_v_blocks_call_to_action_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_landing_page_v_blocks_call_to_action"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_landing_page_v" ADD CONSTRAINT "_landing_page_v_version_hero_image_id_media_id_fk" FOREIGN KEY ("version_hero_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_landing_page_v" ADD CONSTRAINT "_landing_page_v_version_hero_image_mobile_id_media_id_fk" FOREIGN KEY ("version_hero_image_mobile_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_landing_page_v" ADD CONSTRAINT "_landing_page_v_version_seo_og_image_id_media_id_fk" FOREIGN KEY ("version_seo_og_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_landing_page_v" ADD CONSTRAINT "_landing_page_v_version_published_by_id_users_id_fk" FOREIGN KEY ("version_published_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_landing_page_v_locales" ADD CONSTRAINT "_landing_page_v_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_landing_page_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_landing_page_v_rels" ADD CONSTRAINT "_landing_page_v_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."_landing_page_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_landing_page_v_rels" ADD CONSTRAINT "_landing_page_v_rels_categories_fk" FOREIGN KEY ("categories_id") REFERENCES "public"."categories"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "site_settings_social" ADD CONSTRAINT "site_settings_social_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."site_settings"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "site_settings" ADD CONSTRAINT "site_settings_logo_id_media_id_fk" FOREIGN KEY ("logo_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "site_settings" ADD CONSTRAINT "site_settings_logo_dark_id_media_id_fk" FOREIGN KEY ("logo_dark_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "site_settings_locales" ADD CONSTRAINT "site_settings_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."site_settings"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "site_settings_rels" ADD CONSTRAINT "site_settings_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."site_settings"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "site_settings_rels" ADD CONSTRAINT "site_settings_rels_personas_fk" FOREIGN KEY ("personas_id") REFERENCES "public"."personas"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "users_roles_order_idx" ON "users_roles" USING btree ("order");
  CREATE INDEX "users_roles_parent_idx" ON "users_roles" USING btree ("parent_id");
  CREATE INDEX "users_sessions_order_idx" ON "users_sessions" USING btree ("_order");
  CREATE INDEX "users_sessions_parent_id_idx" ON "users_sessions" USING btree ("_parent_id");
  CREATE INDEX "users_persona_idx" ON "users" USING btree ("persona_id");
  CREATE INDEX "users_updated_at_idx" ON "users" USING btree ("updated_at");
  CREATE INDEX "users_created_at_idx" ON "users" USING btree ("created_at");
  CREATE UNIQUE INDEX "users_email_idx" ON "users" USING btree ("email");
  CREATE INDEX "users_rels_order_idx" ON "users_rels" USING btree ("order");
  CREATE INDEX "users_rels_parent_idx" ON "users_rels" USING btree ("parent_id");
  CREATE INDEX "users_rels_path_idx" ON "users_rels" USING btree ("path");
  CREATE INDEX "users_rels_categories_id_idx" ON "users_rels" USING btree ("categories_id");
  CREATE UNIQUE INDEX "personas_slug_idx" ON "personas" USING btree ("slug");
  CREATE INDEX "personas_icon_idx" ON "personas" USING btree ("icon_id");
  CREATE INDEX "personas_updated_at_idx" ON "personas" USING btree ("updated_at");
  CREATE INDEX "personas_created_at_idx" ON "personas" USING btree ("created_at");
  CREATE UNIQUE INDEX "personas_locales_locale_parent_id_unique" ON "personas_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "personas_locales_parent_id_idx" ON "personas_locales" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "categories_slug_idx" ON "categories" USING btree ("slug");
  CREATE INDEX "categories_image_idx" ON "categories" USING btree ("image_id");
  CREATE INDEX "categories_updated_at_idx" ON "categories" USING btree ("updated_at");
  CREATE INDEX "categories_created_at_idx" ON "categories" USING btree ("created_at");
  CREATE UNIQUE INDEX "categories_locales_locale_parent_id_unique" ON "categories_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "categories_locales_parent_id_idx" ON "categories_locales" USING btree ("_parent_id");
  CREATE INDEX "categories_rels_order_idx" ON "categories_rels" USING btree ("order");
  CREATE INDEX "categories_rels_parent_idx" ON "categories_rels" USING btree ("parent_id");
  CREATE INDEX "categories_rels_path_idx" ON "categories_rels" USING btree ("path");
  CREATE INDEX "categories_rels_personas_id_idx" ON "categories_rels" USING btree ("personas_id");
  CREATE INDEX "option_sets_options_order_idx" ON "option_sets_options" USING btree ("_order");
  CREATE INDEX "option_sets_options_parent_id_idx" ON "option_sets_options" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "option_sets_options_locales_locale_parent_id_unique" ON "option_sets_options_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "option_sets_options_locales_parent_id_idx" ON "option_sets_options_locales" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "option_sets_slug_idx" ON "option_sets" USING btree ("slug");
  CREATE INDEX "option_sets_updated_at_idx" ON "option_sets" USING btree ("updated_at");
  CREATE INDEX "option_sets_created_at_idx" ON "option_sets" USING btree ("created_at");
  CREATE UNIQUE INDEX "option_sets_locales_locale_parent_id_unique" ON "option_sets_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "option_sets_locales_parent_id_idx" ON "option_sets_locales" USING btree ("_parent_id");
  CREATE INDEX "option_sets_rels_order_idx" ON "option_sets_rels" USING btree ("order");
  CREATE INDEX "option_sets_rels_parent_idx" ON "option_sets_rels" USING btree ("parent_id");
  CREATE INDEX "option_sets_rels_path_idx" ON "option_sets_rels" USING btree ("path");
  CREATE INDEX "option_sets_rels_personas_id_idx" ON "option_sets_rels" USING btree ("personas_id");
  CREATE INDEX "briefs_selections_order_idx" ON "briefs_selections" USING btree ("_order");
  CREATE INDEX "briefs_selections_parent_id_idx" ON "briefs_selections" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "briefs_reference_idx" ON "briefs" USING btree ("reference");
  CREATE INDEX "briefs_status_idx" ON "briefs" USING btree ("status");
  CREATE INDEX "briefs_persona_idx" ON "briefs" USING btree ("persona_id");
  CREATE INDEX "briefs_member_idx" ON "briefs" USING btree ("member_id");
  CREATE INDEX "briefs_fingerprint_idx" ON "briefs" USING btree ("fingerprint");
  CREATE INDEX "briefs_updated_at_idx" ON "briefs" USING btree ("updated_at");
  CREATE INDEX "briefs_created_at_idx" ON "briefs" USING btree ("created_at");
  CREATE INDEX "media_updated_at_idx" ON "media" USING btree ("updated_at");
  CREATE INDEX "media_created_at_idx" ON "media" USING btree ("created_at");
  CREATE UNIQUE INDEX "media_filename_idx" ON "media" USING btree ("filename");
  CREATE INDEX "media_sizes_thumbnail_sizes_thumbnail_filename_idx" ON "media" USING btree ("sizes_thumbnail_filename");
  CREATE INDEX "media_sizes_card_sizes_card_filename_idx" ON "media" USING btree ("sizes_card_filename");
  CREATE INDEX "media_sizes_hero_sizes_hero_filename_idx" ON "media" USING btree ("sizes_hero_filename");
  CREATE UNIQUE INDEX "media_locales_locale_parent_id_unique" ON "media_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "media_locales_parent_id_idx" ON "media_locales" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "rate_limits_key_idx" ON "rate_limits" USING btree ("key");
  CREATE INDEX "rate_limits_window_start_idx" ON "rate_limits" USING btree ("window_start");
  CREATE INDEX "rate_limits_updated_at_idx" ON "rate_limits" USING btree ("updated_at");
  CREATE INDEX "rate_limits_created_at_idx" ON "rate_limits" USING btree ("created_at");
  CREATE UNIQUE INDEX "payload_kv_key_idx" ON "payload_kv" USING btree ("key");
  CREATE INDEX "payload_locked_documents_global_slug_idx" ON "payload_locked_documents" USING btree ("global_slug");
  CREATE INDEX "payload_locked_documents_updated_at_idx" ON "payload_locked_documents" USING btree ("updated_at");
  CREATE INDEX "payload_locked_documents_created_at_idx" ON "payload_locked_documents" USING btree ("created_at");
  CREATE INDEX "payload_locked_documents_rels_order_idx" ON "payload_locked_documents_rels" USING btree ("order");
  CREATE INDEX "payload_locked_documents_rels_parent_idx" ON "payload_locked_documents_rels" USING btree ("parent_id");
  CREATE INDEX "payload_locked_documents_rels_path_idx" ON "payload_locked_documents_rels" USING btree ("path");
  CREATE INDEX "payload_locked_documents_rels_users_id_idx" ON "payload_locked_documents_rels" USING btree ("users_id");
  CREATE INDEX "payload_locked_documents_rels_personas_id_idx" ON "payload_locked_documents_rels" USING btree ("personas_id");
  CREATE INDEX "payload_locked_documents_rels_categories_id_idx" ON "payload_locked_documents_rels" USING btree ("categories_id");
  CREATE INDEX "payload_locked_documents_rels_option_sets_id_idx" ON "payload_locked_documents_rels" USING btree ("option_sets_id");
  CREATE INDEX "payload_locked_documents_rels_briefs_id_idx" ON "payload_locked_documents_rels" USING btree ("briefs_id");
  CREATE INDEX "payload_locked_documents_rels_media_id_idx" ON "payload_locked_documents_rels" USING btree ("media_id");
  CREATE INDEX "payload_locked_documents_rels_rate_limits_id_idx" ON "payload_locked_documents_rels" USING btree ("rate_limits_id");
  CREATE INDEX "payload_preferences_key_idx" ON "payload_preferences" USING btree ("key");
  CREATE INDEX "payload_preferences_updated_at_idx" ON "payload_preferences" USING btree ("updated_at");
  CREATE INDEX "payload_preferences_created_at_idx" ON "payload_preferences" USING btree ("created_at");
  CREATE INDEX "payload_preferences_rels_order_idx" ON "payload_preferences_rels" USING btree ("order");
  CREATE INDEX "payload_preferences_rels_parent_idx" ON "payload_preferences_rels" USING btree ("parent_id");
  CREATE INDEX "payload_preferences_rels_path_idx" ON "payload_preferences_rels" USING btree ("path");
  CREATE INDEX "payload_preferences_rels_users_id_idx" ON "payload_preferences_rels" USING btree ("users_id");
  CREATE INDEX "payload_migrations_updated_at_idx" ON "payload_migrations" USING btree ("updated_at");
  CREATE INDEX "payload_migrations_created_at_idx" ON "payload_migrations" USING btree ("created_at");
  CREATE INDEX "landing_page_hero_trust_chips_order_idx" ON "landing_page_hero_trust_chips" USING btree ("_order");
  CREATE INDEX "landing_page_hero_trust_chips_parent_id_idx" ON "landing_page_hero_trust_chips" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "landing_page_hero_trust_chips_locales_locale_parent_id_uniqu" ON "landing_page_hero_trust_chips_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "landing_page_hero_trust_chips_locales_parent_id_idx" ON "landing_page_hero_trust_chips_locales" USING btree ("_parent_id");
  CREATE INDEX "landing_page_brief_builder_slots_order_idx" ON "landing_page_brief_builder_slots" USING btree ("_order");
  CREATE INDEX "landing_page_brief_builder_slots_parent_id_idx" ON "landing_page_brief_builder_slots" USING btree ("_parent_id");
  CREATE INDEX "landing_page_brief_builder_slots_option_set_idx" ON "landing_page_brief_builder_slots" USING btree ("option_set_id");
  CREATE UNIQUE INDEX "landing_page_brief_builder_slots_locales_locale_parent_id_un" ON "landing_page_brief_builder_slots_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "landing_page_brief_builder_slots_locales_parent_id_idx" ON "landing_page_brief_builder_slots_locales" USING btree ("_parent_id");
  CREATE INDEX "landing_page_brief_builder_steps_order_idx" ON "landing_page_brief_builder_steps" USING btree ("_order");
  CREATE INDEX "landing_page_brief_builder_steps_parent_id_idx" ON "landing_page_brief_builder_steps" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "landing_page_brief_builder_steps_locales_locale_parent_id_un" ON "landing_page_brief_builder_steps_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "landing_page_brief_builder_steps_locales_parent_id_idx" ON "landing_page_brief_builder_steps_locales" USING btree ("_parent_id");
  CREATE INDEX "landing_page_navigation_order_idx" ON "landing_page_navigation" USING btree ("_order");
  CREATE INDEX "landing_page_navigation_parent_id_idx" ON "landing_page_navigation" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "landing_page_navigation_locales_locale_parent_id_unique" ON "landing_page_navigation_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "landing_page_navigation_locales_parent_id_idx" ON "landing_page_navigation_locales" USING btree ("_parent_id");
  CREATE INDEX "landing_page_blocks_how_it_works_steps_order_idx" ON "landing_page_blocks_how_it_works_steps" USING btree ("_order");
  CREATE INDEX "landing_page_blocks_how_it_works_steps_parent_id_idx" ON "landing_page_blocks_how_it_works_steps" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "landing_page_blocks_how_it_works_steps_locales_locale_parent" ON "landing_page_blocks_how_it_works_steps_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "landing_page_blocks_how_it_works_steps_locales_parent_id_idx" ON "landing_page_blocks_how_it_works_steps_locales" USING btree ("_parent_id");
  CREATE INDEX "landing_page_blocks_how_it_works_order_idx" ON "landing_page_blocks_how_it_works" USING btree ("_order");
  CREATE INDEX "landing_page_blocks_how_it_works_parent_id_idx" ON "landing_page_blocks_how_it_works" USING btree ("_parent_id");
  CREATE INDEX "landing_page_blocks_how_it_works_path_idx" ON "landing_page_blocks_how_it_works" USING btree ("_path");
  CREATE UNIQUE INDEX "landing_page_blocks_how_it_works_locales_locale_parent_id_un" ON "landing_page_blocks_how_it_works_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "landing_page_blocks_how_it_works_locales_parent_id_idx" ON "landing_page_blocks_how_it_works_locales" USING btree ("_parent_id");
  CREATE INDEX "landing_page_blocks_features_items_order_idx" ON "landing_page_blocks_features_items" USING btree ("_order");
  CREATE INDEX "landing_page_blocks_features_items_parent_id_idx" ON "landing_page_blocks_features_items" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "landing_page_blocks_features_items_locales_locale_parent_id_" ON "landing_page_blocks_features_items_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "landing_page_blocks_features_items_locales_parent_id_idx" ON "landing_page_blocks_features_items_locales" USING btree ("_parent_id");
  CREATE INDEX "landing_page_blocks_features_order_idx" ON "landing_page_blocks_features" USING btree ("_order");
  CREATE INDEX "landing_page_blocks_features_parent_id_idx" ON "landing_page_blocks_features" USING btree ("_parent_id");
  CREATE INDEX "landing_page_blocks_features_path_idx" ON "landing_page_blocks_features" USING btree ("_path");
  CREATE UNIQUE INDEX "landing_page_blocks_features_locales_locale_parent_id_unique" ON "landing_page_blocks_features_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "landing_page_blocks_features_locales_parent_id_idx" ON "landing_page_blocks_features_locales" USING btree ("_parent_id");
  CREATE INDEX "landing_page_blocks_categories_grid_order_idx" ON "landing_page_blocks_categories_grid" USING btree ("_order");
  CREATE INDEX "landing_page_blocks_categories_grid_parent_id_idx" ON "landing_page_blocks_categories_grid" USING btree ("_parent_id");
  CREATE INDEX "landing_page_blocks_categories_grid_path_idx" ON "landing_page_blocks_categories_grid" USING btree ("_path");
  CREATE UNIQUE INDEX "landing_page_blocks_categories_grid_locales_locale_parent_id" ON "landing_page_blocks_categories_grid_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "landing_page_blocks_categories_grid_locales_parent_id_idx" ON "landing_page_blocks_categories_grid_locales" USING btree ("_parent_id");
  CREATE INDEX "landing_page_blocks_persona_band_order_idx" ON "landing_page_blocks_persona_band" USING btree ("_order");
  CREATE INDEX "landing_page_blocks_persona_band_parent_id_idx" ON "landing_page_blocks_persona_band" USING btree ("_parent_id");
  CREATE INDEX "landing_page_blocks_persona_band_path_idx" ON "landing_page_blocks_persona_band" USING btree ("_path");
  CREATE UNIQUE INDEX "landing_page_blocks_persona_band_locales_locale_parent_id_un" ON "landing_page_blocks_persona_band_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "landing_page_blocks_persona_band_locales_parent_id_idx" ON "landing_page_blocks_persona_band_locales" USING btree ("_parent_id");
  CREATE INDEX "landing_page_blocks_faq_items_order_idx" ON "landing_page_blocks_faq_items" USING btree ("_order");
  CREATE INDEX "landing_page_blocks_faq_items_parent_id_idx" ON "landing_page_blocks_faq_items" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "landing_page_blocks_faq_items_locales_locale_parent_id_uniqu" ON "landing_page_blocks_faq_items_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "landing_page_blocks_faq_items_locales_parent_id_idx" ON "landing_page_blocks_faq_items_locales" USING btree ("_parent_id");
  CREATE INDEX "landing_page_blocks_faq_order_idx" ON "landing_page_blocks_faq" USING btree ("_order");
  CREATE INDEX "landing_page_blocks_faq_parent_id_idx" ON "landing_page_blocks_faq" USING btree ("_parent_id");
  CREATE INDEX "landing_page_blocks_faq_path_idx" ON "landing_page_blocks_faq" USING btree ("_path");
  CREATE UNIQUE INDEX "landing_page_blocks_faq_locales_locale_parent_id_unique" ON "landing_page_blocks_faq_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "landing_page_blocks_faq_locales_parent_id_idx" ON "landing_page_blocks_faq_locales" USING btree ("_parent_id");
  CREATE INDEX "landing_page_blocks_logo_cloud_logos_order_idx" ON "landing_page_blocks_logo_cloud_logos" USING btree ("_order");
  CREATE INDEX "landing_page_blocks_logo_cloud_logos_parent_id_idx" ON "landing_page_blocks_logo_cloud_logos" USING btree ("_parent_id");
  CREATE INDEX "landing_page_blocks_logo_cloud_logos_image_idx" ON "landing_page_blocks_logo_cloud_logos" USING btree ("image_id");
  CREATE INDEX "landing_page_blocks_logo_cloud_logos_image_dark_idx" ON "landing_page_blocks_logo_cloud_logos" USING btree ("image_dark_id");
  CREATE INDEX "landing_page_blocks_logo_cloud_order_idx" ON "landing_page_blocks_logo_cloud" USING btree ("_order");
  CREATE INDEX "landing_page_blocks_logo_cloud_parent_id_idx" ON "landing_page_blocks_logo_cloud" USING btree ("_parent_id");
  CREATE INDEX "landing_page_blocks_logo_cloud_path_idx" ON "landing_page_blocks_logo_cloud" USING btree ("_path");
  CREATE UNIQUE INDEX "landing_page_blocks_logo_cloud_locales_locale_parent_id_uniq" ON "landing_page_blocks_logo_cloud_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "landing_page_blocks_logo_cloud_locales_parent_id_idx" ON "landing_page_blocks_logo_cloud_locales" USING btree ("_parent_id");
  CREATE INDEX "landing_page_blocks_rich_text_order_idx" ON "landing_page_blocks_rich_text" USING btree ("_order");
  CREATE INDEX "landing_page_blocks_rich_text_parent_id_idx" ON "landing_page_blocks_rich_text" USING btree ("_parent_id");
  CREATE INDEX "landing_page_blocks_rich_text_path_idx" ON "landing_page_blocks_rich_text" USING btree ("_path");
  CREATE UNIQUE INDEX "landing_page_blocks_rich_text_locales_locale_parent_id_uniqu" ON "landing_page_blocks_rich_text_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "landing_page_blocks_rich_text_locales_parent_id_idx" ON "landing_page_blocks_rich_text_locales" USING btree ("_parent_id");
  CREATE INDEX "landing_page_blocks_call_to_action_order_idx" ON "landing_page_blocks_call_to_action" USING btree ("_order");
  CREATE INDEX "landing_page_blocks_call_to_action_parent_id_idx" ON "landing_page_blocks_call_to_action" USING btree ("_parent_id");
  CREATE INDEX "landing_page_blocks_call_to_action_path_idx" ON "landing_page_blocks_call_to_action" USING btree ("_path");
  CREATE UNIQUE INDEX "landing_page_blocks_call_to_action_locales_locale_parent_id_" ON "landing_page_blocks_call_to_action_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "landing_page_blocks_call_to_action_locales_parent_id_idx" ON "landing_page_blocks_call_to_action_locales" USING btree ("_parent_id");
  CREATE INDEX "landing_page_hero_hero_image_idx" ON "landing_page" USING btree ("hero_image_id");
  CREATE INDEX "landing_page_hero_hero_image_mobile_idx" ON "landing_page" USING btree ("hero_image_mobile_id");
  CREATE INDEX "landing_page_seo_seo_og_image_idx" ON "landing_page" USING btree ("seo_og_image_id");
  CREATE INDEX "landing_page_published_by_idx" ON "landing_page" USING btree ("published_by_id");
  CREATE INDEX "landing_page__status_idx" ON "landing_page" USING btree ("_status");
  CREATE UNIQUE INDEX "landing_page_locales_locale_parent_id_unique" ON "landing_page_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "landing_page_locales_parent_id_idx" ON "landing_page_locales" USING btree ("_parent_id");
  CREATE INDEX "landing_page_rels_order_idx" ON "landing_page_rels" USING btree ("order");
  CREATE INDEX "landing_page_rels_parent_idx" ON "landing_page_rels" USING btree ("parent_id");
  CREATE INDEX "landing_page_rels_path_idx" ON "landing_page_rels" USING btree ("path");
  CREATE INDEX "landing_page_rels_categories_id_idx" ON "landing_page_rels" USING btree ("categories_id");
  CREATE INDEX "_landing_page_v_version_hero_trust_chips_order_idx" ON "_landing_page_v_version_hero_trust_chips" USING btree ("_order");
  CREATE INDEX "_landing_page_v_version_hero_trust_chips_parent_id_idx" ON "_landing_page_v_version_hero_trust_chips" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "_landing_page_v_version_hero_trust_chips_locales_locale_pare" ON "_landing_page_v_version_hero_trust_chips_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_landing_page_v_version_hero_trust_chips_locales_parent__idx" ON "_landing_page_v_version_hero_trust_chips_locales" USING btree ("_parent_id");
  CREATE INDEX "_landing_page_v_version_brief_builder_slots_order_idx" ON "_landing_page_v_version_brief_builder_slots" USING btree ("_order");
  CREATE INDEX "_landing_page_v_version_brief_builder_slots_parent_id_idx" ON "_landing_page_v_version_brief_builder_slots" USING btree ("_parent_id");
  CREATE INDEX "_landing_page_v_version_brief_builder_slots_option_set_idx" ON "_landing_page_v_version_brief_builder_slots" USING btree ("option_set_id");
  CREATE UNIQUE INDEX "_landing_page_v_version_brief_builder_slots_locales_locale_p" ON "_landing_page_v_version_brief_builder_slots_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_landing_page_v_version_brief_builder_slots_locales_pare_idx" ON "_landing_page_v_version_brief_builder_slots_locales" USING btree ("_parent_id");
  CREATE INDEX "_landing_page_v_version_brief_builder_steps_order_idx" ON "_landing_page_v_version_brief_builder_steps" USING btree ("_order");
  CREATE INDEX "_landing_page_v_version_brief_builder_steps_parent_id_idx" ON "_landing_page_v_version_brief_builder_steps" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "_landing_page_v_version_brief_builder_steps_locales_locale_p" ON "_landing_page_v_version_brief_builder_steps_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_landing_page_v_version_brief_builder_steps_locales_pare_idx" ON "_landing_page_v_version_brief_builder_steps_locales" USING btree ("_parent_id");
  CREATE INDEX "_landing_page_v_version_navigation_order_idx" ON "_landing_page_v_version_navigation" USING btree ("_order");
  CREATE INDEX "_landing_page_v_version_navigation_parent_id_idx" ON "_landing_page_v_version_navigation" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "_landing_page_v_version_navigation_locales_locale_parent_id_" ON "_landing_page_v_version_navigation_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_landing_page_v_version_navigation_locales_parent_id_idx" ON "_landing_page_v_version_navigation_locales" USING btree ("_parent_id");
  CREATE INDEX "_landing_page_v_blocks_how_it_works_steps_order_idx" ON "_landing_page_v_blocks_how_it_works_steps" USING btree ("_order");
  CREATE INDEX "_landing_page_v_blocks_how_it_works_steps_parent_id_idx" ON "_landing_page_v_blocks_how_it_works_steps" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "_landing_page_v_blocks_how_it_works_steps_locales_locale_par" ON "_landing_page_v_blocks_how_it_works_steps_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_landing_page_v_blocks_how_it_works_steps_locales_parent_idx" ON "_landing_page_v_blocks_how_it_works_steps_locales" USING btree ("_parent_id");
  CREATE INDEX "_landing_page_v_blocks_how_it_works_order_idx" ON "_landing_page_v_blocks_how_it_works" USING btree ("_order");
  CREATE INDEX "_landing_page_v_blocks_how_it_works_parent_id_idx" ON "_landing_page_v_blocks_how_it_works" USING btree ("_parent_id");
  CREATE INDEX "_landing_page_v_blocks_how_it_works_path_idx" ON "_landing_page_v_blocks_how_it_works" USING btree ("_path");
  CREATE UNIQUE INDEX "_landing_page_v_blocks_how_it_works_locales_locale_parent_id" ON "_landing_page_v_blocks_how_it_works_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_landing_page_v_blocks_how_it_works_locales_parent_id_idx" ON "_landing_page_v_blocks_how_it_works_locales" USING btree ("_parent_id");
  CREATE INDEX "_landing_page_v_blocks_features_items_order_idx" ON "_landing_page_v_blocks_features_items" USING btree ("_order");
  CREATE INDEX "_landing_page_v_blocks_features_items_parent_id_idx" ON "_landing_page_v_blocks_features_items" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "_landing_page_v_blocks_features_items_locales_locale_parent_" ON "_landing_page_v_blocks_features_items_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_landing_page_v_blocks_features_items_locales_parent_id_idx" ON "_landing_page_v_blocks_features_items_locales" USING btree ("_parent_id");
  CREATE INDEX "_landing_page_v_blocks_features_order_idx" ON "_landing_page_v_blocks_features" USING btree ("_order");
  CREATE INDEX "_landing_page_v_blocks_features_parent_id_idx" ON "_landing_page_v_blocks_features" USING btree ("_parent_id");
  CREATE INDEX "_landing_page_v_blocks_features_path_idx" ON "_landing_page_v_blocks_features" USING btree ("_path");
  CREATE UNIQUE INDEX "_landing_page_v_blocks_features_locales_locale_parent_id_uni" ON "_landing_page_v_blocks_features_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_landing_page_v_blocks_features_locales_parent_id_idx" ON "_landing_page_v_blocks_features_locales" USING btree ("_parent_id");
  CREATE INDEX "_landing_page_v_blocks_categories_grid_order_idx" ON "_landing_page_v_blocks_categories_grid" USING btree ("_order");
  CREATE INDEX "_landing_page_v_blocks_categories_grid_parent_id_idx" ON "_landing_page_v_blocks_categories_grid" USING btree ("_parent_id");
  CREATE INDEX "_landing_page_v_blocks_categories_grid_path_idx" ON "_landing_page_v_blocks_categories_grid" USING btree ("_path");
  CREATE UNIQUE INDEX "_landing_page_v_blocks_categories_grid_locales_locale_parent" ON "_landing_page_v_blocks_categories_grid_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_landing_page_v_blocks_categories_grid_locales_parent_id_idx" ON "_landing_page_v_blocks_categories_grid_locales" USING btree ("_parent_id");
  CREATE INDEX "_landing_page_v_blocks_persona_band_order_idx" ON "_landing_page_v_blocks_persona_band" USING btree ("_order");
  CREATE INDEX "_landing_page_v_blocks_persona_band_parent_id_idx" ON "_landing_page_v_blocks_persona_band" USING btree ("_parent_id");
  CREATE INDEX "_landing_page_v_blocks_persona_band_path_idx" ON "_landing_page_v_blocks_persona_band" USING btree ("_path");
  CREATE UNIQUE INDEX "_landing_page_v_blocks_persona_band_locales_locale_parent_id" ON "_landing_page_v_blocks_persona_band_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_landing_page_v_blocks_persona_band_locales_parent_id_idx" ON "_landing_page_v_blocks_persona_band_locales" USING btree ("_parent_id");
  CREATE INDEX "_landing_page_v_blocks_faq_items_order_idx" ON "_landing_page_v_blocks_faq_items" USING btree ("_order");
  CREATE INDEX "_landing_page_v_blocks_faq_items_parent_id_idx" ON "_landing_page_v_blocks_faq_items" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "_landing_page_v_blocks_faq_items_locales_locale_parent_id_un" ON "_landing_page_v_blocks_faq_items_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_landing_page_v_blocks_faq_items_locales_parent_id_idx" ON "_landing_page_v_blocks_faq_items_locales" USING btree ("_parent_id");
  CREATE INDEX "_landing_page_v_blocks_faq_order_idx" ON "_landing_page_v_blocks_faq" USING btree ("_order");
  CREATE INDEX "_landing_page_v_blocks_faq_parent_id_idx" ON "_landing_page_v_blocks_faq" USING btree ("_parent_id");
  CREATE INDEX "_landing_page_v_blocks_faq_path_idx" ON "_landing_page_v_blocks_faq" USING btree ("_path");
  CREATE UNIQUE INDEX "_landing_page_v_blocks_faq_locales_locale_parent_id_unique" ON "_landing_page_v_blocks_faq_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_landing_page_v_blocks_faq_locales_parent_id_idx" ON "_landing_page_v_blocks_faq_locales" USING btree ("_parent_id");
  CREATE INDEX "_landing_page_v_blocks_logo_cloud_logos_order_idx" ON "_landing_page_v_blocks_logo_cloud_logos" USING btree ("_order");
  CREATE INDEX "_landing_page_v_blocks_logo_cloud_logos_parent_id_idx" ON "_landing_page_v_blocks_logo_cloud_logos" USING btree ("_parent_id");
  CREATE INDEX "_landing_page_v_blocks_logo_cloud_logos_image_idx" ON "_landing_page_v_blocks_logo_cloud_logos" USING btree ("image_id");
  CREATE INDEX "_landing_page_v_blocks_logo_cloud_logos_image_dark_idx" ON "_landing_page_v_blocks_logo_cloud_logos" USING btree ("image_dark_id");
  CREATE INDEX "_landing_page_v_blocks_logo_cloud_order_idx" ON "_landing_page_v_blocks_logo_cloud" USING btree ("_order");
  CREATE INDEX "_landing_page_v_blocks_logo_cloud_parent_id_idx" ON "_landing_page_v_blocks_logo_cloud" USING btree ("_parent_id");
  CREATE INDEX "_landing_page_v_blocks_logo_cloud_path_idx" ON "_landing_page_v_blocks_logo_cloud" USING btree ("_path");
  CREATE UNIQUE INDEX "_landing_page_v_blocks_logo_cloud_locales_locale_parent_id_u" ON "_landing_page_v_blocks_logo_cloud_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_landing_page_v_blocks_logo_cloud_locales_parent_id_idx" ON "_landing_page_v_blocks_logo_cloud_locales" USING btree ("_parent_id");
  CREATE INDEX "_landing_page_v_blocks_rich_text_order_idx" ON "_landing_page_v_blocks_rich_text" USING btree ("_order");
  CREATE INDEX "_landing_page_v_blocks_rich_text_parent_id_idx" ON "_landing_page_v_blocks_rich_text" USING btree ("_parent_id");
  CREATE INDEX "_landing_page_v_blocks_rich_text_path_idx" ON "_landing_page_v_blocks_rich_text" USING btree ("_path");
  CREATE UNIQUE INDEX "_landing_page_v_blocks_rich_text_locales_locale_parent_id_un" ON "_landing_page_v_blocks_rich_text_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_landing_page_v_blocks_rich_text_locales_parent_id_idx" ON "_landing_page_v_blocks_rich_text_locales" USING btree ("_parent_id");
  CREATE INDEX "_landing_page_v_blocks_call_to_action_order_idx" ON "_landing_page_v_blocks_call_to_action" USING btree ("_order");
  CREATE INDEX "_landing_page_v_blocks_call_to_action_parent_id_idx" ON "_landing_page_v_blocks_call_to_action" USING btree ("_parent_id");
  CREATE INDEX "_landing_page_v_blocks_call_to_action_path_idx" ON "_landing_page_v_blocks_call_to_action" USING btree ("_path");
  CREATE UNIQUE INDEX "_landing_page_v_blocks_call_to_action_locales_locale_parent_" ON "_landing_page_v_blocks_call_to_action_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_landing_page_v_blocks_call_to_action_locales_parent_id_idx" ON "_landing_page_v_blocks_call_to_action_locales" USING btree ("_parent_id");
  CREATE INDEX "_landing_page_v_version_hero_version_hero_image_idx" ON "_landing_page_v" USING btree ("version_hero_image_id");
  CREATE INDEX "_landing_page_v_version_hero_version_hero_image_mobile_idx" ON "_landing_page_v" USING btree ("version_hero_image_mobile_id");
  CREATE INDEX "_landing_page_v_version_seo_version_seo_og_image_idx" ON "_landing_page_v" USING btree ("version_seo_og_image_id");
  CREATE INDEX "_landing_page_v_version_version_published_by_idx" ON "_landing_page_v" USING btree ("version_published_by_id");
  CREATE INDEX "_landing_page_v_version_version__status_idx" ON "_landing_page_v" USING btree ("version__status");
  CREATE INDEX "_landing_page_v_created_at_idx" ON "_landing_page_v" USING btree ("created_at");
  CREATE INDEX "_landing_page_v_updated_at_idx" ON "_landing_page_v" USING btree ("updated_at");
  CREATE INDEX "_landing_page_v_snapshot_idx" ON "_landing_page_v" USING btree ("snapshot");
  CREATE INDEX "_landing_page_v_published_locale_idx" ON "_landing_page_v" USING btree ("published_locale");
  CREATE INDEX "_landing_page_v_latest_idx" ON "_landing_page_v" USING btree ("latest");
  CREATE UNIQUE INDEX "_landing_page_v_locales_locale_parent_id_unique" ON "_landing_page_v_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_landing_page_v_locales_parent_id_idx" ON "_landing_page_v_locales" USING btree ("_parent_id");
  CREATE INDEX "_landing_page_v_rels_order_idx" ON "_landing_page_v_rels" USING btree ("order");
  CREATE INDEX "_landing_page_v_rels_parent_idx" ON "_landing_page_v_rels" USING btree ("parent_id");
  CREATE INDEX "_landing_page_v_rels_path_idx" ON "_landing_page_v_rels" USING btree ("path");
  CREATE INDEX "_landing_page_v_rels_categories_id_idx" ON "_landing_page_v_rels" USING btree ("categories_id");
  CREATE INDEX "site_settings_social_order_idx" ON "site_settings_social" USING btree ("_order");
  CREATE INDEX "site_settings_social_parent_id_idx" ON "site_settings_social" USING btree ("_parent_id");
  CREATE INDEX "site_settings_logo_idx" ON "site_settings" USING btree ("logo_id");
  CREATE INDEX "site_settings_logo_dark_idx" ON "site_settings" USING btree ("logo_dark_id");
  CREATE UNIQUE INDEX "site_settings_locales_locale_parent_id_unique" ON "site_settings_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "site_settings_locales_parent_id_idx" ON "site_settings_locales" USING btree ("_parent_id");
  CREATE INDEX "site_settings_rels_order_idx" ON "site_settings_rels" USING btree ("order");
  CREATE INDEX "site_settings_rels_parent_idx" ON "site_settings_rels" USING btree ("parent_id");
  CREATE INDEX "site_settings_rels_path_idx" ON "site_settings_rels" USING btree ("path");
  CREATE INDEX "site_settings_rels_personas_id_idx" ON "site_settings_rels" USING btree ("personas_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "users_roles" CASCADE;
  DROP TABLE "users_sessions" CASCADE;
  DROP TABLE "users" CASCADE;
  DROP TABLE "users_rels" CASCADE;
  DROP TABLE "personas" CASCADE;
  DROP TABLE "personas_locales" CASCADE;
  DROP TABLE "categories" CASCADE;
  DROP TABLE "categories_locales" CASCADE;
  DROP TABLE "categories_rels" CASCADE;
  DROP TABLE "option_sets_options" CASCADE;
  DROP TABLE "option_sets_options_locales" CASCADE;
  DROP TABLE "option_sets" CASCADE;
  DROP TABLE "option_sets_locales" CASCADE;
  DROP TABLE "option_sets_rels" CASCADE;
  DROP TABLE "briefs_selections" CASCADE;
  DROP TABLE "briefs" CASCADE;
  DROP TABLE "media" CASCADE;
  DROP TABLE "media_locales" CASCADE;
  DROP TABLE "rate_limits" CASCADE;
  DROP TABLE "payload_kv" CASCADE;
  DROP TABLE "payload_locked_documents" CASCADE;
  DROP TABLE "payload_locked_documents_rels" CASCADE;
  DROP TABLE "payload_preferences" CASCADE;
  DROP TABLE "payload_preferences_rels" CASCADE;
  DROP TABLE "payload_migrations" CASCADE;
  DROP TABLE "landing_page_hero_trust_chips" CASCADE;
  DROP TABLE "landing_page_hero_trust_chips_locales" CASCADE;
  DROP TABLE "landing_page_brief_builder_slots" CASCADE;
  DROP TABLE "landing_page_brief_builder_slots_locales" CASCADE;
  DROP TABLE "landing_page_brief_builder_steps" CASCADE;
  DROP TABLE "landing_page_brief_builder_steps_locales" CASCADE;
  DROP TABLE "landing_page_navigation" CASCADE;
  DROP TABLE "landing_page_navigation_locales" CASCADE;
  DROP TABLE "landing_page_blocks_how_it_works_steps" CASCADE;
  DROP TABLE "landing_page_blocks_how_it_works_steps_locales" CASCADE;
  DROP TABLE "landing_page_blocks_how_it_works" CASCADE;
  DROP TABLE "landing_page_blocks_how_it_works_locales" CASCADE;
  DROP TABLE "landing_page_blocks_features_items" CASCADE;
  DROP TABLE "landing_page_blocks_features_items_locales" CASCADE;
  DROP TABLE "landing_page_blocks_features" CASCADE;
  DROP TABLE "landing_page_blocks_features_locales" CASCADE;
  DROP TABLE "landing_page_blocks_categories_grid" CASCADE;
  DROP TABLE "landing_page_blocks_categories_grid_locales" CASCADE;
  DROP TABLE "landing_page_blocks_persona_band" CASCADE;
  DROP TABLE "landing_page_blocks_persona_band_locales" CASCADE;
  DROP TABLE "landing_page_blocks_faq_items" CASCADE;
  DROP TABLE "landing_page_blocks_faq_items_locales" CASCADE;
  DROP TABLE "landing_page_blocks_faq" CASCADE;
  DROP TABLE "landing_page_blocks_faq_locales" CASCADE;
  DROP TABLE "landing_page_blocks_logo_cloud_logos" CASCADE;
  DROP TABLE "landing_page_blocks_logo_cloud" CASCADE;
  DROP TABLE "landing_page_blocks_logo_cloud_locales" CASCADE;
  DROP TABLE "landing_page_blocks_rich_text" CASCADE;
  DROP TABLE "landing_page_blocks_rich_text_locales" CASCADE;
  DROP TABLE "landing_page_blocks_call_to_action" CASCADE;
  DROP TABLE "landing_page_blocks_call_to_action_locales" CASCADE;
  DROP TABLE "landing_page" CASCADE;
  DROP TABLE "landing_page_locales" CASCADE;
  DROP TABLE "landing_page_rels" CASCADE;
  DROP TABLE "_landing_page_v_version_hero_trust_chips" CASCADE;
  DROP TABLE "_landing_page_v_version_hero_trust_chips_locales" CASCADE;
  DROP TABLE "_landing_page_v_version_brief_builder_slots" CASCADE;
  DROP TABLE "_landing_page_v_version_brief_builder_slots_locales" CASCADE;
  DROP TABLE "_landing_page_v_version_brief_builder_steps" CASCADE;
  DROP TABLE "_landing_page_v_version_brief_builder_steps_locales" CASCADE;
  DROP TABLE "_landing_page_v_version_navigation" CASCADE;
  DROP TABLE "_landing_page_v_version_navigation_locales" CASCADE;
  DROP TABLE "_landing_page_v_blocks_how_it_works_steps" CASCADE;
  DROP TABLE "_landing_page_v_blocks_how_it_works_steps_locales" CASCADE;
  DROP TABLE "_landing_page_v_blocks_how_it_works" CASCADE;
  DROP TABLE "_landing_page_v_blocks_how_it_works_locales" CASCADE;
  DROP TABLE "_landing_page_v_blocks_features_items" CASCADE;
  DROP TABLE "_landing_page_v_blocks_features_items_locales" CASCADE;
  DROP TABLE "_landing_page_v_blocks_features" CASCADE;
  DROP TABLE "_landing_page_v_blocks_features_locales" CASCADE;
  DROP TABLE "_landing_page_v_blocks_categories_grid" CASCADE;
  DROP TABLE "_landing_page_v_blocks_categories_grid_locales" CASCADE;
  DROP TABLE "_landing_page_v_blocks_persona_band" CASCADE;
  DROP TABLE "_landing_page_v_blocks_persona_band_locales" CASCADE;
  DROP TABLE "_landing_page_v_blocks_faq_items" CASCADE;
  DROP TABLE "_landing_page_v_blocks_faq_items_locales" CASCADE;
  DROP TABLE "_landing_page_v_blocks_faq" CASCADE;
  DROP TABLE "_landing_page_v_blocks_faq_locales" CASCADE;
  DROP TABLE "_landing_page_v_blocks_logo_cloud_logos" CASCADE;
  DROP TABLE "_landing_page_v_blocks_logo_cloud" CASCADE;
  DROP TABLE "_landing_page_v_blocks_logo_cloud_locales" CASCADE;
  DROP TABLE "_landing_page_v_blocks_rich_text" CASCADE;
  DROP TABLE "_landing_page_v_blocks_rich_text_locales" CASCADE;
  DROP TABLE "_landing_page_v_blocks_call_to_action" CASCADE;
  DROP TABLE "_landing_page_v_blocks_call_to_action_locales" CASCADE;
  DROP TABLE "_landing_page_v" CASCADE;
  DROP TABLE "_landing_page_v_locales" CASCADE;
  DROP TABLE "_landing_page_v_rels" CASCADE;
  DROP TABLE "site_settings_social" CASCADE;
  DROP TABLE "site_settings" CASCADE;
  DROP TABLE "site_settings_locales" CASCADE;
  DROP TABLE "site_settings_rels" CASCADE;
  DROP TYPE "public"."_locales";
  DROP TYPE "public"."enum_users_roles";
  DROP TYPE "public"."enum_users_account_type";
  DROP TYPE "public"."enum_briefs_status";
  DROP TYPE "public"."enum_briefs_locale";
  DROP TYPE "public"."enum_landing_page_brief_builder_slots_kind";
  DROP TYPE "public"."enum_landing_page_blocks_how_it_works_cta_kind";
  DROP TYPE "public"."enum_landing_page_blocks_categories_grid_source";
  DROP TYPE "public"."enum_landing_page_blocks_categories_grid_cta_kind";
  DROP TYPE "public"."enum_landing_page_blocks_persona_band_layout";
  DROP TYPE "public"."enum_landing_page_blocks_persona_band_cta_kind";
  DROP TYPE "public"."enum_landing_page_blocks_call_to_action_primary_kind";
  DROP TYPE "public"."enum_landing_page_blocks_call_to_action_secondary_kind";
  DROP TYPE "public"."enum_landing_page_hero_layout";
  DROP TYPE "public"."enum_landing_page_hero_primary_cta_kind";
  DROP TYPE "public"."enum_landing_page_hero_secondary_cta_kind";
  DROP TYPE "public"."enum_landing_page_status";
  DROP TYPE "public"."enum__landing_page_v_version_brief_builder_slots_kind";
  DROP TYPE "public"."enum__landing_page_v_blocks_how_it_works_cta_kind";
  DROP TYPE "public"."enum__landing_page_v_blocks_categories_grid_source";
  DROP TYPE "public"."enum__landing_page_v_blocks_categories_grid_cta_kind";
  DROP TYPE "public"."enum__landing_page_v_blocks_persona_band_layout";
  DROP TYPE "public"."enum__landing_page_v_blocks_persona_band_cta_kind";
  DROP TYPE "public"."enum__landing_page_v_blocks_call_to_action_primary_kind";
  DROP TYPE "public"."enum__landing_page_v_blocks_call_to_action_secondary_kind";
  DROP TYPE "public"."enum__landing_page_v_version_hero_layout";
  DROP TYPE "public"."enum__landing_page_v_version_hero_primary_cta_kind";
  DROP TYPE "public"."enum__landing_page_v_version_hero_secondary_cta_kind";
  DROP TYPE "public"."enum__landing_page_v_version_status";
  DROP TYPE "public"."enum__landing_page_v_published_locale";
  DROP TYPE "public"."enum_site_settings_social_platform";`)
}
