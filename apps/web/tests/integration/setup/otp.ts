import { authTokenV1, otpChallengeV1, problemV1 } from '@shoot/domain/api/v1'
import type { OtpMessage, OtpProvider, SendResult } from '@/modules/auth/otp/providers'
import { setOtpProvider } from '@/modules/auth/otp/providers'
import type { RouteHandler } from '@/shared/api/handler'

/** A provider that records every message instead of delivering it (contracts/otp-provider.md "Tests"). */
export function recordingProvider(): OtpProvider & { sent: OtpMessage[]; fail: SendResult | null } {
  const p = {
    name: 'recording',
    sent: [] as OtpMessage[],
    fail: null as SendResult | null,
    async send(message: OtpMessage): Promise<SendResult> {
      p.sent.push(message)
      return p.fail ?? { ok: true, ref: `ref-${p.sent.length}` }
    },
  }
  return p
}

export function installRecordingProvider() {
  const provider = recordingProvider()
  setOtpProvider(provider)
  return provider
}

export interface CallOptions {
  headers?: Record<string, string>
  body?: unknown
  method?: string
}

let address = 0
/** A fresh client address per test, so the per-address allowances never couple tests. */
export const freshAddress = () => `10.9.${Math.floor(++address / 250)}.${address % 250}`

export function call(handler: RouteHandler, path: string, { headers = {}, body, method = 'POST' }: CallOptions = {}) {
  return handler(
    new Request(`http://test/api/mobile/v1/${path}`, {
      method,
      headers: { 'content-type': 'application/json', ...headers },
      body: body === undefined ? undefined : JSON.stringify(body),
    }),
    { params: Promise.resolve({}) },
  )
}

export const bearer = (token: string) => ({ authorization: `Bearer ${token}` })

/** Request a code and return the challenge and the code the provider received. */
export async function requestFor(
  request: RouteHandler,
  provider: ReturnType<typeof recordingProvider>,
  phone: string,
  { channel = 'sms', headers = {} }: { channel?: 'sms' | 'whatsapp'; headers?: Record<string, string> } = {},
) {
  const res = await call(request, 'auth/otp/request', { body: { phone, channel }, headers: { 'x-forwarded-for': freshAddress(), ...headers } })
  if (res.status !== 202) throw new Error(`request answered ${res.status}: ${await res.text()}`)
  const challenge = otpChallengeV1.parse(await res.json())
  const message = provider.sent.at(-1)!
  return { challenge, code: message.code, message, res }
}

export async function verify(verifyHandler: RouteHandler, body: Record<string, unknown>, headers: Record<string, string> = {}) {
  const res = await call(verifyHandler, 'auth/otp/verify', { body, headers: { 'x-forwarded-for': freshAddress(), ...headers } })
  const json = (await res.json()) as unknown
  return { res, json, token: res.status === 200 ? authTokenV1.parse(json) : null, problem: res.status === 200 ? null : problemV1.parse(json) }
}

/** A code that differs from `code`. */
export const wrong = (code: string) => (code === '000000' ? '111111' : '000000')

let n = 1000000
/** A unique UAE mobile number in E.164 (never one of the console provider's failure numbers). */
export const freshPhone = () => `+97150${String(++n).padStart(7, '0')}`
