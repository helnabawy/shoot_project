import { getSessionSummary } from '@/modules/auth/session'

export const dynamic = 'force-dynamic'

/**
 * The signed-in member for the site header ({ user: null } for visitors). Read from the browser so
 * every public page stays statically cached; the header swaps "Log in" for the avatar after load.
 */
export async function GET() {
  const user = await getSessionSummary()
  return Response.json({ user }, { headers: { 'Cache-Control': 'private, no-store' } })
}
