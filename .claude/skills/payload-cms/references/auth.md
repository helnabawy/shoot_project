# Auth with Payload's built-in authentication

Payload gives an auth-enabled collection password hashing, login/logout,
JWT in an HTTP-only cookie, email verification, forgot/reset password, login
attempt limiting and account locking. Use these; do not add NextAuth or a
custom JWT layer (constitution Principle VIII).

## Users collection

```ts
// apps/web/src/modules/auth/collections/Users.ts
import type { CollectionConfig } from 'payload'
import { anyone, isAdmin, isAdminOrSelf, isEditor } from '@/shared/payload/access'

export const Users: CollectionConfig = {
  slug: 'users',
  auth: {
    tokenExpiration: 60 * 60 * 24 * 7,   // seconds; 7 days
    maxLoginAttempts: 5,
    lockTime: 15 * 60 * 1000,            // ms; 15 minutes
    verify: false,                       // flip to true when email sending is configured
    cookies: { sameSite: 'Lax', secure: process.env.NODE_ENV === 'production' },
  },
  admin: { useAsTitle: 'email' },
  access: {
    admin: isEditor,          // admins and editors may open /admin (FR-016)
    create: anyone,          // public registration
    read: isAdminOrSelf,
    update: isAdminOrSelf,
    delete: isAdmin,
  },
  fields: [
    { name: 'name', type: 'text', required: true },
    { name: 'roles', type: 'select', hasMany: true, defaultValue: ['member'],
      options: ['admin', 'editor', 'member'], saveToJWT: true,
      access: { create: isAdmin, update: isAdmin } },   // members cannot grant themselves admin
    { name: 'accountType', type: 'select', required: true, options: ['seeker', 'provider'],
      admin: { description: 'seeker = needs a professional; provider = offers services' } },
    { name: 'persona', type: 'relationship', relationTo: 'personas',
      validate: (value, { data }) => data?.accountType !== 'provider' || Boolean(value) || 'Choose a professional type',
      admin: { condition: (data) => data.accountType === 'provider' } },
    { name: 'categories', type: 'relationship', relationTo: 'categories', hasMany: true,
      admin: { condition: (data) => data.accountType === 'provider' } },
    { name: 'phone', type: 'text' },
  ],
}
```

Field-level `access` on `roles` is what stops privilege escalation through the
public `create` endpoint: the field is silently ignored for non-admins, so a
registration payload containing `roles: ['admin']` still yields a member.
Write an integration test for exactly that.

## REST endpoints Payload exposes for `users`

| Purpose            | Method & path                         |
|--------------------|---------------------------------------|
| Register           | `POST /api/users`                     |
| Login              | `POST /api/users/login`               |
| Logout             | `POST /api/users/logout`              |
| Current user       | `GET  /api/users/me`                  |
| Refresh token      | `POST /api/users/refresh-token`       |
| Forgot password    | `POST /api/users/forgot-password`     |
| Reset password     | `POST /api/users/reset-password`      |
| Verify email       | `POST /api/users/verify/:token`       |
| Unlock (admin)     | `POST /api/users/unlock`              |

Login responses set the `payload-token` cookie when called with
`credentials: 'include'`. The site's own forms do not call these from the
browser; they use server actions (below) so validation, error mapping and
redirects stay on the server. The endpoints remain the contract for any future
mobile app and are what the integration tests exercise.

## Server actions for the site forms

```ts
// apps/web/src/modules/auth/actions.ts
'use server'
import { cookies } from 'next/headers'
import { registerSchema, loginSchema } from '@shoot/domain/auth'
import { getPayloadClient } from '@/shared/lib/payload'

export async function login(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = loginSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return { errors: parsed.error.flatten().fieldErrors }
  const payload = await getPayloadClient()
  try {
    const { token, exp } = await payload.login({ collection: 'users', data: parsed.data })
    ;(await cookies()).set('payload-token', token!, {
      httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax',
      path: '/', expires: new Date(exp! * 1000),
    })
  } catch {
    return { formError: 'auth.login.invalid' }   // message key, translated by the form (FR-039); never reveal which field
  }
  const next = String(formData.get('next') ?? '/account')
  redirect({ href: next.startsWith('/') ? next : '/account', locale: await getLocale() })   // from @/i18n/navigation
}
```

- Validation schemas live in `packages/domain/src/auth` and are shared with
  component tests and the API contract.
- Map every Payload error to a user-safe message. Locked accounts return a
  distinct message key (`auth.login.locked`, "Too many attempts, try again in 15 minutes").
- Registration = `payload.create({ collection: 'users', data })` followed by
  `payload.login` so the user lands signed in.
- Logout clears the cookie and redirects.

## Reading the session in server components

```ts
import { headers } from 'next/headers'
export async function getCurrentUser() {
  const payload = await getPayloadClient()
  const { user } = await payload.auth({ headers: await headers() })
  return user ?? null
}
```

Protect routes in the route segment (`account/layout.tsx`) by calling this
and redirecting to `/login?next=/account` when null. Do not rely on client
state for authorisation.

## What to test (integration, real Payload + PostgreSQL container)

1. Register with valid data → 201, user has `roles: ['member']`, password hash not returned.
2. Register with `roles: ['admin']` in the body → still a member.
3. Register with an existing email → clear validation error, no second user.
4. Login with wrong password 5 times → 6th attempt reports locked even with the right password.
5. `GET /api/users/me` with and without cookie.
6. Member cannot read another member's document; admin can.
7. Member cannot open the admin panel (`access.admin` false); editor and admin can.

Component tests cover the forms' validation messages and pending states;
one Playwright journey covers register → redirected to account → logout →
login.
