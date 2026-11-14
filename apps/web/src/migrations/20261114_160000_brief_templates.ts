import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres'

/**
 * Data only (feature 019): a database seeded before 019 has no wording for the brief events, so "New brief"
 * rows and pushes to creators, and "said yes" rows to clients and the team, render empty and are skipped.
 * Adds the seed's wording for each brief event and audience that has none; wording an editor already set is
 * never touched. Editors change it later in Site settings > Quick Match > Templates.
 */
const TEMPLATES: { event: string; audience: string; en: string; ar: string }[] = [
  {
    event: 'brief-accepted',
    audience: 'client',
    en: '{creator} said yes to your brief for {occasion}. Choose your creator: {link}',
    ar: 'وافق {creator} على طلبك لـ{occasion}. اختر المحترف: {link}',
  },
  {
    event: 'brief-accepted',
    audience: 'admin',
    en: '{creator} said yes to brief {reference} ({type}, {emirate}, {date}). Send the client the link: {link}',
    ar: 'وافق {creator} على الطلب {reference} ({type}، {emirate}، {date}). أرسل الرابط للعميل: {link}',
  },
  {
    event: 'brief-new',
    audience: 'creator',
    en: 'New brief: {type} for {occasion} in {emirate}, {date}.',
    ar: 'طلب جديد: {type} لـ{occasion} في {emirate}، {date}.',
  },
]

export async function up({ db }: MigrateUpArgs): Promise<void> {
  for (const t of TEMPLATES) {
    const id = `brief_${t.event}_${t.audience}`.replace(/-/g, '_')
    await db.execute(sql`
      INSERT INTO "site_settings_quick_match_templates" ("_order", "_parent_id", "id", "event", "audience")
      SELECT COALESCE((SELECT MAX("_order") FROM "site_settings_quick_match_templates" WHERE "_parent_id" = s."id"), 0) + 1,
             s."id", ${id}, ${t.event}::"enum_site_settings_quick_match_templates_event", ${t.audience}::"enum_site_settings_quick_match_templates_audience"
      FROM "site_settings" s
      WHERE NOT EXISTS (
        SELECT 1 FROM "site_settings_quick_match_templates" x
        WHERE x."_parent_id" = s."id" AND x."event"::text = ${t.event} AND x."audience"::text = ${t.audience}
      );`)
    // Only for the row added above: when the event already had wording, there is no row with this id.
    await db.execute(sql`
      INSERT INTO "site_settings_quick_match_templates_locales" ("text", "_locale", "_parent_id")
      SELECT v."text", v."locale"::"_locales", ${id}
      FROM (VALUES (${t.en}, 'en'), (${t.ar}, 'ar')) AS v("text", "locale")
      WHERE EXISTS (SELECT 1 FROM "site_settings_quick_match_templates" WHERE "id" = ${id})
      ON CONFLICT DO NOTHING;`)
  }
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`DELETE FROM "site_settings_quick_match_templates" WHERE "id" LIKE 'brief\\_%';`)
}
