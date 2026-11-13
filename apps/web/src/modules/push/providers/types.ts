/** One app notification for one device (feature 019, contracts/mobile-api.md "Push message"). */
export interface PushMessage {
  token: string
  title: string
  body: string
  /** `event` and the app `path` the tap opens. */
  data: Record<string, string>
}

/** `gone`: the device is no longer registered and is forgotten (FR-016). `failed`: try again next time. */
export type PushResult = 'sent' | 'gone' | 'failed'

export interface PushProvider {
  readonly name: string
  send(message: PushMessage): Promise<PushResult>
}
