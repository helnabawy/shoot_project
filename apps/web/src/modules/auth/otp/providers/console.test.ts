import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { renderSms } from '../message'
import { consoleProvider } from './console'
import type { OtpMessage } from './types'

const message: OtpMessage = {
  challengeId: '0f6f1f0e-4a3b-4c55-9d0e-1b2c3d4e5f60',
  channel: 'sms',
  to: '+971501234567',
  code: '482713',
  locale: 'en',
  text: 'Your Shoot code is 482713.',
}
const signal = () => new AbortController().signal
const dirs: string[] = []
const outbox = () => {
  const dir = mkdtempSync(join(tmpdir(), 'otp-outbox-'))
  dirs.push(dir)
  return dir
}

describe('the console provider', () => {
  afterEach(() => {
    for (const d of dirs.splice(0)) rmSync(d, { recursive: true, force: true })
    vi.restoreAllMocks()
  })

  it('writes .otp-outbox/<challengeId>.json with the documented fields', async () => {
    const dir = outbox()
    expect(await consoleProvider(dir).send(message, { signal: signal() })).toEqual({ ok: true, ref: null })
    const file = JSON.parse(readFileSync(join(dir, `${message.challengeId}.json`), 'utf8')) as Record<string, unknown>
    expect(Object.keys(file)).toEqual(['challengeId', 'channel', 'to', 'code', 'locale', 'text', 'sentAt'])
    expect(file).toMatchObject({ ...message })
  })

  it('resolves the documented failure numbers', async () => {
    const p = consoleProvider(outbox())
    expect(await p.send({ ...message, channel: 'whatsapp', to: '+971500000000' }, { signal: signal() })).toEqual({ ok: false, reason: 'unreachable' })
    expect(await p.send({ ...message, to: '+971500000000' }, { signal: signal() })).toEqual({ ok: true, ref: null })
    expect(await p.send({ ...message, to: '+971509999999' }, { signal: signal() })).toEqual({ ok: false, reason: 'unavailable' })
    const aborted = new AbortController()
    aborted.abort()
    expect(await p.send(message, { signal: aborted.signal })).toEqual({ ok: false, reason: 'unavailable' })
  })

  it('a write failure resolves unavailable and the console never sees the code or number', async () => {
    const spies = (['log', 'info', 'warn', 'error', 'debug'] as const).map((m) => vi.spyOn(console, m).mockImplementation(() => {}))
    expect(await consoleProvider('/dev/null/nope').send(message, { signal: signal() })).toEqual({ ok: false, reason: 'unavailable' })
    const said = spies.flatMap((s) => s.mock.calls).flat().map(String).join('\n')
    expect(said).not.toContain('482713')
    expect(said).not.toContain('501234567')
  })
})

describe('OT-US1-S1 the SMS text', () => {
  it('is in the person language and ends with the domain-bound line, unchanged in Arabic (FR-042)', () => {
    const en = renderSms('en', '482713', 'https://shoot.ae')
    expect(en).toBe("Your Shoot code is 482713. It expires in 5 minutes. Don't share it.\n\n@shoot.ae #482713")
    const ar = renderSms('ar', '482713', 'https://shoot.ae')
    expect(ar).toContain('482713')
    expect(ar).not.toBe(en)
    expect(ar.split('\n').at(-1)).toBe('@shoot.ae #482713')
  })
})
