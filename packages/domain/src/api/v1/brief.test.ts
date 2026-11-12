import { describe, expect, it } from 'vitest'
import { briefReceiptV1, briefRecordV1 } from './brief'
import receipt from './examples/brief-receipt.json'
import record from './examples/brief-record.json'

describe('briefRecordV1', () => {
  it('ML-US1-S6 accepts the shared example', () => {
    expect(briefRecordV1.parse(record).selections).toHaveLength(3)
  })

  it('ML-US1-S6 date is optional and defaults to null', () => {
    expect(briefRecordV1.parse({ selections: [{ token: 'persona', value: 'a' }] }).date).toBeNull()
  })

  it('refuses no selections and a badly formed date, with message keys', () => {
    const none = briefRecordV1.safeParse({ selections: [], date: null })
    expect(none.success).toBe(false)
    if (!none.success) expect(none.error.issues[0]?.message).toBe('brief.errors.required')
    const bad = briefRecordV1.safeParse({ selections: [{ token: 'a', value: 'b' }], date: '5 Dec' })
    expect(bad.success).toBe(false)
  })
})

describe('briefReceiptV1', () => {
  it('ML-US1-S6 accepts the shared example and a null Quick Match path', () => {
    expect(briefReceiptV1.parse(receipt).reference).toBe('B-2026-0142')
    expect(briefReceiptV1.parse({ ...receipt, matchPath: null, whatsappUrl: null }).matchPath).toBeNull()
  })
})
