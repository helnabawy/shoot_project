import 'payload'

declare module 'payload' {
  interface RequestContext {
    /** Set by seeds, tests and scripts so hooks do not call Next.js revalidation. */
    disableRevalidate?: boolean
    /** Anonymous visitor id from the site's cookie, used for brief rate limits. */
    visitorId?: string
  }
}
