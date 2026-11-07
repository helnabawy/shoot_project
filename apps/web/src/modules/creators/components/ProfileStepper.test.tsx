import { profileStrength, STRENGTH_ITEMS, type ReviewField, type StrengthItem } from '@shoot/domain/creators'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { renderWithLocale } from '../../../../tests/setup/render'
import { ProfileOverview, ProfileStepsProvider, StepPanel } from './ProfileStepper'

const has = (over: Partial<Record<StrengthItem, boolean>> = {}) => ({ ...(Object.fromEntries(STRENGTH_ITEMS.map((i) => [i, false])) as Record<StrengthItem, boolean>), ...over })
const identity = { 'emirates-id': 'missing', 'trade-license': 'missing' } as const

function view(missing: ReviewField[], over: Partial<Parameters<typeof ProfileOverview>[0]> = {}, locale: 'en' | 'ar' = 'en') {
  const strength = profileStrength({ missing, has: has() })
  return renderWithLocale(
    <ProfileStepsProvider initial="basics">
      <ProfileOverview percent={strength.percent} steps={strength.steps} status="draft" identity={identity} links={0} samples={0} blocked={0} {...over} />
      <StepPanel step="basics">
        <p>Basics panel</p>
      </StepPanel>
      <StepPanel step="about">
        <p>About panel</p>
      </StepPanel>
    </ProfileStepsProvider>,
    { locale },
  )
}
const step = (key: string) => screen.getByTestId(`step-${key}`)
const hiddenWithJs = (text: string) => screen.getByText(text).closest('[role="tabpanel"]')!.className.includes('[.js_&]:hidden')

describe('CP-FR-016 profile stepper', () => {
  it('shows the completion as one number and a progress bar', () => {
    view(['displayName', 'gender', 'emiratesId', 'tradeLicense'])
    // 4 of 8 required done, nothing recommended: 4 of 14.
    expect(screen.getByTestId('profile-percent')).toHaveTextContent('29%')
    expect(screen.getByRole('progressbar', { name: 'Profile strength' })).toHaveAttribute('aria-valuenow', '29')
  })

  it('says plainly the profile is not complete, and how many steps need attention', () => {
    view(['displayName', 'gender', 'emiratesId', 'tradeLicense'])
    expect(screen.getByTestId('profile-incomplete')).toHaveTextContent("Your profile isn't complete yet.")
    expect(screen.getByTestId('profile-incomplete')).toHaveTextContent('3 steps need your attention.')
  })

  it('gives each step tab its state: what it needs, what to add, or done', () => {
    view(['specialties', 'emiratesId'], { links: 2 })
    expect(screen.getAllByRole('tab')).toHaveLength(7)
    expect(step('places')).toHaveAttribute('data-state', 'attention')
    expect(step('places')).toHaveTextContent('Needs what you shoot')
    expect(step('basics')).toHaveTextContent('Add a photo and a short bio')
    expect(step('calendar')).toHaveTextContent('All days free')
    expect(step('identity')).toHaveTextContent('Needs your Emirates ID')
  })

  it('opens one step at a time: a tab, the arrow keys, or Next', async () => {
    const user = userEvent.setup()
    view([])
    expect(step('basics')).toHaveAttribute('aria-selected', 'true')
    expect(hiddenWithJs('About panel')).toBe(true)
    await user.click(step('about'))
    expect(step('about')).toHaveAttribute('aria-selected', 'true')
    expect(hiddenWithJs('About panel')).toBe(false)
    expect(hiddenWithJs('Basics panel')).toBe(true)
    await user.keyboard('{ArrowDown}')
    expect(step('places')).toHaveAttribute('aria-selected', 'true')
    await user.click(step('basics'))
    await user.click(screen.getAllByTestId('step-next')[0]!)
    expect(step('about')).toHaveAttribute('aria-selected', 'true')
  })

  it('a complete draft is told to send it', () => {
    view([], { status: 'draft' })
    expect(screen.queryByTestId('profile-incomplete')).toBeNull()
    expect(screen.getByTestId('profile-ready')).toHaveTextContent('Everything we need is here.')
  })

  it('reads in Arabic', () => {
    view(['displayName'], {}, 'ar')
    expect(screen.getByTestId('profile-incomplete')).toHaveTextContent('ملفك غير مكتمل بعد.')
    expect(step('basics')).toHaveTextContent('ينقصها اسمك')
    expect(screen.getByText('قوة الملف')).toBeInTheDocument()
  })
})
