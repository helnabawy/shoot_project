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
    APP_ANDROID_CERT_SHA256: list(CERT_SHA256, 'must be comma-separated SHA-256 fingerprints, AA:BB:… (32 bytes)').transform((v) =>
      v?.map((c) => c.toUpperCase()),
    ),
  })
  .superRefine((env, ctx) => {
    // The e2e clock override moves time for /api/cron/bookings; it must never reach a deployment.
    if (env.E2E_CLOCK === '1' && env.NODE_ENV === 'production' && !/^https?:\/\/(localhost|127\.0\.0\.1)(:|\/|$)/.test(env.NEXT_PUBLIC_SITE_URL)) {
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
