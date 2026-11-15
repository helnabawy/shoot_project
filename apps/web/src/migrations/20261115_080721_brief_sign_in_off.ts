import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

/**
 * Feature 021, amendment 2026-11-15: the owner wants guests to brief and see who is free without an
 * account, and to sign in when they accept a quotation. "Briefs need sign-in" becomes off by default and
 * is turned off where it was on (it was on only because of the first reading of the request). No data
 * is lost: the owner can turn it on again in the site settings. Down restores the old default only.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "site_settings" ALTER COLUMN "brief_needs_sign_in" SET DEFAULT false;
   UPDATE "site_settings" SET "brief_needs_sign_in" = false;`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "site_settings" ALTER COLUMN "brief_needs_sign_in" SET DEFAULT true;`)
}
