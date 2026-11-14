import type { BriefCardView } from './BriefCard'

export const item = (over: Partial<BriefCardView> = {}): BriefCardView => ({
  ref: 'B-7K2QX',
  persona: '1',
  profession: 'Photographer',
  occasion: 'a birthday party',
  sentence: 'I need a photographer for a birthday party in Dubai',
  emirate: 'Dubai',
  date: '2026-11-20',
  sentAt: '2026-11-13T09:00:00.000Z',
  answer: null,
  reason: null,
  outcome: 'open',
  dateLabel: 'Fri 20 Nov',
  sentLabel: 'Fri 13 Nov',
  ...over,
})

export const reasons = [
  { value: 'not-free', label: 'Not free that day' },
  { value: 'too-far', label: 'Too far' },
]
