import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TABLE "site_settings_account_about" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "site_settings_account_about_locales" (
  	"line" varchar NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  ALTER TABLE "users" ADD COLUMN "account_finish_dismissed_at" timestamp(3) with time zone;
  ALTER TABLE "site_settings_account_about" ADD CONSTRAINT "site_settings_account_about_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."site_settings"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "site_settings_account_about_locales" ADD CONSTRAINT "site_settings_account_about_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."site_settings_account_about"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "site_settings_account_about_order_idx" ON "site_settings_account_about" USING btree ("_order");
  CREATE INDEX "site_settings_account_about_parent_id_idx" ON "site_settings_account_about" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "site_settings_account_about_locales_locale_parent_id_unique" ON "site_settings_account_about_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "site_settings_account_about_locales_parent_id_idx" ON "site_settings_account_about_locales" USING btree ("_parent_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "site_settings_account_about" CASCADE;
  DROP TABLE "site_settings_account_about_locales" CASCADE;
  ALTER TABLE "users" DROP COLUMN "account_finish_dismissed_at";`)
}
