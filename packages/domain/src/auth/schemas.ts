import { z } from 'zod'

// Error messages are translation keys (FR-039); forms resolve them with next-intl.
export const ACCOUNT_TYPES = ['seeker', 'provider'] as const
export type AccountType = (typeof ACCOUNT_TYPES)[number]

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
    persona: z.string().trim().optional().transform((v) => (v ? v : undefined)),
    categories: z.array(z.string()).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.accountType === 'provider' && !data.persona) {
      ctx.addIssue({ code: 'custom', path: ['persona'], message: 'auth.errors.personaRequired' })
    }
  })

export type RegisterInput = z.infer<typeof registerSchema>

export const loginSchema = z.object({
  email,
  password: z.string().min(1, 'auth.errors.passwordRequired'),
})

export type LoginInput = z.infer<typeof loginSchema>

/** A provider must pick a persona that is currently active; seekers never need one (FR-019). */
export function isProviderRegistrationValid(
  input: { accountType: RegisterInput['accountType']; persona?: string | undefined },
  activePersonaIds: readonly string[],
): boolean {
  if (input.accountType === 'seeker') return true
  return Boolean(input.persona && activePersonaIds.includes(input.persona))
}
