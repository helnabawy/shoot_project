import type { PushMessage, PushProvider } from './types'

/** Local runs and tests: keeps the messages in memory and logs one line without the device token. */
export function consoleProvider(log: (line: string) => void = (line) => console.info(line)): PushProvider & { sent: PushMessage[] } {
  const sent: PushMessage[] = []
  return {
    name: 'console',
    sent,
    async send(message) {
      sent.push(message)
      log(`[push] ${message.data.event ?? ''} → …${message.token.slice(-4)}: ${message.title}`)
      return 'sent'
    },
  }
}

/** PUSH_PROVIDER=off (the default): nothing is sent. */
export const offProvider: PushProvider = { name: 'off', send: async () => 'failed' }
