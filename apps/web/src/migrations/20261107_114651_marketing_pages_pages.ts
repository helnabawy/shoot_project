import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_pages_blocks_how_it_works_cta_kind" AS ENUM('whatsapp', 'link', 'call');
  CREATE TYPE "public"."enum_pages_blocks_categories_grid_source" AS ENUM('active', 'manual');
  CREATE TYPE "public"."enum_pages_blocks_categories_grid_cta_kind" AS ENUM('whatsapp', 'link', 'call');
  CREATE TYPE "public"."enum_pages_blocks_creator_network_rule" AS ENUM('featuredThenNewest', 'newest', 'featuredOnly');
  CREATE TYPE "public"."enum_pages_blocks_creator_network_cta_kind" AS ENUM('whatsapp', 'link', 'call');
  CREATE TYPE "public"."enum_pages_blocks_persona_band_layout" AS ENUM('combined', 'perPersona');
  CREATE TYPE "public"."enum_pages_blocks_persona_band_cta_kind" AS ENUM('whatsapp', 'link', 'call');
  CREATE TYPE "public"."enum_pages_blocks_call_to_action_primary_kind" AS ENUM('whatsapp', 'link', 'call');
  CREATE TYPE "public"."enum_pages_blocks_call_to_action_secondary_kind" AS ENUM('whatsapp', 'link', 'call');
  CREATE TYPE "public"."enum_pages_previous_slugs_locale" AS ENUM('en', 'ar');
  CREATE TYPE "public"."enum_pages_kind" AS ENUM('standard', 'intent');
  CREATE TYPE "public"."enum_pages_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__pages_v_blocks_how_it_works_cta_kind" AS ENUM('whatsapp', 'link', 'call');
  CREATE TYPE "public"."enum__pages_v_blocks_categories_grid_source" AS ENUM('active', 'manual');
  CREATE TYPE "public"."enum__pages_v_blocks_categories_grid_cta_kind" AS ENUM('whatsapp', 'link', 'call');
  CREATE TYPE "public"."enum__pages_v_blocks_creator_network_rule" AS ENUM('featuredThenNewest', 'newest', 'featuredOnly');
  CREATE TYPE "public"."enum__pages_v_blocks_creator_network_cta_kind" AS ENUM('whatsapp', 'link', 'call');
  CREATE TYPE "public"."enum__pages_v_blocks_persona_band_layout" AS ENUM('combined', 'perPersona');
  CREATE TYPE "public"."enum__pages_v_blocks_persona_band_cta_kind" AS ENUM('whatsapp', 'link', 'call');
  CREATE TYPE "public"."enum__pages_v_blocks_call_to_action_primary_kind" AS ENUM('whatsapp', 'link', 'call');
  CREATE TYPE "public"."enum__pages_v_blocks_call_to_action_secondary_kind" AS ENUM('whatsapp', 'link', 'call');
  CREATE TYPE "public"."enum__pages_v_version_previous_slugs_locale" AS ENUM('en', 'ar');
  CREATE TYPE "public"."enum__pages_v_version_kind" AS ENUM('standard', 'intent');
  CREATE TYPE "public"."enum__pages_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__pages_v_published_locale" AS ENUM('en', 'ar');
  CREATE TYPE "public"."enum_removed_paths_kind" AS ENUM('page', 'article');
  CREATE TYPE "public"."enum_removed_paths_locale" AS ENUM('en', 'ar');
  CREATE TABLE "pages_blocks_how_it_works_steps" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "pages_blocks_how_it_works_steps_locales" (
  	"title" varchar,
  	"body" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "pages_blocks_how_it_works" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"anchor" varchar DEFAULT 'how-it-works',
  	"cta_kind" "enum_pages_blocks_how_it_works_cta_kind" DEFAULT 'whatsapp',
  	"cta_href" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "pages_blocks_how_it_works_locales" (
  	"heading" varchar,
  	"subheading" varchar,
  	"cta_label" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "pages_blocks_features_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "pages_blocks_features_items_locales" (
  	"title" varchar,
  	"body" varchar,
  	"glyph" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "pages_blocks_features" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"anchor" varchar DEFAULT 'why-us',
  	"block_name" varchar
  );
  
  CREATE TABLE "pages_blocks_features_locales" (
  	"heading" varchar,
  	"subheading" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "pages_blocks_categories_grid" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"anchor" varchar DEFAULT 'specialties',
  	"source" "enum_pages_blocks_categories_grid_source" DEFAULT 'active',
  	"cta_kind" "enum_pages_blocks_categories_grid_cta_kind" DEFAULT 'whatsapp',
  	"cta_href" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "pages_blocks_categories_grid_locales" (
  	"heading" varchar,
  	"subheading" varchar,
  	"cta_label" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "pages_blocks_creator_network" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"anchor" varchar DEFAULT 'our-network',
  	"rule" "enum_pages_blocks_creator_network_rule" DEFAULT 'featuredThenNewest',
  	"count" numeric DEFAULT 6,
  	"cta_kind" "enum_pages_blocks_creator_network_cta_kind" DEFAULT 'whatsapp',
  	"cta_href" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "pages_blocks_creator_network_locales" (
  	"heading" varchar,
  	"subheading" varchar,
  	"cta_label" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "pages_blocks_persona_band" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"anchor" varchar DEFAULT 'for-professionals',
  	"layout" "enum_pages_blocks_persona_band_layout" DEFAULT 'combined',
  	"cta_kind" "enum_pages_blocks_persona_band_cta_kind" DEFAULT 'whatsapp',
  	"cta_href" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "pages_blocks_persona_band_locales" (
  	"heading" varchar,
  	"body" varchar,
  	"cta_label" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "pages_blocks_faq_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "pages_blocks_faq_items_locales" (
  	"question" varchar,
  	"answer" jsonb,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "pages_blocks_faq" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"anchor" varchar DEFAULT 'faq',
  	"block_name" varchar
  );
  
  CREATE TABLE "pages_blocks_faq_locales" (
  	"heading" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "pages_blocks_logo_cloud_logos" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"name" varchar,
  	"image_id" integer,
  	"image_dark_id" integer
  );
  
  CREATE TABLE "pages_blocks_logo_cloud" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"anchor" varchar DEFAULT 'trusted-by',
  	"block_name" varchar
  );
  
  CREATE TABLE "pages_blocks_logo_cloud_locales" (
  	"heading" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "pages_blocks_rich_text" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"anchor" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "pages_blocks_rich_text_locales" (
  	"content" jsonb,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "pages_blocks_call_to_action" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"anchor" varchar,
  	"primary_kind" "enum_pages_blocks_call_to_action_primary_kind" DEFAULT 'whatsapp',
  	"primary_href" varchar,
  	"secondary_kind" "enum_pages_blocks_call_to_action_secondary_kind" DEFAULT 'whatsapp',
  	"secondary_href" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "pages_blocks_call_to_action_locales" (
  	"heading" varchar,
  	"body" varchar,
  	"primary_label" varchar,
  	"secondary_label" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "pages_previous_slugs" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"locale" "enum_pages_previous_slugs_locale",
  	"slug" varchar
  );
  
  CREATE TABLE "pages" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"kind" "enum_pages_kind" DEFAULT 'standard',
  	"placement_in_header" boolean DEFAULT false,
  	"placement_footer_group" varchar,
  	"placement_order" numeric DEFAULT 100,
  	"seo_og_image_id" integer,
  	"seo_hide_from_search" boolean DEFAULT false,
  	"published_at" timestamp(3) with time zone,
  	"published_by_id" integer,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"_status" "enum_pages_status" DEFAULT 'draft'
  );
  
  CREATE TABLE "pages_locales" (
  	"title" varchar,
  	"slug" varchar,
  	"placement_nav_label" varchar,
  	"seo_title" varchar,
  	"seo_description" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "pages_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"categories_id" integer
  );
  
  CREATE TABLE "_pages_v_blocks_how_it_works_steps" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_how_it_works_steps_locales" (
  	"title" varchar,
  	"body" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_pages_v_blocks_how_it_works" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"anchor" varchar DEFAULT 'how-it-works',
  	"cta_kind" "enum__pages_v_blocks_how_it_works_cta_kind" DEFAULT 'whatsapp',
  	"cta_href" varchar,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_how_it_works_locales" (
  	"heading" varchar,
  	"subheading" varchar,
  	"cta_label" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_pages_v_blocks_features_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_features_items_locales" (
  	"title" varchar,
  	"body" varchar,
  	"glyph" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_pages_v_blocks_features" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"anchor" varchar DEFAULT 'why-us',
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_features_locales" (
  	"heading" varchar,
  	"subheading" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_pages_v_blocks_categories_grid" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"anchor" varchar DEFAULT 'specialties',
  	"source" "enum__pages_v_blocks_categories_grid_source" DEFAULT 'active',
  	"cta_kind" "enum__pages_v_blocks_categories_grid_cta_kind" DEFAULT 'whatsapp',
  	"cta_href" varchar,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_categories_grid_locales" (
  	"heading" varchar,
  	"subheading" varchar,
  	"cta_label" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_pages_v_blocks_creator_network" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"anchor" varchar DEFAULT 'our-network',
  	"rule" "enum__pages_v_blocks_creator_network_rule" DEFAULT 'featuredThenNewest',
  	"count" numeric DEFAULT 6,
  	"cta_kind" "enum__pages_v_blocks_creator_network_cta_kind" DEFAULT 'whatsapp',
  	"cta_href" varchar,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_creator_network_locales" (
  	"heading" varchar,
  	"subheading" varchar,
  	"cta_label" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_pages_v_blocks_persona_band" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"anchor" varchar DEFAULT 'for-professionals',
  	"layout" "enum__pages_v_blocks_persona_band_layout" DEFAULT 'combined',
  	"cta_kind" "enum__pages_v_blocks_persona_band_cta_kind" DEFAULT 'whatsapp',
  	"cta_href" varchar,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_persona_band_locales" (
  	"heading" varchar,
  	"body" varchar,
  	"cta_label" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_pages_v_blocks_faq_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_faq_items_locales" (
  	"question" varchar,
  	"answer" jsonb,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_pages_v_blocks_faq" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"anchor" varchar DEFAULT 'faq',
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_faq_locales" (
  	"heading" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_pages_v_blocks_logo_cloud_logos" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar,
  	"image_id" integer,
  	"image_dark_id" integer,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_logo_cloud" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"anchor" varchar DEFAULT 'trusted-by',
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_logo_cloud_locales" (
  	"heading" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_pages_v_blocks_rich_text" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"anchor" varchar,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_rich_text_locales" (
  	"content" jsonb,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_pages_v_blocks_call_to_action" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"anchor" varchar,
  	"primary_kind" "enum__pages_v_blocks_call_to_action_primary_kind" DEFAULT 'whatsapp',
  	"primary_href" varchar,
  	"secondary_kind" "enum__pages_v_blocks_call_to_action_secondary_kind" DEFAULT 'whatsapp',
  	"secondary_href" varchar,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_call_to_action_locales" (
  	"heading" varchar,
  	"body" varchar,
  	"primary_label" varchar,
  	"secondary_label" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_pages_v_version_previous_slugs" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"locale" "enum__pages_v_version_previous_slugs_locale",
  	"slug" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_pages_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_kind" "enum__pages_v_version_kind" DEFAULT 'standard',
  	"version_placement_in_header" boolean DEFAULT false,
  	"version_placement_footer_group" varchar,
  	"version_placement_order" numeric DEFAULT 100,
  	"version_seo_og_image_id" integer,
  	"version_seo_hide_from_search" boolean DEFAULT false,
  	"version_published_at" timestamp(3) with time zone,
  	"version_published_by_id" integer,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version__status" "enum__pages_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"snapshot" boolean,
  	"published_locale" "enum__pages_v_published_locale",
  	"latest" boolean
  );
  
  CREATE TABLE "_pages_v_locales" (
  	"version_title" varchar,
  	"version_slug" varchar,
  	"version_placement_nav_label" varchar,
  	"version_seo_title" varchar,
  	"version_seo_description" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_pages_v_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"categories_id" integer
  );
  
  CREATE TABLE "removed_paths" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"kind" "enum_removed_paths_kind" NOT NULL,
  	"locale" "enum_removed_paths_locale" NOT NULL,
  	"path" varchar NOT NULL,
  	"removed_at" timestamp(3) with time zone NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "site_settings_footer_groups" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"key" varchar NOT NULL
  );
  
  CREATE TABLE "site_settings_footer_groups_locales" (
  	"label" varchar NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "pages_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "removed_paths_id" integer;
  ALTER TABLE "pages_blocks_how_it_works_steps" ADD CONSTRAINT "pages_blocks_how_it_works_steps_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blocks_how_it_works"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_how_it_works_steps_locales" ADD CONSTRAINT "pages_blocks_how_it_works_steps_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blocks_how_it_works_steps"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_how_it_works" ADD CONSTRAINT "pages_blocks_how_it_works_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_how_it_works_locales" ADD CONSTRAINT "pages_blocks_how_it_works_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blocks_how_it_works"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_features_items" ADD CONSTRAINT "pages_blocks_features_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blocks_features"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_features_items_locales" ADD CONSTRAINT "pages_blocks_features_items_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blocks_features_items"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_features" ADD CONSTRAINT "pages_blocks_features_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_features_locales" ADD CONSTRAINT "pages_blocks_features_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blocks_features"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_categories_grid" ADD CONSTRAINT "pages_blocks_categories_grid_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_categories_grid_locales" ADD CONSTRAINT "pages_blocks_categories_grid_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blocks_categories_grid"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_creator_network" ADD CONSTRAINT "pages_blocks_creator_network_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_creator_network_locales" ADD CONSTRAINT "pages_blocks_creator_network_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blocks_creator_network"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_persona_band" ADD CONSTRAINT "pages_blocks_persona_band_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_persona_band_locales" ADD CONSTRAINT "pages_blocks_persona_band_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blocks_persona_band"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_faq_items" ADD CONSTRAINT "pages_blocks_faq_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blocks_faq"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_faq_items_locales" ADD CONSTRAINT "pages_blocks_faq_items_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blocks_faq_items"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_faq" ADD CONSTRAINT "pages_blocks_faq_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_faq_locales" ADD CONSTRAINT "pages_blocks_faq_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blocks_faq"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_logo_cloud_logos" ADD CONSTRAINT "pages_blocks_logo_cloud_logos_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "pages_blocks_logo_cloud_logos" ADD CONSTRAINT "pages_blocks_logo_cloud_logos_image_dark_id_media_id_fk" FOREIGN KEY ("image_dark_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "pages_blocks_logo_cloud_logos" ADD CONSTRAINT "pages_blocks_logo_cloud_logos_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blocks_logo_cloud"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_logo_cloud" ADD CONSTRAINT "pages_blocks_logo_cloud_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_logo_cloud_locales" ADD CONSTRAINT "pages_blocks_logo_cloud_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blocks_logo_cloud"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_rich_text" ADD CONSTRAINT "pages_blocks_rich_text_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_rich_text_locales" ADD CONSTRAINT "pages_blocks_rich_text_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blocks_rich_text"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_call_to_action" ADD CONSTRAINT "pages_blocks_call_to_action_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_call_to_action_locales" ADD CONSTRAINT "pages_blocks_call_to_action_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blocks_call_to_action"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_previous_slugs" ADD CONSTRAINT "pages_previous_slugs_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages" ADD CONSTRAINT "pages_seo_og_image_id_media_id_fk" FOREIGN KEY ("seo_og_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "pages" ADD CONSTRAINT "pages_published_by_id_users_id_fk" FOREIGN KEY ("published_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "pages_locales" ADD CONSTRAINT "pages_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_rels" ADD CONSTRAINT "pages_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_rels" ADD CONSTRAINT "pages_rels_categories_fk" FOREIGN KEY ("categories_id") REFERENCES "public"."categories"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_how_it_works_steps" ADD CONSTRAINT "_pages_v_blocks_how_it_works_steps_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v_blocks_how_it_works"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_how_it_works_steps_locales" ADD CONSTRAINT "_pages_v_blocks_how_it_works_steps_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v_blocks_how_it_works_steps"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_how_it_works" ADD CONSTRAINT "_pages_v_blocks_how_it_works_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_how_it_works_locales" ADD CONSTRAINT "_pages_v_blocks_how_it_works_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v_blocks_how_it_works"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_features_items" ADD CONSTRAINT "_pages_v_blocks_features_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v_blocks_features"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_features_items_locales" ADD CONSTRAINT "_pages_v_blocks_features_items_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v_blocks_features_items"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_features" ADD CONSTRAINT "_pages_v_blocks_features_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_features_locales" ADD CONSTRAINT "_pages_v_blocks_features_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v_blocks_features"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_categories_grid" ADD CONSTRAINT "_pages_v_blocks_categories_grid_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_categories_grid_locales" ADD CONSTRAINT "_pages_v_blocks_categories_grid_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v_blocks_categories_grid"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_creator_network" ADD CONSTRAINT "_pages_v_blocks_creator_network_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_creator_network_locales" ADD CONSTRAINT "_pages_v_blocks_creator_network_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v_blocks_creator_network"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_persona_band" ADD CONSTRAINT "_pages_v_blocks_persona_band_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_persona_band_locales" ADD CONSTRAINT "_pages_v_blocks_persona_band_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v_blocks_persona_band"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_faq_items" ADD CONSTRAINT "_pages_v_blocks_faq_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v_blocks_faq"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_faq_items_locales" ADD CONSTRAINT "_pages_v_blocks_faq_items_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v_blocks_faq_items"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_faq" ADD CONSTRAINT "_pages_v_blocks_faq_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_faq_locales" ADD CONSTRAINT "_pages_v_blocks_faq_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v_blocks_faq"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_logo_cloud_logos" ADD CONSTRAINT "_pages_v_blocks_logo_cloud_logos_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_logo_cloud_logos" ADD CONSTRAINT "_pages_v_blocks_logo_cloud_logos_image_dark_id_media_id_fk" FOREIGN KEY ("image_dark_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_logo_cloud_logos" ADD CONSTRAINT "_pages_v_blocks_logo_cloud_logos_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v_blocks_logo_cloud"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_logo_cloud" ADD CONSTRAINT "_pages_v_blocks_logo_cloud_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_logo_cloud_locales" ADD CONSTRAINT "_pages_v_blocks_logo_cloud_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v_blocks_logo_cloud"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_rich_text" ADD CONSTRAINT "_pages_v_blocks_rich_text_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_rich_text_locales" ADD CONSTRAINT "_pages_v_blocks_rich_text_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v_blocks_rich_text"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_call_to_action" ADD CONSTRAINT "_pages_v_blocks_call_to_action_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_call_to_action_locales" ADD CONSTRAINT "_pages_v_blocks_call_to_action_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v_blocks_call_to_action"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_version_previous_slugs" ADD CONSTRAINT "_pages_v_version_previous_slugs_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v" ADD CONSTRAINT "_pages_v_parent_id_pages_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."pages"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_pages_v" ADD CONSTRAINT "_pages_v_version_seo_og_image_id_media_id_fk" FOREIGN KEY ("version_seo_og_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_pages_v" ADD CONSTRAINT "_pages_v_version_published_by_id_users_id_fk" FOREIGN KEY ("version_published_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_pages_v_locales" ADD CONSTRAINT "_pages_v_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_rels" ADD CONSTRAINT "_pages_v_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_rels" ADD CONSTRAINT "_pages_v_rels_categories_fk" FOREIGN KEY ("categories_id") REFERENCES "public"."categories"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "site_settings_footer_groups" ADD CONSTRAINT "site_settings_footer_groups_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."site_settings"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "site_settings_footer_groups_locales" ADD CONSTRAINT "site_settings_footer_groups_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."site_settings_footer_groups"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "pages_blocks_how_it_works_steps_order_idx" ON "pages_blocks_how_it_works_steps" USING btree ("_order");
  CREATE INDEX "pages_blocks_how_it_works_steps_parent_id_idx" ON "pages_blocks_how_it_works_steps" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "pages_blocks_how_it_works_steps_locales_locale_parent_id_uni" ON "pages_blocks_how_it_works_steps_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "pages_blocks_how_it_works_steps_locales_parent_id_idx" ON "pages_blocks_how_it_works_steps_locales" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_how_it_works_order_idx" ON "pages_blocks_how_it_works" USING btree ("_order");
  CREATE INDEX "pages_blocks_how_it_works_parent_id_idx" ON "pages_blocks_how_it_works" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_how_it_works_path_idx" ON "pages_blocks_how_it_works" USING btree ("_path");
  CREATE UNIQUE INDEX "pages_blocks_how_it_works_locales_locale_parent_id_unique" ON "pages_blocks_how_it_works_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "pages_blocks_how_it_works_locales_parent_id_idx" ON "pages_blocks_how_it_works_locales" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_features_items_order_idx" ON "pages_blocks_features_items" USING btree ("_order");
  CREATE INDEX "pages_blocks_features_items_parent_id_idx" ON "pages_blocks_features_items" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "pages_blocks_features_items_locales_locale_parent_id_unique" ON "pages_blocks_features_items_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "pages_blocks_features_items_locales_parent_id_idx" ON "pages_blocks_features_items_locales" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_features_order_idx" ON "pages_blocks_features" USING btree ("_order");
  CREATE INDEX "pages_blocks_features_parent_id_idx" ON "pages_blocks_features" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_features_path_idx" ON "pages_blocks_features" USING btree ("_path");
  CREATE UNIQUE INDEX "pages_blocks_features_locales_locale_parent_id_unique" ON "pages_blocks_features_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "pages_blocks_features_locales_parent_id_idx" ON "pages_blocks_features_locales" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_categories_grid_order_idx" ON "pages_blocks_categories_grid" USING btree ("_order");
  CREATE INDEX "pages_blocks_categories_grid_parent_id_idx" ON "pages_blocks_categories_grid" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_categories_grid_path_idx" ON "pages_blocks_categories_grid" USING btree ("_path");
  CREATE UNIQUE INDEX "pages_blocks_categories_grid_locales_locale_parent_id_unique" ON "pages_blocks_categories_grid_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "pages_blocks_categories_grid_locales_parent_id_idx" ON "pages_blocks_categories_grid_locales" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_creator_network_order_idx" ON "pages_blocks_creator_network" USING btree ("_order");
  CREATE INDEX "pages_blocks_creator_network_parent_id_idx" ON "pages_blocks_creator_network" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_creator_network_path_idx" ON "pages_blocks_creator_network" USING btree ("_path");
  CREATE UNIQUE INDEX "pages_blocks_creator_network_locales_locale_parent_id_unique" ON "pages_blocks_creator_network_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "pages_blocks_creator_network_locales_parent_id_idx" ON "pages_blocks_creator_network_locales" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_persona_band_order_idx" ON "pages_blocks_persona_band" USING btree ("_order");
  CREATE INDEX "pages_blocks_persona_band_parent_id_idx" ON "pages_blocks_persona_band" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_persona_band_path_idx" ON "pages_blocks_persona_band" USING btree ("_path");
  CREATE UNIQUE INDEX "pages_blocks_persona_band_locales_locale_parent_id_unique" ON "pages_blocks_persona_band_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "pages_blocks_persona_band_locales_parent_id_idx" ON "pages_blocks_persona_band_locales" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_faq_items_order_idx" ON "pages_blocks_faq_items" USING btree ("_order");
  CREATE INDEX "pages_blocks_faq_items_parent_id_idx" ON "pages_blocks_faq_items" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "pages_blocks_faq_items_locales_locale_parent_id_unique" ON "pages_blocks_faq_items_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "pages_blocks_faq_items_locales_parent_id_idx" ON "pages_blocks_faq_items_locales" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_faq_order_idx" ON "pages_blocks_faq" USING btree ("_order");
  CREATE INDEX "pages_blocks_faq_parent_id_idx" ON "pages_blocks_faq" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_faq_path_idx" ON "pages_blocks_faq" USING btree ("_path");
  CREATE UNIQUE INDEX "pages_blocks_faq_locales_locale_parent_id_unique" ON "pages_blocks_faq_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "pages_blocks_faq_locales_parent_id_idx" ON "pages_blocks_faq_locales" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_logo_cloud_logos_order_idx" ON "pages_blocks_logo_cloud_logos" USING btree ("_order");
  CREATE INDEX "pages_blocks_logo_cloud_logos_parent_id_idx" ON "pages_blocks_logo_cloud_logos" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_logo_cloud_logos_image_idx" ON "pages_blocks_logo_cloud_logos" USING btree ("image_id");
  CREATE INDEX "pages_blocks_logo_cloud_logos_image_dark_idx" ON "pages_blocks_logo_cloud_logos" USING btree ("image_dark_id");
  CREATE INDEX "pages_blocks_logo_cloud_order_idx" ON "pages_blocks_logo_cloud" USING btree ("_order");
  CREATE INDEX "pages_blocks_logo_cloud_parent_id_idx" ON "pages_blocks_logo_cloud" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_logo_cloud_path_idx" ON "pages_blocks_logo_cloud" USING btree ("_path");
  CREATE UNIQUE INDEX "pages_blocks_logo_cloud_locales_locale_parent_id_unique" ON "pages_blocks_logo_cloud_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "pages_blocks_logo_cloud_locales_parent_id_idx" ON "pages_blocks_logo_cloud_locales" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_rich_text_order_idx" ON "pages_blocks_rich_text" USING btree ("_order");
  CREATE INDEX "pages_blocks_rich_text_parent_id_idx" ON "pages_blocks_rich_text" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_rich_text_path_idx" ON "pages_blocks_rich_text" USING btree ("_path");
  CREATE UNIQUE INDEX "pages_blocks_rich_text_locales_locale_parent_id_unique" ON "pages_blocks_rich_text_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "pages_blocks_rich_text_locales_parent_id_idx" ON "pages_blocks_rich_text_locales" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_call_to_action_order_idx" ON "pages_blocks_call_to_action" USING btree ("_order");
  CREATE INDEX "pages_blocks_call_to_action_parent_id_idx" ON "pages_blocks_call_to_action" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_call_to_action_path_idx" ON "pages_blocks_call_to_action" USING btree ("_path");
  CREATE UNIQUE INDEX "pages_blocks_call_to_action_locales_locale_parent_id_unique" ON "pages_blocks_call_to_action_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "pages_blocks_call_to_action_locales_parent_id_idx" ON "pages_blocks_call_to_action_locales" USING btree ("_parent_id");
  CREATE INDEX "pages_previous_slugs_order_idx" ON "pages_previous_slugs" USING btree ("_order");
  CREATE INDEX "pages_previous_slugs_parent_id_idx" ON "pages_previous_slugs" USING btree ("_parent_id");
  CREATE INDEX "pages_seo_seo_og_image_idx" ON "pages" USING btree ("seo_og_image_id");
  CREATE INDEX "pages_published_by_idx" ON "pages" USING btree ("published_by_id");
  CREATE INDEX "pages_updated_at_idx" ON "pages" USING btree ("updated_at");
  CREATE INDEX "pages_created_at_idx" ON "pages" USING btree ("created_at");
  CREATE INDEX "pages__status_idx" ON "pages" USING btree ("_status");
  CREATE INDEX "pages_slug_idx" ON "pages_locales" USING btree ("slug","_locale");
  CREATE UNIQUE INDEX "pages_locales_locale_parent_id_unique" ON "pages_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "pages_locales_parent_id_idx" ON "pages_locales" USING btree ("_parent_id");
  CREATE INDEX "pages_rels_order_idx" ON "pages_rels" USING btree ("order");
  CREATE INDEX "pages_rels_parent_idx" ON "pages_rels" USING btree ("parent_id");
  CREATE INDEX "pages_rels_path_idx" ON "pages_rels" USING btree ("path");
  CREATE INDEX "pages_rels_categories_id_idx" ON "pages_rels" USING btree ("categories_id");
  CREATE INDEX "_pages_v_blocks_how_it_works_steps_order_idx" ON "_pages_v_blocks_how_it_works_steps" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_how_it_works_steps_parent_id_idx" ON "_pages_v_blocks_how_it_works_steps" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "_pages_v_blocks_how_it_works_steps_locales_locale_parent_id_" ON "_pages_v_blocks_how_it_works_steps_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_pages_v_blocks_how_it_works_steps_locales_parent_id_idx" ON "_pages_v_blocks_how_it_works_steps_locales" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_how_it_works_order_idx" ON "_pages_v_blocks_how_it_works" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_how_it_works_parent_id_idx" ON "_pages_v_blocks_how_it_works" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_how_it_works_path_idx" ON "_pages_v_blocks_how_it_works" USING btree ("_path");
  CREATE UNIQUE INDEX "_pages_v_blocks_how_it_works_locales_locale_parent_id_unique" ON "_pages_v_blocks_how_it_works_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_pages_v_blocks_how_it_works_locales_parent_id_idx" ON "_pages_v_blocks_how_it_works_locales" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_features_items_order_idx" ON "_pages_v_blocks_features_items" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_features_items_parent_id_idx" ON "_pages_v_blocks_features_items" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "_pages_v_blocks_features_items_locales_locale_parent_id_uniq" ON "_pages_v_blocks_features_items_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_pages_v_blocks_features_items_locales_parent_id_idx" ON "_pages_v_blocks_features_items_locales" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_features_order_idx" ON "_pages_v_blocks_features" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_features_parent_id_idx" ON "_pages_v_blocks_features" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_features_path_idx" ON "_pages_v_blocks_features" USING btree ("_path");
  CREATE UNIQUE INDEX "_pages_v_blocks_features_locales_locale_parent_id_unique" ON "_pages_v_blocks_features_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_pages_v_blocks_features_locales_parent_id_idx" ON "_pages_v_blocks_features_locales" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_categories_grid_order_idx" ON "_pages_v_blocks_categories_grid" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_categories_grid_parent_id_idx" ON "_pages_v_blocks_categories_grid" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_categories_grid_path_idx" ON "_pages_v_blocks_categories_grid" USING btree ("_path");
  CREATE UNIQUE INDEX "_pages_v_blocks_categories_grid_locales_locale_parent_id_uni" ON "_pages_v_blocks_categories_grid_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_pages_v_blocks_categories_grid_locales_parent_id_idx" ON "_pages_v_blocks_categories_grid_locales" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_creator_network_order_idx" ON "_pages_v_blocks_creator_network" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_creator_network_parent_id_idx" ON "_pages_v_blocks_creator_network" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_creator_network_path_idx" ON "_pages_v_blocks_creator_network" USING btree ("_path");
  CREATE UNIQUE INDEX "_pages_v_blocks_creator_network_locales_locale_parent_id_uni" ON "_pages_v_blocks_creator_network_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_pages_v_blocks_creator_network_locales_parent_id_idx" ON "_pages_v_blocks_creator_network_locales" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_persona_band_order_idx" ON "_pages_v_blocks_persona_band" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_persona_band_parent_id_idx" ON "_pages_v_blocks_persona_band" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_persona_band_path_idx" ON "_pages_v_blocks_persona_band" USING btree ("_path");
  CREATE UNIQUE INDEX "_pages_v_blocks_persona_band_locales_locale_parent_id_unique" ON "_pages_v_blocks_persona_band_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_pages_v_blocks_persona_band_locales_parent_id_idx" ON "_pages_v_blocks_persona_band_locales" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_faq_items_order_idx" ON "_pages_v_blocks_faq_items" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_faq_items_parent_id_idx" ON "_pages_v_blocks_faq_items" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "_pages_v_blocks_faq_items_locales_locale_parent_id_unique" ON "_pages_v_blocks_faq_items_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_pages_v_blocks_faq_items_locales_parent_id_idx" ON "_pages_v_blocks_faq_items_locales" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_faq_order_idx" ON "_pages_v_blocks_faq" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_faq_parent_id_idx" ON "_pages_v_blocks_faq" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_faq_path_idx" ON "_pages_v_blocks_faq" USING btree ("_path");
  CREATE UNIQUE INDEX "_pages_v_blocks_faq_locales_locale_parent_id_unique" ON "_pages_v_blocks_faq_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_pages_v_blocks_faq_locales_parent_id_idx" ON "_pages_v_blocks_faq_locales" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_logo_cloud_logos_order_idx" ON "_pages_v_blocks_logo_cloud_logos" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_logo_cloud_logos_parent_id_idx" ON "_pages_v_blocks_logo_cloud_logos" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_logo_cloud_logos_image_idx" ON "_pages_v_blocks_logo_cloud_logos" USING btree ("image_id");
  CREATE INDEX "_pages_v_blocks_logo_cloud_logos_image_dark_idx" ON "_pages_v_blocks_logo_cloud_logos" USING btree ("image_dark_id");
  CREATE INDEX "_pages_v_blocks_logo_cloud_order_idx" ON "_pages_v_blocks_logo_cloud" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_logo_cloud_parent_id_idx" ON "_pages_v_blocks_logo_cloud" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_logo_cloud_path_idx" ON "_pages_v_blocks_logo_cloud" USING btree ("_path");
  CREATE UNIQUE INDEX "_pages_v_blocks_logo_cloud_locales_locale_parent_id_unique" ON "_pages_v_blocks_logo_cloud_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_pages_v_blocks_logo_cloud_locales_parent_id_idx" ON "_pages_v_blocks_logo_cloud_locales" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_rich_text_order_idx" ON "_pages_v_blocks_rich_text" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_rich_text_parent_id_idx" ON "_pages_v_blocks_rich_text" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_rich_text_path_idx" ON "_pages_v_blocks_rich_text" USING btree ("_path");
  CREATE UNIQUE INDEX "_pages_v_blocks_rich_text_locales_locale_parent_id_unique" ON "_pages_v_blocks_rich_text_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_pages_v_blocks_rich_text_locales_parent_id_idx" ON "_pages_v_blocks_rich_text_locales" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_call_to_action_order_idx" ON "_pages_v_blocks_call_to_action" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_call_to_action_parent_id_idx" ON "_pages_v_blocks_call_to_action" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_call_to_action_path_idx" ON "_pages_v_blocks_call_to_action" USING btree ("_path");
  CREATE UNIQUE INDEX "_pages_v_blocks_call_to_action_locales_locale_parent_id_uniq" ON "_pages_v_blocks_call_to_action_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_pages_v_blocks_call_to_action_locales_parent_id_idx" ON "_pages_v_blocks_call_to_action_locales" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_version_previous_slugs_order_idx" ON "_pages_v_version_previous_slugs" USING btree ("_order");
  CREATE INDEX "_pages_v_version_previous_slugs_parent_id_idx" ON "_pages_v_version_previous_slugs" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_parent_idx" ON "_pages_v" USING btree ("parent_id");
  CREATE INDEX "_pages_v_version_seo_version_seo_og_image_idx" ON "_pages_v" USING btree ("version_seo_og_image_id");
  CREATE INDEX "_pages_v_version_version_published_by_idx" ON "_pages_v" USING btree ("version_published_by_id");
  CREATE INDEX "_pages_v_version_version_updated_at_idx" ON "_pages_v" USING btree ("version_updated_at");
  CREATE INDEX "_pages_v_version_version_created_at_idx" ON "_pages_v" USING btree ("version_created_at");
  CREATE INDEX "_pages_v_version_version__status_idx" ON "_pages_v" USING btree ("version__status");
  CREATE INDEX "_pages_v_created_at_idx" ON "_pages_v" USING btree ("created_at");
  CREATE INDEX "_pages_v_updated_at_idx" ON "_pages_v" USING btree ("updated_at");
  CREATE INDEX "_pages_v_snapshot_idx" ON "_pages_v" USING btree ("snapshot");
  CREATE INDEX "_pages_v_published_locale_idx" ON "_pages_v" USING btree ("published_locale");
  CREATE INDEX "_pages_v_latest_idx" ON "_pages_v" USING btree ("latest");
  CREATE INDEX "_pages_v_version_version_slug_idx" ON "_pages_v_locales" USING btree ("version_slug","_locale");
  CREATE UNIQUE INDEX "_pages_v_locales_locale_parent_id_unique" ON "_pages_v_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_pages_v_locales_parent_id_idx" ON "_pages_v_locales" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_rels_order_idx" ON "_pages_v_rels" USING btree ("order");
  CREATE INDEX "_pages_v_rels_parent_idx" ON "_pages_v_rels" USING btree ("parent_id");
  CREATE INDEX "_pages_v_rels_path_idx" ON "_pages_v_rels" USING btree ("path");
  CREATE INDEX "_pages_v_rels_categories_id_idx" ON "_pages_v_rels" USING btree ("categories_id");
  CREATE INDEX "removed_paths_locale_idx" ON "removed_paths" USING btree ("locale");
  CREATE INDEX "removed_paths_path_idx" ON "removed_paths" USING btree ("path");
  CREATE INDEX "removed_paths_updated_at_idx" ON "removed_paths" USING btree ("updated_at");
  CREATE INDEX "removed_paths_created_at_idx" ON "removed_paths" USING btree ("created_at");
  CREATE INDEX "site_settings_footer_groups_order_idx" ON "site_settings_footer_groups" USING btree ("_order");
  CREATE INDEX "site_settings_footer_groups_parent_id_idx" ON "site_settings_footer_groups" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "site_settings_footer_groups_locales_locale_parent_id_unique" ON "site_settings_footer_groups_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "site_settings_footer_groups_locales_parent_id_idx" ON "site_settings_footer_groups_locales" USING btree ("_parent_id");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_pages_fk" FOREIGN KEY ("pages_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_removed_paths_fk" FOREIGN KEY ("removed_paths_id") REFERENCES "public"."removed_paths"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_pages_id_idx" ON "payload_locked_documents_rels" USING btree ("pages_id");
  CREATE INDEX "payload_locked_documents_rels_removed_paths_id_idx" ON "payload_locked_documents_rels" USING btree ("removed_paths_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "pages_blocks_how_it_works_steps" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pages_blocks_how_it_works_steps_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pages_blocks_how_it_works" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pages_blocks_how_it_works_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pages_blocks_features_items" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pages_blocks_features_items_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pages_blocks_features" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pages_blocks_features_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pages_blocks_categories_grid" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pages_blocks_categories_grid_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pages_blocks_creator_network" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pages_blocks_creator_network_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pages_blocks_persona_band" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pages_blocks_persona_band_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pages_blocks_faq_items" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pages_blocks_faq_items_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pages_blocks_faq" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pages_blocks_faq_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pages_blocks_logo_cloud_logos" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pages_blocks_logo_cloud" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pages_blocks_logo_cloud_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pages_blocks_rich_text" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pages_blocks_rich_text_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pages_blocks_call_to_action" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pages_blocks_call_to_action_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pages_previous_slugs" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pages" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pages_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "pages_rels" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_v_blocks_how_it_works_steps" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_v_blocks_how_it_works_steps_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_v_blocks_how_it_works" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_v_blocks_how_it_works_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_v_blocks_features_items" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_v_blocks_features_items_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_v_blocks_features" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_v_blocks_features_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_v_blocks_categories_grid" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_v_blocks_categories_grid_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_v_blocks_creator_network" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_v_blocks_creator_network_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_v_blocks_persona_band" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_v_blocks_persona_band_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_v_blocks_faq_items" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_v_blocks_faq_items_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_v_blocks_faq" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_v_blocks_faq_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_v_blocks_logo_cloud_logos" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_v_blocks_logo_cloud" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_v_blocks_logo_cloud_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_v_blocks_rich_text" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_v_blocks_rich_text_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_v_blocks_call_to_action" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_v_blocks_call_to_action_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_v_version_previous_slugs" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_v" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_v_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_v_rels" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "removed_paths" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "site_settings_footer_groups" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "site_settings_footer_groups_locales" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "pages_blocks_how_it_works_steps" CASCADE;
  DROP TABLE "pages_blocks_how_it_works_steps_locales" CASCADE;
  DROP TABLE "pages_blocks_how_it_works" CASCADE;
  DROP TABLE "pages_blocks_how_it_works_locales" CASCADE;
  DROP TABLE "pages_blocks_features_items" CASCADE;
  DROP TABLE "pages_blocks_features_items_locales" CASCADE;
  DROP TABLE "pages_blocks_features" CASCADE;
  DROP TABLE "pages_blocks_features_locales" CASCADE;
  DROP TABLE "pages_blocks_categories_grid" CASCADE;
  DROP TABLE "pages_blocks_categories_grid_locales" CASCADE;
  DROP TABLE "pages_blocks_creator_network" CASCADE;
  DROP TABLE "pages_blocks_creator_network_locales" CASCADE;
  DROP TABLE "pages_blocks_persona_band" CASCADE;
  DROP TABLE "pages_blocks_persona_band_locales" CASCADE;
  DROP TABLE "pages_blocks_faq_items" CASCADE;
  DROP TABLE "pages_blocks_faq_items_locales" CASCADE;
  DROP TABLE "pages_blocks_faq" CASCADE;
  DROP TABLE "pages_blocks_faq_locales" CASCADE;
  DROP TABLE "pages_blocks_logo_cloud_logos" CASCADE;
  DROP TABLE "pages_blocks_logo_cloud" CASCADE;
  DROP TABLE "pages_blocks_logo_cloud_locales" CASCADE;
  DROP TABLE "pages_blocks_rich_text" CASCADE;
  DROP TABLE "pages_blocks_rich_text_locales" CASCADE;
  DROP TABLE "pages_blocks_call_to_action" CASCADE;
  DROP TABLE "pages_blocks_call_to_action_locales" CASCADE;
  DROP TABLE "pages_previous_slugs" CASCADE;
  DROP TABLE "pages" CASCADE;
  DROP TABLE "pages_locales" CASCADE;
  DROP TABLE "pages_rels" CASCADE;
  DROP TABLE "_pages_v_blocks_how_it_works_steps" CASCADE;
  DROP TABLE "_pages_v_blocks_how_it_works_steps_locales" CASCADE;
  DROP TABLE "_pages_v_blocks_how_it_works" CASCADE;
  DROP TABLE "_pages_v_blocks_how_it_works_locales" CASCADE;
  DROP TABLE "_pages_v_blocks_features_items" CASCADE;
  DROP TABLE "_pages_v_blocks_features_items_locales" CASCADE;
  DROP TABLE "_pages_v_blocks_features" CASCADE;
  DROP TABLE "_pages_v_blocks_features_locales" CASCADE;
  DROP TABLE "_pages_v_blocks_categories_grid" CASCADE;
  DROP TABLE "_pages_v_blocks_categories_grid_locales" CASCADE;
  DROP TABLE "_pages_v_blocks_creator_network" CASCADE;
  DROP TABLE "_pages_v_blocks_creator_network_locales" CASCADE;
  DROP TABLE "_pages_v_blocks_persona_band" CASCADE;
  DROP TABLE "_pages_v_blocks_persona_band_locales" CASCADE;
  DROP TABLE "_pages_v_blocks_faq_items" CASCADE;
  DROP TABLE "_pages_v_blocks_faq_items_locales" CASCADE;
  DROP TABLE "_pages_v_blocks_faq" CASCADE;
  DROP TABLE "_pages_v_blocks_faq_locales" CASCADE;
  DROP TABLE "_pages_v_blocks_logo_cloud_logos" CASCADE;
  DROP TABLE "_pages_v_blocks_logo_cloud" CASCADE;
  DROP TABLE "_pages_v_blocks_logo_cloud_locales" CASCADE;
  DROP TABLE "_pages_v_blocks_rich_text" CASCADE;
  DROP TABLE "_pages_v_blocks_rich_text_locales" CASCADE;
  DROP TABLE "_pages_v_blocks_call_to_action" CASCADE;
  DROP TABLE "_pages_v_blocks_call_to_action_locales" CASCADE;
  DROP TABLE "_pages_v_version_previous_slugs" CASCADE;
  DROP TABLE "_pages_v" CASCADE;
  DROP TABLE "_pages_v_locales" CASCADE;
  DROP TABLE "_pages_v_rels" CASCADE;
  DROP TABLE "removed_paths" CASCADE;
  DROP TABLE "site_settings_footer_groups" CASCADE;
  DROP TABLE "site_settings_footer_groups_locales" CASCADE;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_pages_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_removed_paths_fk";
  
  DROP INDEX "payload_locked_documents_rels_pages_id_idx";
  DROP INDEX "payload_locked_documents_rels_removed_paths_id_idx";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "pages_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "removed_paths_id";
  DROP TYPE "public"."enum_pages_blocks_how_it_works_cta_kind";
  DROP TYPE "public"."enum_pages_blocks_categories_grid_source";
  DROP TYPE "public"."enum_pages_blocks_categories_grid_cta_kind";
  DROP TYPE "public"."enum_pages_blocks_creator_network_rule";
  DROP TYPE "public"."enum_pages_blocks_creator_network_cta_kind";
  DROP TYPE "public"."enum_pages_blocks_persona_band_layout";
  DROP TYPE "public"."enum_pages_blocks_persona_band_cta_kind";
  DROP TYPE "public"."enum_pages_blocks_call_to_action_primary_kind";
  DROP TYPE "public"."enum_pages_blocks_call_to_action_secondary_kind";
  DROP TYPE "public"."enum_pages_previous_slugs_locale";
  DROP TYPE "public"."enum_pages_kind";
  DROP TYPE "public"."enum_pages_status";
  DROP TYPE "public"."enum__pages_v_blocks_how_it_works_cta_kind";
  DROP TYPE "public"."enum__pages_v_blocks_categories_grid_source";
  DROP TYPE "public"."enum__pages_v_blocks_categories_grid_cta_kind";
  DROP TYPE "public"."enum__pages_v_blocks_creator_network_rule";
  DROP TYPE "public"."enum__pages_v_blocks_creator_network_cta_kind";
  DROP TYPE "public"."enum__pages_v_blocks_persona_band_layout";
  DROP TYPE "public"."enum__pages_v_blocks_persona_band_cta_kind";
  DROP TYPE "public"."enum__pages_v_blocks_call_to_action_primary_kind";
  DROP TYPE "public"."enum__pages_v_blocks_call_to_action_secondary_kind";
  DROP TYPE "public"."enum__pages_v_version_previous_slugs_locale";
  DROP TYPE "public"."enum__pages_v_version_kind";
  DROP TYPE "public"."enum__pages_v_version_status";
  DROP TYPE "public"."enum__pages_v_published_locale";
  DROP TYPE "public"."enum_removed_paths_kind";
  DROP TYPE "public"."enum_removed_paths_locale";`)
}
