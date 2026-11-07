import { screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { renderWithLocale } from '../../../../tests/setup/render'
import type { MyIdentity } from '../my-profile'
import { ProfileSteps } from './ProfileSteps'

const doc = (state: MyIdentity['emirates-id']['state']) => ({ state, uploadedAt: null, note: '', filename: '' })
const identity = (a: MyIdentity['emirates-id']['state'], b: MyIdentity['emirates-id']['state']): MyIdentity => ({ 'emirates-id': doc(a), 'trade-license': doc(b) })
const base = { samples: 0, links: 0, blocked: 0, status: 'draft' as const, identity: identity('missing', 'missing') }

const step = (key: string) => screen.getByTestId(`step-${key}`)

describe('CP-FR-015 profile steps', () => {
  it('a new profile says plainly it is not complete, why it matters, and how many required steps are left', () => {
    renderWithLocale(<ProfileSteps {...base} missing={['displayName', 'gender', 'specialties', 'cities', 'emiratesId', 'tradeLicense']} />)
    const warning = screen.getByTestId('profile-incomplete')
    expect(warning).toHaveTextContent("Your profile isn't complete yet.")
    expect(warning).toHaveTextContent("Clients can't find or book you until our team approves your profile")
    expect(warning).toHaveTextContent('4 steps need your attention.')
  })

  it('lists the seven steps in page order, each linking to its section', () => {
    renderWithLocale(<ProfileSteps {...base} missing={[]} />)
    const links = within(screen.getByRole('navigation', { name: 'Your profile, step by step' })).getAllByRole('link')
    expect(links.map((a) => a.getAttribute('href'))).toEqual(['#sec-basics', '#sec-about', '#sec-places', '#sec-links', '#sec-samples', '#sec-calendar', '#sec-identity'])
  })

  it('names exactly what each step still needs', () => {
    renderWithLocale(<ProfileSteps {...base} missing={['specialties', 'languages', 'emiratesId', 'tradeLicense']} />)
    expect(step('basics')).toHaveTextContent('Done')
    expect(step('places')).toHaveTextContent('Needs what you shoot and a language')
    expect(step('places')).toHaveAttribute('data-state', 'attention')
    expect(step('identity')).toHaveTextContent('Needs your Emirates ID and your trade license')
  })

  it('optional steps say what is there, or that they are optional', () => {
    renderWithLocale(<ProfileSteps {...base} missing={[]} samples={3} links={0} blocked={1} />)
    expect(step('samples')).toHaveTextContent('3 samples')
    expect(step('links')).toHaveTextContent('Optional')
    expect(step('calendar')).toHaveTextContent('1 day blocked')
  })

  it('CP-FR-013 identity reads the check: waiting, verified, or a document to send again', () => {
    const { unmount } = renderWithLocale(<ProfileSteps {...base} missing={[]} identity={identity('pending', 'verified')} />)
    expect(step('identity')).toHaveTextContent('Waiting for our check')
    unmount()
    renderWithLocale(<ProfileSteps {...base} missing={['tradeLicense']} identity={identity('verified', 'rejected')} />)
    expect(step('identity')).toHaveTextContent('Needs your trade license again')
  })

  it('a complete draft is told to send it; a profile under review or live gets no message', () => {
    const { unmount } = renderWithLocale(<ProfileSteps {...base} missing={[]} />)
    expect(screen.queryByTestId('profile-incomplete')).toBeNull()
    expect(screen.getByTestId('profile-ready')).toHaveTextContent('Everything we need is here.')
    unmount()
    renderWithLocale(<ProfileSteps {...base} missing={[]} status="live" />)
    expect(screen.queryByTestId('profile-ready')).toBeNull()
  })

  it('reads in Arabic', () => {
    renderWithLocale(<ProfileSteps {...base} missing={['displayName']} />, { locale: 'ar' })
    expect(screen.getByTestId('profile-incomplete')).toHaveTextContent('ملفك غير مكتمل بعد.')
    expect(step('basics')).toHaveTextContent('ينقصها اسمك')
  })
})
