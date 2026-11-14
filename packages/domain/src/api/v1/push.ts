import { z } from 'zod'

/** Feature 019: app push registration and the member's on/off switch. */

export const pushDeviceRequestV1 = z.object({
  token: z.string().min(1).max(4096),
  platform: z.enum(['ios', 'android']),
  locale: z.enum(['en', 'ar']),
})
export type PushDeviceRequestV1 = z.infer<typeof pushDeviceRequestV1>

export const pushPreferenceV1 = z.object({ enabled: z.boolean() })
export type PushPreferenceV1 = z.infer<typeof pushPreferenceV1>

export const pushTokenParamV1 = z.object({ token: z.string().min(1).max(4096) })
