import { z } from 'zod'

// Error messages are translation keys (FR-039); forms resolve them with next-intl.
export const ACCOUNT_TYPES = ['seeker', 'provider'] as const
export type AccountType = (typeof ACCOUNT_TYPES)[number]

/** A profile lists at most this many professional types (CreatorProfiles.personas maxRows). */
export const MAX_PROVIDER_PERSONAS = 4

/**
 * The registration form's "Both / All" option carries several persona slugs in one value. The
 * option is built from the active personas, never from named professions.
 */
export const combinedPersonaValue = (slugs: readonly string[]): string => slugs.join(',')

const email = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email({ message: 'auth.errors.emailInvalid' }))

export const registerSchema = z
  .object({
    name: z.string().trim().min(2, 'auth.errors.nameLength').max(80, 'auth.errors.nameLength'),
    email,
    password: z.string().min(8, 'auth.errors.passwordLength').max(128, 'auth.errors.passwordLength'),
    accountType: z.enum(ACCOUNT_TYPES, { message: 'auth.errors.accountType' }),
    // One slug, or several from the combined option: always a list (empty for seekers).
    persona: z
      .string()
      .optional()
      .transform((v) => [...new Set((v ?? '').split(',').map((s) => s.trim()).filter(Boolean))]),
    categories: z.array(z.string()).optional(),
    // The checkbox of the registration form: stating acceptance of the Terms and Privacy Policy (spec US2).
    acceptTerms: z.literal('on', { message: 'auth.errors.acceptTerms' }),
  })
  .superRefine((data, ctx) => {
    if (data.accountType === 'provider' && data.persona.length === 0) {
      ctx.addIssue({ code: 'custom', path: ['persona'], message: 'auth.errors.personaRequired' })
    }
  })

export type RegisterInput = z.infer<typeof registerSchema>

export const loginSchema = z.object({
  email,
  password: z.string().min(1, 'auth.errors.passwordRequired'),
})

export type LoginInput = z.infer<typeof loginSchema>

/**
 * A provider must pick personas that are all currently active, at most as many as a profile holds;
 * seekers never need one (FR-019).
 */
export function isProviderRegistrationValid(
  input: { accountType: RegisterInput['accountType']; persona: readonly string[] },
  activePersonaIds: readonly string[],
): boolean {
  if (input.accountType === 'seeker') return true
  return (
    input.persona.length > 0 &&
    input.persona.length <= MAX_PROVIDER_PERSONAS &&
    input.persona.every((p) => activePersonaIds.includes(p))
  )
}
