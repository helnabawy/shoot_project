/**
 * Payload errors are matched by the `name` Payload sets on every error class, never with
 * `instanceof`: a production build can place Payload's classes in more than one server chunk,
 * and an error thrown from one chunk is then not an instance of the class imported in another.
 */
export type PayloadErrorName = 'APIError' | 'AuthenticationError' | 'LockedAuth' | 'ValidationError' | 'Forbidden'

export const isPayloadError = (error: unknown, name: PayloadErrorName): error is Error & { status?: number; data?: unknown } =>
  error instanceof Error && error.name === name

/** The HTTP status a Payload error carries (APIError and its subclasses), if any. */
export const errorStatus = (error: unknown): number | undefined => {
  const status = typeof error === 'object' && error !== null ? (error as { status?: unknown }).status : undefined
  return typeof status === 'number' ? status : undefined
}
