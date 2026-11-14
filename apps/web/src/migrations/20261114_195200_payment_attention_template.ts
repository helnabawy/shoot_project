import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres'

/**
 * Data only (feature 020): the team's wording for an online payment the booking did not expect, where the
 * site has none yet. Separate from the schema migration because a new enum value cannot be used in the
 * transaction that adds it. Editors change it in Site settings > Quick Match > Templates.
 */
const ID = 'payment_attention_admin'
const EN = 'Online payment for {reference} ({total}) needs a check: {reason}. Refund it or record it in Payments.'
const AR = 'دفعة إلكترونية للحجز {reference} ({total}) تحتاج مراجعة: {reason}. أعدها أو سجّلها في المدفوعات.'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    INSERT INTO "site_settings_quick_match_templates" ("_order", "_parent_id", "id", "event", "audience")
    SELECT COALESCE((SELECT MAX("_order") FROM "site_settings_quick_match_templates" WHERE "_parent_id" = s."id"), 0) + 1,
           s."id", ${ID}, 'payment-attention'::"enum_site_settings_quick_match_templates_event", 'admin'::"enum_site_settings_quick_match_templates_audience"
    FROM "site_settings" s
    WHERE NOT EXISTS (
      SELECT 1 FROM "site_settings_quick_match_templates" x
      WHERE x."_parent_id" = s."id" AND x."event"::text = 'payment-attention' AND x."audience"::text = 'admin'
    );`)
  await db.execute(sql`
    INSERT INTO "site_settings_quick_match_templates_locales" ("text", "_locale", "_parent_id")
    SELECT v."text", v."locale"::"_locales", ${ID}
    FROM (VALUES (${EN}, 'en'), (${AR}, 'ar')) AS v("text", "locale")
    WHERE EXISTS (SELECT 1 FROM "site_settings_quick_match_templates" WHERE "id" = ${ID})
    ON CONFLICT DO NOTHING;`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`DELETE FROM "site_settings_quick_match_templates" WHERE "id" = ${ID};`)
}
