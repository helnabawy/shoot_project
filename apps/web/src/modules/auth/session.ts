import 'server-only'
import { headers } from 'next/headers'
import { redirect } from '@/i18n/navigation'
import type { User } from '@/payload-types'
import type { Locale } from '@/shared/lib/locale'
import { getPayloadClient } from '@/shared/lib/payload'

/** The signed-in member, read from the payload-token cookie; null for visitors. */
export async function getCurrentUser(): Promise<User | null> {
  const payload = await getPayloadClient()
  const { user } = await payload.auth({ headers: await headers() })
  return user && user.collection === 'users' ? (user as User) : null
}

/** Protects a page: visitors are sent to log in and brought back afterwards (FR-025). */
export async function requireUser(locale: Locale, next: string): Promise<User> {
  const user = await getCurrentUser()
  if (!user) {
    redirect({ href: { pathname: '/login', query: { next } }, locale })
  }
  return user as User
}
