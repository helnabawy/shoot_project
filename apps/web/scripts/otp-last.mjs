#!/usr/bin/env node
// Prints the newest code the console provider wrote (feature 009, contracts/otp-provider.md), for local
// development only. The number is masked to its last 4 digits; the outbox is a delivery channel, not a log.
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

if (process.env.NODE_ENV === 'production') {
  console.error('otp:last is for local development only.')
  process.exit(1)
}
const outbox = join(import.meta.dirname, '..', '.otp-outbox')
const files = existsSync(outbox) ? readdirSync(outbox).filter((f) => f.endsWith('.json')) : []
if (files.length === 0) {
  console.error('No codes yet: request one with the console provider (OTP_PROVIDER unset or console).')
  process.exit(1)
}
const newest = files.map((f) => join(outbox, f)).sort((a, b) => statSync(b).mtimeMs - statSync(a).mtimeMs)[0]
const message = JSON.parse(readFileSync(newest, 'utf8'))
console.log(`${message.code}  (${message.channel} to …${String(message.to).slice(-4)}, ${message.sentAt})`)
