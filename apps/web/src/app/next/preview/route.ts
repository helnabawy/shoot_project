import { draftMode, headers } from 'next/headers'
import { redirect } from 'next/navigation'
import type { NextRequest } from 'next/server'
import { hasRole } from '@/shared/payload/access'
import { getPayloadClient } from '@/shared/lib/payload'

/** Editors preview unpublished landing content (FR-013): needs the secret and an editor session. */
export async function GET(request: NextRequest) {
  const secret = request.nextUrl.searchParams.get('secret')
  const path = request.nextUrl.searchParams.get('path') ?? '/'
  if (!process.env.PREVIEW_SECRET || secret !== process.env.PREVIEW_SECRET) {
    return new Response('Invalid preview secret', { status: 401 })
  }
  const payload = await getPayloadClient()
  const { user } = await payload.auth({ headers: await headers() })
  if (!hasRole(user as never, 'admin', 'editor')) return new Response('Editors only', { status: 403 })
  ;(await draftMode()).enable()
  redirect(path.startsWith('/') && !path.startsWith('//') ? path : '/')
}
