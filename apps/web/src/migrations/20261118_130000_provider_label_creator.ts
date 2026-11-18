import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

/**
 * The brief's provider action reads "I'm a creator" ("أنا مبدع"), not "I'm a Photographer": a creator
 * may be any persona. Only the labels still equal to the old seeded default are rewritten, so a label
 * the owner edited in the site settings is left alone. Down restores the old default the same way.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   UPDATE "site_settings_locales" SET "labels_provider_label" = 'I''m a creator'
     WHERE "_locale" = 'en' AND "labels_provider_label" = 'I''m a {persona.singular}';
   UPDATE "site_settings_locales" SET "labels_provider_label" = 'أنا مبدع'
     WHERE "_locale" = 'ar' AND "labels_provider_label" = 'أنا {persona.singular}';`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   UPDATE "site_settings_locales" SET "labels_provider_label" = 'I''m a {persona.singular}'
     WHERE "_locale" = 'en' AND "labels_provider_label" = 'I''m a creator';
   UPDATE "site_settings_locales" SET "labels_provider_label" = 'أنا {persona.singular}'
     WHERE "_locale" = 'ar' AND "labels_provider_label" = 'أنا مبدع';`)
}
