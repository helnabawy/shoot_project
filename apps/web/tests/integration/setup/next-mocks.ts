// Stand-ins for Next's request APIs so the real server actions run in integration tests.
// Use from a test file: vi.mock('next/headers', async () => (await import('./setup/next-mocks')).nextHeaders)

export const jar = new Map<string, string>()

export const nextHeaders = {
  cookies: async () => ({
    get: (name: string) => (jar.has(name) ? { name, value: jar.get(name)! } : undefined),
    set: (name: string, value: string) => void jar.set(name, value),
    delete: (name: string) => void jar.delete(name),
  }),
  headers: async () => new Headers({ cookie: [...jar].map(([k, v]) => `${k}=${v}`).join('; ') }),
  draftMode: async () => ({ isEnabled: false }),
}

export class Redirect extends Error {
  constructor(public url: string) {
    super(`NEXT_REDIRECT ${url}`)
  }
}

export const nextNavigation = {
  redirect: (url: string) => {
    throw new Redirect(url)
  },
  permanentRedirect: (url: string) => {
    throw new Redirect(url)
  },
  notFound: () => {
    throw new Error('NEXT_NOT_FOUND')
  },
}

export const i18nNavigation = {
  redirect: (arg: unknown) => {
    throw new Redirect(JSON.stringify(arg))
  },
}

/** Runs an action that ends in a redirect and returns where it went. */
export async function redirectOf(run: () => Promise<unknown>): Promise<string> {
  try {
    await run()
  } catch (error) {
    if (error instanceof Redirect) return error.url
    throw error
  }
  throw new Error('expected a redirect')
}

/** Acts as a fresh anonymous visitor (new visitor cookie, no session). */
export function asVisitor(id = crypto.randomUUID()) {
  jar.clear()
  jar.set('sp_vid', id)
}

/** Acts as a signed-in member: a real Payload session cookie. */
export async function signIn(payload: { login: (args: never) => Promise<{ token?: string }> }, email: string, password = 'password-123') {
  const { token } = await payload.login({ collection: 'users', data: { email, password } } as never)
  jar.set('payload-token', token ?? '')
}

export function form(entries: Record<string, string | string[] | number | undefined>) {
  const data = new FormData()
  for (const [key, value] of Object.entries(entries)) {
    if (value === undefined) continue
    for (const v of Array.isArray(value) ? value : [value]) data.append(key, String(v))
  }
  return data
}
