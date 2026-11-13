import { postgresAdapter } from '@payloadcms/db-postgres'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import { s3Storage } from '@payloadcms/storage-s3'
import { vercelBlobStorage } from '@payloadcms/storage-vercel-blob'
import { ar } from '@payloadcms/translations/languages/ar'
import { en } from '@payloadcms/translations/languages/en'
import path from 'path'
import { buildConfig } from 'payload'
import sharp from 'sharp'
import { fileURLToPath } from 'url'
import { OtpChallenges } from './modules/auth/collections/OtpChallenges'
import { Users } from './modules/auth/collections/Users'
import { Briefs } from './modules/brief/collections/Briefs'
import { OptionSets } from './modules/brief/collections/OptionSets'
import { RateLimits } from './modules/brief/collections/RateLimits'
import { CreatorListings } from './modules/creators/collections/CreatorListings'
import { IdentityDocuments } from './modules/creators/collections/IdentityDocuments'
import { CreatorProfiles } from './modules/creators/collections/CreatorProfiles'
import { Articles } from './modules/guides/collections/Articles'
import { ArticleCategories, Authors } from './modules/guides/collections/Taxonomy'
import { LegalAcceptances } from './modules/legal/collections/LegalAcceptances'
import { LegalDocuments } from './modules/legal/collections/LegalDocuments'
import { Locations } from './modules/creators/collections/Locations'
import { LandingPage } from './modules/landing/globals/LandingPage'
import { AvailabilityBlocks } from './modules/booking/collections/AvailabilityBlocks'
import { BookingEvents } from './modules/booking/collections/BookingEvents'
import { Bookings } from './modules/booking/collections/Bookings'
import { Notifications } from './modules/booking/collections/Notifications'
import { BriefAnswers } from './modules/inbox/collections/BriefAnswers'
import { PushDevices } from './modules/push/collections/PushDevices'
import { Payments } from './modules/booking/collections/Payments'
import { Quotations } from './modules/booking/collections/Quotations'
import { Media } from './modules/media/collections/Media'
import { Categories } from './modules/personas/collections/Categories'
import { Pages } from './modules/pages/collections/Pages'
import { RemovedPaths } from './modules/pages/collections/RemovedPaths'
import { Personas } from './modules/personas/collections/Personas'
import { AddOns } from './modules/pricing/collections/AddOns'
import { PromoCodes } from './modules/pricing/collections/PromoCodes'
import { ServiceTiers } from './modules/pricing/collections/ServiceTiers'
import { TravelFees } from './modules/pricing/collections/TravelFees'
import { SiteSettings } from './modules/site-settings/globals/SiteSettings'

const dirname = path.dirname(fileURLToPath(import.meta.url))
const useS3 = Boolean(process.env.S3_BUCKET)
// Vercel Blob is public-only, so it takes media alone; identity documents need a private store (S3/R2).
const blobToken = useS3 ? undefined : process.env.BLOB_READ_WRITE_TOKEN

const databaseUrl = process.env.DATABASE_URI || process.env.DATABASE_URL || ''

function isLocalDatabase(url: string): boolean {
  try {
    return ['localhost', '127.0.0.1', '[::1]', 'postgres'].includes(new URL(url).hostname)
  } catch {
    return false
  }
}

export default buildConfig({
  admin: {
    user: Users.slug,
    theme: 'all', // each editor picks light, dark or auto in their account (FR-044)
    importMap: { baseDir: path.resolve(dirname) },
    meta: { titleSuffix: ' · Shoot Project' },
  },
  collections: [
    Users,
    OtpChallenges,
    Personas,
    Categories,
    Locations,
    CreatorProfiles,
    CreatorListings,
    IdentityDocuments,
    OptionSets,
    Briefs,
    Bookings,
    Quotations,
    Payments,
    AvailabilityBlocks,
    BookingEvents,
    Notifications,
    BriefAnswers,
    PushDevices,
    ServiceTiers,
    TravelFees,
    AddOns,
    PromoCodes,
    Media,
    RateLimits,
    Pages,
    RemovedPaths,
    LegalDocuments,
    LegalAcceptances,
    Articles,
    ArticleCategories,
    Authors,
  ],
  globals: [LandingPage, SiteSettings],
  localization: {
    locales: [
      { code: 'en', label: 'English' },
      { code: 'ar', label: 'العربية', rtl: true },
    ],
    defaultLocale: 'en',
    fallback: true,
  },
  i18n: { supportedLanguages: { en, ar }, fallbackLanguage: 'en' },
  editor: lexicalEditor(),
  secret: process.env.PAYLOAD_SECRET || '',
  typescript: { outputFile: path.resolve(dirname, 'payload-types.ts') },
  db: postgresAdapter({
    pool: { connectionString: databaseUrl },
    // Development pushes schema changes automatically (every change also gets a committed migration), but only
    // into a database on this machine: a push into a hosted database leaves a "dev" marker in payload_migrations
    // that makes `payload migrate` stop and wait for a yes/no, which hangs the Vercel build.
    push:
      process.env.NODE_ENV === 'development' &&
      process.env.PAYLOAD_MIGRATING !== 'true' &&
      isLocalDatabase(databaseUrl),
    migrationDir: path.resolve(dirname, 'migrations'),
  }),
  sharp,
  plugins: useS3
    ? [
        s3Storage({
          // Identity documents sit under their own prefix and are always served through Payload's access control.
          collections: { media: true, 'identity-documents': { prefix: 'private/identity-documents' } },
          bucket: process.env.S3_BUCKET as string,
          config: {
            region: process.env.S3_REGION,
            endpoint: process.env.S3_ENDPOINT,
            credentials: {
              accessKeyId: process.env.S3_ACCESS_KEY_ID as string,
              secretAccessKey: process.env.S3_SECRET_ACCESS_KEY as string,
            },
          },
        }),
      ]
    : [
        // Registered even without a token so the media schema (`prefix`, `_objectKey`) is the same in every
        // environment; it only stores in Blob when BLOB_READ_WRITE_TOKEN is set.
        vercelBlobStorage({ collections: { media: true }, token: blobToken, enabled: Boolean(blobToken), alwaysInsertFields: true }),
      ],
})
