import { z } from 'zod'
import { defineHandler, problem } from './handler'

/**
 * Every address under `/api/mobile` that no route matches, `/api/mobile/v2/…` included, answers a
 * 404 problem (FR-010), so Payload's own 404 never reaches the app.
 */
export const notFoundV1 = defineHandler({
  auth: 'none',
  cache: 'no-store',
  input: z.object({}),
  output: z.never(),
  run: async () => problem(404, 'api.errors.notFound'),
})
