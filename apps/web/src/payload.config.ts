import { postgresAdapter } from '@payloadcms/db-postgres'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import { s3Storage } from '@payloadcms/storage-s3'
import { ar } from '@payloadcms/translations/languages/ar'
import { en } from '@payloadcms/translations/languages/en'
import path from 'path'
import { buildConfig } from 'payload'
import sharp from 'sharp'
import { fileURLToPath } from 'url'
import { Users } from './modules/auth/collections/Users'
import { Briefs } from './modules/brief/collections/Briefs'
import { OptionSets } from './modules/brief/collections/OptionSets'
import { RateLimits } from './modules/brief/collections/RateLimits'
import { CreatorListings } from './modules/creators/collections/CreatorListings'
import { CreatorProfiles } from './modules/creators/collections/CreatorProfiles'
import { Articles } from './modules/guides/collections/Articles'
import { ArticleCategories, Authors } from './modules/guides/collections/Taxonomy'
import { LegalAcceptances } from './modules/legal/collections/LegalAcceptances'
import { LegalDocuments } from './modules/legal/collections/LegalDocuments'
import { Locations } from './modules/creators/collections/Locations'
import { LandingPage } from './modules/landing/globals/LandingPage'
import { Media } from './modules/media/collections/Media'
import { Categories } from './modules/personas/collections/Categories'
import { Pages } from './modules/pages/collections/Pages'
import { RemovedPaths } from './modules/pages/collections/RemovedPaths'
import { Personas } from './modules/personas/collections/Personas'
import { SiteSettings } from './modules/site-settings/globals/SiteSettings'

const dirname = path.dirname(fileURLToPath(import.meta.url))
const useS3 = Boolean(process.env.S3_BUCKET)

export default buildConfig({
  admin: {
    user: Users.slug,
    theme: 'all', // each editor picks light, dark or auto in their account (FR-044)
    importMap: { baseDir: path.resolve(dirname) },
    meta: { titleSuffix: ' · Shoot Project' },
  },
  collections: [Users, Personas, Categories, Locations, CreatorProfiles, CreatorListings, OptionSets, Briefs, Media, RateLimits, Pages, RemovedPaths, LegalDocuments, LegalAcceptances, Articles, ArticleCategories, Authors],
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
    pool: { connectionString: process.env.DATABASE_URI || '' },
    // Development pushes schema changes automatically; every change also gets a committed migration.
    push: process.env.NODE_ENV === 'development' && process.env.PAYLOAD_MIGRATING !== 'true',
    migrationDir: path.resolve(dirname, 'migrations'),
  }),
  sharp,
  plugins: useS3
    ? [
        s3Storage({
          collections: { media: true },
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
    : [],
})
