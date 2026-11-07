import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_creator_profiles_languages" AS ENUM('en', 'ar', 'hi', 'ur', 'fr', 'ru', 'tl', 'fa', 'es', 'de', 'zh', 'bn', 'ml', 'ta');
  CREATE TYPE "public"."enum_creator_profiles_samples_kind" AS ENUM('image', 'video');
  CREATE TYPE "public"."enum_creator_profiles_social_platform" AS ENUM('instagram', 'linkedin', 'youtube', 'tiktok', 'x', 'website');
  CREATE TYPE "public"."enum_creator_profiles_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__creator_profiles_v_version_languages" AS ENUM('en', 'ar', 'hi', 'ur', 'fr', 'ru', 'tl', 'fa', 'es', 'de', 'zh', 'bn', 'ml', 'ta');
  CREATE TYPE "public"."enum__creator_profiles_v_version_samples_kind" AS ENUM('image', 'video');
  CREATE TYPE "public"."enum__creator_profiles_v_version_social_platform" AS ENUM('instagram', 'linkedin', 'youtube', 'tiktok', 'x', 'website');
  CREATE TYPE "public"."enum__creator_profiles_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__creator_profiles_v_published_locale" AS ENUM('en', 'ar');
  CREATE TYPE "public"."enum_landing_page_blocks_creator_network_rule" AS ENUM('featuredThenNewest', 'newest', 'featuredOnly');
  CREATE TYPE "public"."enum_landing_page_blocks_creator_network_cta_kind" AS ENUM('whatsapp', 'link', 'call');
  CREATE TYPE "public"."enum__landing_page_v_blocks_creator_network_rule" AS ENUM('featuredThenNewest', 'newest', 'featuredOnly');
  CREATE TYPE "public"."enum__landing_page_v_blocks_creator_network_cta_kind" AS ENUM('whatsapp', 'link', 'call');
  CREATE TABLE "locations" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"slug" varchar NOT NULL,
  	"parent_id" integer,
  	"order" numeric DEFAULT 100,
  	"active" boolean DEFAULT true,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "locations_locales" (
  	"name" varchar NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "creator_profiles_languages" (
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"value" "enum_creator_profiles_languages",
  	"id" serial PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "creator_profiles_samples" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"kind" "enum_creator_profiles_samples_kind" DEFAULT 'image',
  	"image_id" integer,
  	"video_url" varchar,
  	"category_id" integer
  );
  
  CREATE TABLE "creator_profiles_samples_locales" (
  	"caption" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "creator_profiles_social" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"platform" "enum_creator_profiles_social_platform",
  	"url" varchar
  );
  
  CREATE TABLE "creator_profiles" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"user_id" integer,
  	"code" varchar,
  	"photo_id" integer,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"_status" "enum_creator_profiles_status" DEFAULT 'draft'
  );
  
  CREATE TABLE "creator_profiles_locales" (
  	"display_name" varchar,
  	"bio" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "creator_profiles_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"personas_id" integer,
  	"categories_id" integer,
  	"locations_id" integer
  );
  
  CREATE TABLE "_creator_profiles_v_version_languages" (
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"value" "enum__creator_profiles_v_version_languages",
  	"id" serial PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "_creator_profiles_v_version_samples" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"kind" "enum__creator_profiles_v_version_samples_kind" DEFAULT 'image',
  	"image_id" integer,
  	"video_url" varchar,
  	"category_id" integer,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_creator_profiles_v_version_samples_locales" (
  	"caption" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_creator_profiles_v_version_social" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"platform" "enum__creator_profiles_v_version_social_platform",
  	"url" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_creator_profiles_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_user_id" integer,
  	"version_code" varchar,
  	"version_photo_id" integer,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version__status" "enum__creator_profiles_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"snapshot" boolean,
  	"published_locale" "enum__creator_profiles_v_published_locale",
  	"latest" boolean
  );
  
  CREATE TABLE "_creator_profiles_v_locales" (
  	"version_display_name" varchar,
  	"version_bio" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_creator_profiles_v_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"personas_id" integer,
  	"categories_id" integer,
  	"locations_id" integer
  );
  
  CREATE TABLE "creator_listings" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"profile_id" integer NOT NULL,
  	"user_id" integer NOT NULL,
  	"active" boolean DEFAULT true,
  	"featured" boolean DEFAULT false,
  	"suspended" boolean DEFAULT false,
  	"review_note" varchar,
  	"submitted_at" timestamp(3) with time zone,
  	"verified_at" timestamp(3) with time zone,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "landing_page_blocks_creator_network" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"anchor" varchar DEFAULT 'our-network',
  	"rule" "enum_landing_page_blocks_creator_network_rule" DEFAULT 'featuredThenNewest',
  	"count" numeric DEFAULT 6,
  	"cta_kind" "enum_landing_page_blocks_creator_network_cta_kind" DEFAULT 'whatsapp',
  	"cta_href" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "landing_page_blocks_creator_network_locales" (
  	"heading" varchar,
  	"subheading" varchar,
  	"cta_label" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "_landing_page_v_blocks_creator_network" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"anchor" varchar DEFAULT 'our-network',
  	"rule" "enum__landing_page_v_blocks_creator_network_rule" DEFAULT 'featuredThenNewest',
  	"count" numeric DEFAULT 6,
  	"cta_kind" "enum__landing_page_v_blocks_creator_network_cta_kind" DEFAULT 'whatsapp',
  	"cta_href" varchar,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_landing_page_v_blocks_creator_network_locales" (
  	"heading" varchar,
  	"subheading" varchar,
  	"cta_label" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  ALTER TABLE "categories_locales" ADD COLUMN "seo_title" varchar;
  ALTER TABLE "categories_locales" ADD COLUMN "seo_description" varchar;
  ALTER TABLE "categories_locales" ADD COLUMN "seo_intro" varchar;
  ALTER TABLE "briefs" ADD COLUMN "creator_id" integer;
  ALTER TABLE "media" ADD COLUMN "uploaded_by_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "locations_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "creator_profiles_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "creator_listings_id" integer;
  ALTER TABLE "site_settings" ADD COLUMN "creator_code_prefix" varchar DEFAULT 'CR';
  ALTER TABLE "site_settings" ADD COLUMN "auto_publish_edits" boolean DEFAULT false;
  ALTER TABLE "site_settings" ADD COLUMN "directory_page_size" numeric DEFAULT 24;
  ALTER TABLE "locations" ADD CONSTRAINT "locations_parent_id_locations_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."locations"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "locations_locales" ADD CONSTRAINT "locations_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."locations"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "creator_profiles_languages" ADD CONSTRAINT "creator_profiles_languages_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."creator_profiles"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "creator_profiles_samples" ADD CONSTRAINT "creator_profiles_samples_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "creator_profiles_samples" ADD CONSTRAINT "creator_profiles_samples_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "creator_profiles_samples" ADD CONSTRAINT "creator_profiles_samples_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."creator_profiles"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "creator_profiles_samples_locales" ADD CONSTRAINT "creator_profiles_samples_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."creator_profiles_samples"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "creator_profiles_social" ADD CONSTRAINT "creator_profiles_social_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."creator_profiles"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "creator_profiles" ADD CONSTRAINT "creator_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "creator_profiles" ADD CONSTRAINT "creator_profiles_photo_id_media_id_fk" FOREIGN KEY ("photo_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "creator_profiles_locales" ADD CONSTRAINT "creator_profiles_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."creator_profiles"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "creator_profiles_rels" ADD CONSTRAINT "creator_profiles_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."creator_profiles"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "creator_profiles_rels" ADD CONSTRAINT "creator_profiles_rels_personas_fk" FOREIGN KEY ("personas_id") REFERENCES "public"."personas"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "creator_profiles_rels" ADD CONSTRAINT "creator_profiles_rels_categories_fk" FOREIGN KEY ("categories_id") REFERENCES "public"."categories"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "creator_profiles_rels" ADD CONSTRAINT "creator_profiles_rels_locations_fk" FOREIGN KEY ("locations_id") REFERENCES "public"."locations"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_creator_profiles_v_version_languages" ADD CONSTRAINT "_creator_profiles_v_version_languages_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."_creator_profiles_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_creator_profiles_v_version_samples" ADD CONSTRAINT "_creator_profiles_v_version_samples_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_creator_profiles_v_version_samples" ADD CONSTRAINT "_creator_profiles_v_version_samples_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_creator_profiles_v_version_samples" ADD CONSTRAINT "_creator_profiles_v_version_samples_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_creator_profiles_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_creator_profiles_v_version_samples_locales" ADD CONSTRAINT "_creator_profiles_v_version_samples_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_creator_profiles_v_version_samples"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_creator_profiles_v_version_social" ADD CONSTRAINT "_creator_profiles_v_version_social_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_creator_profiles_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_creator_profiles_v" ADD CONSTRAINT "_creator_profiles_v_parent_id_creator_profiles_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."creator_profiles"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_creator_profiles_v" ADD CONSTRAINT "_creator_profiles_v_version_user_id_users_id_fk" FOREIGN KEY ("version_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_creator_profiles_v" ADD CONSTRAINT "_creator_profiles_v_version_photo_id_media_id_fk" FOREIGN KEY ("version_photo_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_creator_profiles_v_locales" ADD CONSTRAINT "_creator_profiles_v_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_creator_profiles_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_creator_profiles_v_rels" ADD CONSTRAINT "_creator_profiles_v_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."_creator_profiles_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_creator_profiles_v_rels" ADD CONSTRAINT "_creator_profiles_v_rels_personas_fk" FOREIGN KEY ("personas_id") REFERENCES "public"."personas"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_creator_profiles_v_rels" ADD CONSTRAINT "_creator_profiles_v_rels_categories_fk" FOREIGN KEY ("categories_id") REFERENCES "public"."categories"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_creator_profiles_v_rels" ADD CONSTRAINT "_creator_profiles_v_rels_locations_fk" FOREIGN KEY ("locations_id") REFERENCES "public"."locations"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "creator_listings" ADD CONSTRAINT "creator_listings_profile_id_creator_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."creator_profiles"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "creator_listings" ADD CONSTRAINT "creator_listings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "landing_page_blocks_creator_network" ADD CONSTRAINT "landing_page_blocks_creator_network_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."landing_page"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "landing_page_blocks_creator_network_locales" ADD CONSTRAINT "landing_page_blocks_creator_network_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."landing_page_blocks_creator_network"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_landing_page_v_blocks_creator_network" ADD CONSTRAINT "_landing_page_v_blocks_creator_network_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_landing_page_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_landing_page_v_blocks_creator_network_locales" ADD CONSTRAINT "_landing_page_v_blocks_creator_network_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_landing_page_v_blocks_creator_network"("id") ON DELETE cascade ON UPDATE no action;
  CREATE UNIQUE INDEX "locations_slug_idx" ON "locations" USING btree ("slug");
  CREATE INDEX "locations_parent_idx" ON "locations" USING btree ("parent_id");
  CREATE INDEX "locations_updated_at_idx" ON "locations" USING btree ("updated_at");
  CREATE INDEX "locations_created_at_idx" ON "locations" USING btree ("created_at");
  CREATE UNIQUE INDEX "locations_locales_locale_parent_id_unique" ON "locations_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "locations_locales_parent_id_idx" ON "locations_locales" USING btree ("_parent_id");
  CREATE INDEX "creator_profiles_languages_order_idx" ON "creator_profiles_languages" USING btree ("order");
  CREATE INDEX "creator_profiles_languages_parent_idx" ON "creator_profiles_languages" USING btree ("parent_id");
  CREATE INDEX "creator_profiles_samples_order_idx" ON "creator_profiles_samples" USING btree ("_order");
  CREATE INDEX "creator_profiles_samples_parent_id_idx" ON "creator_profiles_samples" USING btree ("_parent_id");
  CREATE INDEX "creator_profiles_samples_image_idx" ON "creator_profiles_samples" USING btree ("image_id");
  CREATE INDEX "creator_profiles_samples_category_idx" ON "creator_profiles_samples" USING btree ("category_id");
  CREATE UNIQUE INDEX "creator_profiles_samples_locales_locale_parent_id_unique" ON "creator_profiles_samples_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "creator_profiles_samples_locales_parent_id_idx" ON "creator_profiles_samples_locales" USING btree ("_parent_id");
  CREATE INDEX "creator_profiles_social_order_idx" ON "creator_profiles_social" USING btree ("_order");
  CREATE INDEX "creator_profiles_social_parent_id_idx" ON "creator_profiles_social" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "creator_profiles_user_idx" ON "creator_profiles" USING btree ("user_id");
  CREATE UNIQUE INDEX "creator_profiles_code_idx" ON "creator_profiles" USING btree ("code");
  CREATE INDEX "creator_profiles_photo_idx" ON "creator_profiles" USING btree ("photo_id");
  CREATE INDEX "creator_profiles_updated_at_idx" ON "creator_profiles" USING btree ("updated_at");
  CREATE INDEX "creator_profiles_created_at_idx" ON "creator_profiles" USING btree ("created_at");
  CREATE INDEX "creator_profiles__status_idx" ON "creator_profiles" USING btree ("_status");
  CREATE UNIQUE INDEX "creator_profiles_locales_locale_parent_id_unique" ON "creator_profiles_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "creator_profiles_locales_parent_id_idx" ON "creator_profiles_locales" USING btree ("_parent_id");
  CREATE INDEX "creator_profiles_rels_order_idx" ON "creator_profiles_rels" USING btree ("order");
  CREATE INDEX "creator_profiles_rels_parent_idx" ON "creator_profiles_rels" USING btree ("parent_id");
  CREATE INDEX "creator_profiles_rels_path_idx" ON "creator_profiles_rels" USING btree ("path");
  CREATE INDEX "creator_profiles_rels_personas_id_idx" ON "creator_profiles_rels" USING btree ("personas_id");
  CREATE INDEX "creator_profiles_rels_categories_id_idx" ON "creator_profiles_rels" USING btree ("categories_id");
  CREATE INDEX "creator_profiles_rels_locations_id_idx" ON "creator_profiles_rels" USING btree ("locations_id");
  CREATE INDEX "_creator_profiles_v_version_languages_order_idx" ON "_creator_profiles_v_version_languages" USING btree ("order");
  CREATE INDEX "_creator_profiles_v_version_languages_parent_idx" ON "_creator_profiles_v_version_languages" USING btree ("parent_id");
  CREATE INDEX "_creator_profiles_v_version_samples_order_idx" ON "_creator_profiles_v_version_samples" USING btree ("_order");
  CREATE INDEX "_creator_profiles_v_version_samples_parent_id_idx" ON "_creator_profiles_v_version_samples" USING btree ("_parent_id");
  CREATE INDEX "_creator_profiles_v_version_samples_image_idx" ON "_creator_profiles_v_version_samples" USING btree ("image_id");
  CREATE INDEX "_creator_profiles_v_version_samples_category_idx" ON "_creator_profiles_v_version_samples" USING btree ("category_id");
  CREATE UNIQUE INDEX "_creator_profiles_v_version_samples_locales_locale_parent_id" ON "_creator_profiles_v_version_samples_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_creator_profiles_v_version_samples_locales_parent_id_idx" ON "_creator_profiles_v_version_samples_locales" USING btree ("_parent_id");
  CREATE INDEX "_creator_profiles_v_version_social_order_idx" ON "_creator_profiles_v_version_social" USING btree ("_order");
  CREATE INDEX "_creator_profiles_v_version_social_parent_id_idx" ON "_creator_profiles_v_version_social" USING btree ("_parent_id");
  CREATE INDEX "_creator_profiles_v_parent_idx" ON "_creator_profiles_v" USING btree ("parent_id");
  CREATE INDEX "_creator_profiles_v_version_version_user_idx" ON "_creator_profiles_v" USING btree ("version_user_id");
  CREATE INDEX "_creator_profiles_v_version_version_code_idx" ON "_creator_profiles_v" USING btree ("version_code");
  CREATE INDEX "_creator_profiles_v_version_version_photo_idx" ON "_creator_profiles_v" USING btree ("version_photo_id");
  CREATE INDEX "_creator_profiles_v_version_version_updated_at_idx" ON "_creator_profiles_v" USING btree ("version_updated_at");
  CREATE INDEX "_creator_profiles_v_version_version_created_at_idx" ON "_creator_profiles_v" USING btree ("version_created_at");
  CREATE INDEX "_creator_profiles_v_version_version__status_idx" ON "_creator_profiles_v" USING btree ("version__status");
  CREATE INDEX "_creator_profiles_v_created_at_idx" ON "_creator_profiles_v" USING btree ("created_at");
  CREATE INDEX "_creator_profiles_v_updated_at_idx" ON "_creator_profiles_v" USING btree ("updated_at");
  CREATE INDEX "_creator_profiles_v_snapshot_idx" ON "_creator_profiles_v" USING btree ("snapshot");
  CREATE INDEX "_creator_profiles_v_published_locale_idx" ON "_creator_profiles_v" USING btree ("published_locale");
  CREATE INDEX "_creator_profiles_v_latest_idx" ON "_creator_profiles_v" USING btree ("latest");
  CREATE UNIQUE INDEX "_creator_profiles_v_locales_locale_parent_id_unique" ON "_creator_profiles_v_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_creator_profiles_v_locales_parent_id_idx" ON "_creator_profiles_v_locales" USING btree ("_parent_id");
  CREATE INDEX "_creator_profiles_v_rels_order_idx" ON "_creator_profiles_v_rels" USING btree ("order");
  CREATE INDEX "_creator_profiles_v_rels_parent_idx" ON "_creator_profiles_v_rels" USING btree ("parent_id");
  CREATE INDEX "_creator_profiles_v_rels_path_idx" ON "_creator_profiles_v_rels" USING btree ("path");
  CREATE INDEX "_creator_profiles_v_rels_personas_id_idx" ON "_creator_profiles_v_rels" USING btree ("personas_id");
  CREATE INDEX "_creator_profiles_v_rels_categories_id_idx" ON "_creator_profiles_v_rels" USING btree ("categories_id");
  CREATE INDEX "_creator_profiles_v_rels_locations_id_idx" ON "_creator_profiles_v_rels" USING btree ("locations_id");
  CREATE UNIQUE INDEX "creator_listings_profile_idx" ON "creator_listings" USING btree ("profile_id");
  CREATE INDEX "creator_listings_user_idx" ON "creator_listings" USING btree ("user_id");
  CREATE INDEX "creator_listings_active_idx" ON "creator_listings" USING btree ("active");
  CREATE INDEX "creator_listings_featured_idx" ON "creator_listings" USING btree ("featured");
  CREATE INDEX "creator_listings_suspended_idx" ON "creator_listings" USING btree ("suspended");
  CREATE INDEX "creator_listings_submitted_at_idx" ON "creator_listings" USING btree ("submitted_at");
  CREATE INDEX "creator_listings_updated_at_idx" ON "creator_listings" USING btree ("updated_at");
  CREATE INDEX "creator_listings_created_at_idx" ON "creator_listings" USING btree ("created_at");
  CREATE INDEX "landing_page_blocks_creator_network_order_idx" ON "landing_page_blocks_creator_network" USING btree ("_order");
  CREATE INDEX "landing_page_blocks_creator_network_parent_id_idx" ON "landing_page_blocks_creator_network" USING btree ("_parent_id");
  CREATE INDEX "landing_page_blocks_creator_network_path_idx" ON "landing_page_blocks_creator_network" USING btree ("_path");
  CREATE UNIQUE INDEX "landing_page_blocks_creator_network_locales_locale_parent_id" ON "landing_page_blocks_creator_network_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "landing_page_blocks_creator_network_locales_parent_id_idx" ON "landing_page_blocks_creator_network_locales" USING btree ("_parent_id");
  CREATE INDEX "_landing_page_v_blocks_creator_network_order_idx" ON "_landing_page_v_blocks_creator_network" USING btree ("_order");
  CREATE INDEX "_landing_page_v_blocks_creator_network_parent_id_idx" ON "_landing_page_v_blocks_creator_network" USING btree ("_parent_id");
  CREATE INDEX "_landing_page_v_blocks_creator_network_path_idx" ON "_landing_page_v_blocks_creator_network" USING btree ("_path");
  CREATE UNIQUE INDEX "_landing_page_v_blocks_creator_network_locales_locale_parent" ON "_landing_page_v_blocks_creator_network_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_landing_page_v_blocks_creator_network_locales_parent_id_idx" ON "_landing_page_v_blocks_creator_network_locales" USING btree ("_parent_id");
  ALTER TABLE "briefs" ADD CONSTRAINT "briefs_creator_id_creator_profiles_id_fk" FOREIGN KEY ("creator_id") REFERENCES "public"."creator_profiles"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "media" ADD CONSTRAINT "media_uploaded_by_id_users_id_fk" FOREIGN KEY ("uploaded_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_locations_fk" FOREIGN KEY ("locations_id") REFERENCES "public"."locations"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_creator_profiles_fk" FOREIGN KEY ("creator_profiles_id") REFERENCES "public"."creator_profiles"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_creator_listings_fk" FOREIGN KEY ("creator_listings_id") REFERENCES "public"."creator_listings"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "briefs_creator_idx" ON "briefs" USING btree ("creator_id");
  CREATE INDEX "media_uploaded_by_idx" ON "media" USING btree ("uploaded_by_id");
  CREATE INDEX "payload_locked_documents_rels_locations_id_idx" ON "payload_locked_documents_rels" USING btree ("locations_id");
  CREATE INDEX "payload_locked_documents_rels_creator_profiles_id_idx" ON "payload_locked_documents_rels" USING btree ("creator_profiles_id");
  CREATE INDEX "payload_locked_documents_rels_creator_listings_id_idx" ON "payload_locked_documents_rels" USING btree ("creator_listings_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "locations" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "locations_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "creator_profiles_languages" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "creator_profiles_samples" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "creator_profiles_samples_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "creator_profiles_social" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "creator_profiles" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "creator_profiles_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "creator_profiles_rels" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_creator_profiles_v_version_languages" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_creator_profiles_v_version_samples" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_creator_profiles_v_version_samples_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_creator_profiles_v_version_social" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_creator_profiles_v" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_creator_profiles_v_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_creator_profiles_v_rels" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "creator_listings" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "landing_page_blocks_creator_network" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "landing_page_blocks_creator_network_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_landing_page_v_blocks_creator_network" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_landing_page_v_blocks_creator_network_locales" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "locations" CASCADE;
  DROP TABLE "locations_locales" CASCADE;
  DROP TABLE "creator_profiles_languages" CASCADE;
  DROP TABLE "creator_profiles_samples" CASCADE;
  DROP TABLE "creator_profiles_samples_locales" CASCADE;
  DROP TABLE "creator_profiles_social" CASCADE;
  DROP TABLE "creator_profiles" CASCADE;
  DROP TABLE "creator_profiles_locales" CASCADE;
  DROP TABLE "creator_profiles_rels" CASCADE;
  DROP TABLE "_creator_profiles_v_version_languages" CASCADE;
  DROP TABLE "_creator_profiles_v_version_samples" CASCADE;
  DROP TABLE "_creator_profiles_v_version_samples_locales" CASCADE;
  DROP TABLE "_creator_profiles_v_version_social" CASCADE;
  DROP TABLE "_creator_profiles_v" CASCADE;
  DROP TABLE "_creator_profiles_v_locales" CASCADE;
  DROP TABLE "_creator_profiles_v_rels" CASCADE;
  DROP TABLE "creator_listings" CASCADE;
  DROP TABLE "landing_page_blocks_creator_network" CASCADE;
  DROP TABLE "landing_page_blocks_creator_network_locales" CASCADE;
  DROP TABLE "_landing_page_v_blocks_creator_network" CASCADE;
  DROP TABLE "_landing_page_v_blocks_creator_network_locales" CASCADE;
  ALTER TABLE "briefs" DROP CONSTRAINT "briefs_creator_id_creator_profiles_id_fk";
  
  ALTER TABLE "media" DROP CONSTRAINT "media_uploaded_by_id_users_id_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_locations_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_creator_profiles_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_creator_listings_fk";
  
  DROP INDEX "briefs_creator_idx";
  DROP INDEX "media_uploaded_by_idx";
  DROP INDEX "payload_locked_documents_rels_locations_id_idx";
  DROP INDEX "payload_locked_documents_rels_creator_profiles_id_idx";
  DROP INDEX "payload_locked_documents_rels_creator_listings_id_idx";
  ALTER TABLE "categories_locales" DROP COLUMN "seo_title";
  ALTER TABLE "categories_locales" DROP COLUMN "seo_description";
  ALTER TABLE "categories_locales" DROP COLUMN "seo_intro";
  ALTER TABLE "briefs" DROP COLUMN "creator_id";
  ALTER TABLE "media" DROP COLUMN "uploaded_by_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "locations_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "creator_profiles_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "creator_listings_id";
  ALTER TABLE "site_settings" DROP COLUMN "creator_code_prefix";
  ALTER TABLE "site_settings" DROP COLUMN "auto_publish_edits";
  ALTER TABLE "site_settings" DROP COLUMN "directory_page_size";
  DROP TYPE "public"."enum_creator_profiles_languages";
  DROP TYPE "public"."enum_creator_profiles_samples_kind";
  DROP TYPE "public"."enum_creator_profiles_social_platform";
  DROP TYPE "public"."enum_creator_profiles_status";
  DROP TYPE "public"."enum__creator_profiles_v_version_languages";
  DROP TYPE "public"."enum__creator_profiles_v_version_samples_kind";
  DROP TYPE "public"."enum__creator_profiles_v_version_social_platform";
  DROP TYPE "public"."enum__creator_profiles_v_version_status";
  DROP TYPE "public"."enum__creator_profiles_v_published_locale";
  DROP TYPE "public"."enum_landing_page_blocks_creator_network_rule";
  DROP TYPE "public"."enum_landing_page_blocks_creator_network_cta_kind";
  DROP TYPE "public"."enum__landing_page_v_blocks_creator_network_rule";
  DROP TYPE "public"."enum__landing_page_v_blocks_creator_network_cta_kind";`)
}
