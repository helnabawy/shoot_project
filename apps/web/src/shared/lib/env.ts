import { z } from 'zod'

const optional = z.string().trim().optional().transform((v) => (v ? v : undefined))

/** A comma-separated list, trimmed; every item must match `item` (empty or unset means unset). */
const list = (item: RegExp, message: string) =>
  z
    .string()
    .optional()
    .transform((v, ctx) => {
      if (!v?.trim()) return undefined
      const items = v.split(',').map((i) => i.trim())
      if (items.some((i) => !item.test(i))) {
        ctx.addIssue({ code: 'custom', message })
        return z.NEVER
      }
      return items
    })

// App links (feature 008, research R13): Apple team id + bundle id, the Android package and its signing certificates.
const IOS_APP_ID = /^[A-Z0-9]{10}\.[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)+$/
const ANDROID_PACKAGE = /^[a-zA-Z][a-zA-Z0-9_]*(\.[a-zA-Z][a-zA-Z0-9_]*)+$/
const CERT_SHA256 = /^[0-9A-Fa-f]{2}(:[0-9A-Fa-f]{2}){31}$/

const s3Keys = ['S3_BUCKET', 'S3_REGION', 'S3_ENDPOINT', 'S3_ACCESS_KEY_ID', 'S3_SECRET_ACCESS_KEY'] as const
// One-time-code delivery (feature 009, contracts/otp-provider.md): the vendor's variables, all or none.
const unifonicKeys = ['UNIFONIC_APP_SID', 'OTP_SMS_SENDER_ID', 'OTP_WHATSAPP_SENDER', 'OTP_WHATSAPP_TEMPLATE'] as const
const LOCAL_SITE = /^https?:\/\/(localhost|127\.0\.0\.1)(:|\/|$)/

export const envSchema = z
  .object({
    DATABASE_URI: z.string().regex(/^postgres(ql)?:\/\//, 'must be a postgres:// connection string'),
    PAYLOAD_SECRET: z.string().min(32, 'must be at least 32 characters (openssl rand -hex 32)'),
    NEXT_PUBLIC_SITE_URL: z.url('must be an absolute URL').transform((v) => v.replace(/\/$/, '')),
    PREVIEW_SECRET: z.string().min(16, 'must be at least 16 characters'),
    CRON_SECRET: z.string().min(16, 'must be at least 16 characters'),
    SEED_ADMIN_EMAIL: optional,
    SEED_ADMIN_PASSWORD: optional,
    S3_BUCKET: optional,
    S3_REGION: optional,
    S3_ENDPOINT: optional,
    S3_ACCESS_KEY_ID: optional,
    S3_SECRET_ACCESS_KEY: optional,
    NODE_ENV: optional,
    E2E_CLOCK: optional,
    APP_IOS_APP_IDS: list(IOS_APP_ID, 'must be comma-separated TEAMID.bundle.id values, e.g. ABCDE12345.ae.shoot.app'),
    APP_ANDROID_PACKAGE: optional.refine((v) => v === undefined || ANDROID_PACKAGE.test(v), 'must be a package name, e.g. ae.shoot.app'),
    OTP_PROVIDER: z.enum(['console', 'unifonic'], { message: 'must be console or unifonic' }).optional(),
    OTP_HMAC_SECRET: optional.refine((v) => v === undefined || v.length >= 32, 'must be at least 32 characters (openssl rand -hex 32)'),
    OTP_ALLOW_FIXED_CODE: z.enum(['1']).optional(),
    OTP_FIXED_CODE: optional.refine((v) => v === undefined || /^\d{6}$/.test(v), 'must be six digits'),
    UNIFONIC_APP_SID: optional,
    OTP_SMS_SENDER_ID: optional,
    OTP_WHATSAPP_SENDER: optional,
    OTP_WHATSAPP_TEMPLATE: optional,
    APP_ANDROID_CERT_SHA256: list(CERT_SHA256, 'must be comma-separated SHA-256 fingerprints, AA:BB:… (32 bytes)').transform((v) =>
      v?.map((c) => c.toUpperCase()),
    ),
  })
  .superRefine((env, ctx) => {
    // The e2e clock override moves time for /api/cron/bookings; it must never reach a deployment.
    const deployed = env.NODE_ENV === 'production' && !LOCAL_SITE.test(env.NEXT_PUBLIC_SITE_URL)
    if (env.E2E_CLOCK === '1' && deployed) {
      ctx.addIssue({ code: 'custom', path: ['E2E_CLOCK'], message: 'is for local end-to-end runs only; unset it in production' })
    }
    const set = s3Keys.filter((k) => env[k])
    if (set.length > 0 && set.length < s3Keys.length) {
      ctx.addIssue({
        code: 'custom',
        path: ['S3_BUCKET'],
        message: `S3 storage needs all of ${s3Keys.join(', ')} (missing: ${s3Keys.filter((k) => !env[k]).join(', ')})`,
      })
    }
    // The console provider writes codes to a local file: never in a deployment (research R9, OT-US2-S5).
    if (deployed && (env.OTP_PROVIDER ?? 'console') === 'console' && env.OTP_ALLOW_FIXED_CODE !== '1') {
      ctx.addIssue({
        code: 'custom',
        path: ['OTP_PROVIDER'],
        message: 'the console provider is for local development and tests only; set a real provider in production',
      })
    }
    if (deployed && !env.OTP_HMAC_SECRET) {
      ctx.addIssue({ code: 'custom', path: ['OTP_HMAC_SECRET'], message: 'is required in production (openssl rand -hex 32)' })
    }
    if (deployed && env.OTP_FIXED_CODE && env.OTP_ALLOW_FIXED_CODE !== '1') {
      ctx.addIssue({ code: 'custom', path: ['OTP_FIXED_CODE'], message: 'a fixed code is for local testing only; unset it in production (or set OTP_ALLOW_FIXED_CODE=1 on a throwaway test deployment)' })
    }
    const missingVendor = unifonicKeys.filter((k) => !env[k])
    const someVendor = missingVendor.length < unifonicKeys.length
    if ((env.OTP_PROVIDER === 'unifonic' || someVendor) && missingVendor.length > 0) {
      ctx.addIssue({
        code: 'custom',
        path: ['OTP_PROVIDER'],
        message: `the unifonic provider needs all of ${unifonicKeys.join(', ')} (missing: ${missingVendor.join(', ')})`,
      })
    }
  })

export type Env = z.infer<typeof envSchema>

/** DATABASE_URI, or DATABASE_URL as the Vercel Neon integration names it (per-preview branches included). */
export function databaseUri(source: Record<string, string | undefined>): string | undefined {
  return source.DATABASE_URI || source.DATABASE_URL
}

/** Parses and validates environment variables; throws one readable message listing every problem. */
export function parseEnv(source: Record<string, string | undefined>): Env {
  const result = envSchema.safeParse({ ...source, DATABASE_URI: databaseUri(source) })
  if (!result.success) {
    const lines = result.error.issues.map((i) => `  - ${i.path.join('.') || 'env'}: ${i.message}`)
    throw new Error(`Invalid environment configuration:\n${lines.join('\n')}`)
  }
  return result.data
}

let cached: Env | undefined
/** Validated environment for the running process (fails fast on first use). */
export function env(): Env {
  cached ??= parseEnv(process.env)
  return cached
}

export function hasS3(e: Env): boolean {
  return Boolean(e.S3_BUCKET)
}
