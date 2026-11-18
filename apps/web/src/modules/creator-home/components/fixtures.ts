import type { CreatorHomeV1 } from '@shoot/domain/api/v1'
import ar from '../../../../messages/ar.json'
import { buildHomeView, type Words } from '../view'
import type { HomeHrefs } from './hrefs'

/** The page's words for component tests: English, plain. */
export const words: Words = {
  title: (v) => `${v.occasion} in ${v.emirate}`,
  titleNoOccasion: (v) => `${v.profession} in ${v.emirate}`,
  answerBy: (time) => `Answer by ${time}`,
  dateToAgree: 'To agree',
  sentAt: (relative) => relative,
  stepLabel: (step) => ({ samples: 'Work samples', places: 'What you do and where' })[step] ?? step,
}

/** The page's Arabic words, from the real message file. */
const fill = (template: string, values: Record<string, string>) => template.replace(/\{(\w+)\}/g, (_, k: string) => values[k] ?? `{${k}}`)
export const arWords: Words = {
  title: (v) => fill(ar.creatorHome.title, v),
  titleNoOccasion: (v) => fill(ar.creatorHome.titleNoOccasion, v),
  answerBy: (time) => fill(ar.creatorHome.answerBy, { time }),
  dateToAgree: ar.creatorHome.dateToAgree,
  sentAt: (relative) => relative,
  stepLabel: (step) => step,
}

export const hrefs: HomeHrefs = {
  home: '/',
  decline: (key) => `/?decline=${key}#answer`,
  bookings: '/account/bookings',
  booking: (ref) => `/account/bookings/${ref}`,
  availability: '/account/availability',
  profile: '/account/profile',
  inbox: '/account/inbox',
}

export const reasons = [
  { value: 'too-far', label: 'Too far' },
  { value: 'not-my-style', label: 'Not my kind of work' },
]

export const NOW = new Date('2026-11-17T10:00:00.000Z')

export const liveHome: CreatorHomeV1 = {
  name: 'Omar K.',
  code: 'SH-0087',
  professions: ['Photographer'],
  photo: null,
  mode: 'live',
  needs: [],
  counts: { toAnswer: 3, comingUp: 1, completed: 4 },
  queue: [
    { kind: 'booking', ref: 'Q-2026-0142', occasion: 'Wedding', emirate: 'Dubai', profession: 'Photographer', date: '2026-11-28', time: '16:00', length: '4 hours', client: 'Sara M.', respondBy: '2026-11-17T14:00:00.000Z' },
    { kind: 'brief', ref: 'B-7K2QX', persona: '1', occasion: 'Birthday party', emirate: 'Dubai', profession: 'Photographer', date: '2026-11-20', sentAt: '2026-11-17T08:00:00.000Z' },
    { kind: 'brief', ref: 'B-9QX4M', persona: '1', occasion: 'Product launch', emirate: 'Abu Dhabi', profession: 'Photographer', date: null, sentAt: '2026-11-16T10:00:00.000Z' },
  ],
  next: { ref: 'Q-2026-0131', quotation: 'Q-2026-0131', occasion: 'Product shoot', emirate: 'Sharjah', date: '2026-11-19', time: '10:00', length: '2 hours', paid: true },
  today: 'free',
  reasons,
}

export const view = (home: Partial<CreatorHomeV1> = {}, locale: 'en' | 'ar' = 'en') => buildHomeView({ ...liveHome, ...home }, locale, locale === 'ar' ? arWords : words, NOW)
