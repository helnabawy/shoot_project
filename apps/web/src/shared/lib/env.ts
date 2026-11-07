import { z } from 'zod'

const optional = z.string().trim().optional().transform((v) => (v ? v : undefined))

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
  })
  .superRefine((env, ctx) => {
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

/** Parses and validates environment variables; throws one readable message listing every problem. */
export function parseEnv(source: Record<string, string | undefined>): Env {
  const result = envSchema.safeParse(source)
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
