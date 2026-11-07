import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderWithLocale } from '../../../../tests/setup/render'
import { myProfile, mySample, selectableOptions } from '../../../../tests/fixtures/creators'
import type { ProfileState } from '../actions'

const submitProfileForm = vi.fn(async (_prev: ProfileState, _form: FormData): Promise<ProfileState> => ({ status: 'idle' }))
const noop = async (): Promise<ProfileState> => ({ status: 'idle' })
vi.mock('../actions', () => ({ submitProfileForm: (prev: ProfileState, form: FormData) => submitProfileForm(prev, form), addSample: noop, moveSample: noop, removeSample: noop }))

const { ProfileForm } = await import('./ProfileForm')

const defaults = { name: 'Registered Name', personas: [2], specialties: [12] }
const render = (over: Partial<Parameters<typeof ProfileForm>[0]> = {}, locale: 'en' | 'ar' = 'en') =>
  renderWithLocale(<ProfileForm locale={locale} profile={myProfile()} options={selectableOptions} defaults={defaults} samples={<div data-testid="samples-slot" />} {...over} />, { locale })

describe('CP-US3-S1 provider form', () => {
  beforeEach(() => submitProfileForm.mockClear())

  it('shows English and Arabic fields with their own language and direction, labelled, filled from the profile', () => {
    render()
    const en = screen.getByLabelText('English', { selector: '#displayName-en' })
    const ar = screen.getByLabelText(/العربية/, { selector: '#displayName-ar' })
    expect(en).toHaveValue('Sara Khan')
    expect(en).toHaveAttribute('lang', 'en')
    expect(en).toHaveAttribute('dir', 'ltr')
    expect(ar).toHaveValue('سارة خان')
    expect(ar).toHaveAttribute('lang', 'ar')
    expect(ar).toHaveAttribute('dir', 'rtl')
    expect(screen.getByLabelText('English', { selector: '#bio-en' })).toHaveValue('Weddings and portraits.')
  })

  it('every field belongs to the one form, wherever it sits, so the sample forms can sit among them', () => {
    render()
    const form = document.getElementById('profile-form')!
    expect(form.tagName).toBe('FORM')
    expect(form.children).toHaveLength(0)
    for (const name of ['displayName_en', 'bio_ar', 'personas', 'specialties', 'cities', 'languages', 'social.0.url', 'photo', 'locale']) {
      for (const el of document.querySelectorAll(`[name="${name}"]`)) expect(el.getAttribute('form'), name).toBe('profile-form')
    }
    expect(screen.getByTestId('samples-slot')).toBeInTheDocument()
  })

  it('ticks what the profile has chosen, from data: types, specialties, places, languages', () => {
    render()
    const checked = (name: string) => [...document.querySelectorAll<HTMLInputElement>(`input[name="${name}"]:checked`)].map((i) => i.value)
    expect(checked('personas')).toEqual(['1'])
    expect(checked('specialties')).toEqual(['10', '11'])
    expect(checked('cities')).toEqual(['101'])
    expect(checked('languages')).toEqual(['en', 'ar'])
  })

  it('lists cities under their emirate and offers each emirate itself', () => {
    render()
    const cities = within(screen.getByTestId('field-cities'))
    expect(cities.getAllByRole('checkbox').map((c) => c.getAttribute('value'))).toEqual(['100', '101', '200'])
  })

  it('before the first save it is filled from registration: the name and the chosen type and specialty', () => {
    render({ profile: null })
    expect(screen.getByLabelText('English', { selector: '#displayName-en' })).toHaveValue('Registered Name')
    expect([...document.querySelectorAll<HTMLInputElement>('input[name="personas"]:checked')].map((i) => i.value)).toEqual(['2'])
    expect([...document.querySelectorAll<HTMLInputElement>('input[name="specialties"]:checked')].map((i) => i.value)).toEqual(['12'])
  })

  it('only offers specialties of the chosen types, and unticking a type drops the ones only it had', async () => {
    const user = userEvent.setup()
    render({ profile: myProfile({ personas: [1, 2], specialties: [10, 12] }) })
    const specialty = (id: number) => document.querySelector<HTMLInputElement>(`input[name="specialties"][value="${id}"]`)!
    expect(specialty(12)).not.toBeDisabled()
    // Drop the videographer type: "Drone work" belongs only to it and stops being submitted; shared ones stay.
    await user.click(screen.getByTestId('persona-2').querySelector('input')!)
    expect(specialty(12)).toBeDisabled()
    expect(specialty(10)).not.toBeDisabled()
    expect(specialty(10)).toBeChecked()
    // Tick it again and the specialty is offered once more.
    await user.click(screen.getByTestId('persona-2').querySelector('input')!)
    expect(specialty(12)).not.toBeDisabled()
  })

  it('offers every specialty while no type is chosen yet', () => {
    render({ profile: null, defaults: { name: 'N', personas: [], specialties: [] } })
    for (const id of [10, 11, 12]) expect(document.querySelector<HTMLInputElement>(`input[name="specialties"][value="${id}"]`)).not.toBeDisabled()
  })

  it('shows four link slots, or as many as the profile already has (at most six)', () => {
    const { unmount } = render()
    expect(document.querySelectorAll('input[name$=".url"]')).toHaveLength(4)
    unmount()
    const many = Array.from({ length: 6 }, (_, i) => ({ platform: 'website', url: `https://s${i}.example` }))
    render({ profile: myProfile({ social: many }) })
    expect(document.querySelectorAll('input[name$=".url"]')).toHaveLength(6)
  })

  describe('one primary action per state', () => {
    const primary = () => screen.getByTestId('profile-save')
    it('incomplete: "Save", and the line says exactly what is missing', () => {
      render({ profile: myProfile({ status: 'draft', isPublished: false, missing: ['cities', 'languages'] }) })
      expect(primary()).toHaveTextContent('Save')
      expect(primary()).not.toHaveTextContent('review')
      expect(screen.queryByTestId('profile-save-only')).toBeNull()
      expect(screen.getByTestId('profile-feedback')).toHaveTextContent('Add where you work and a language to send for review.')
    })
    it('before the first save everything is missing', () => {
      render({ profile: null })
      expect(screen.getByTestId('profile-feedback')).toHaveTextContent('your name, what you do')
    })
    it('a complete draft: "Save and send for review", with "Save without sending" beneath', () => {
      render({ profile: myProfile({ status: 'draft', isPublished: false }) })
      expect(primary()).toHaveTextContent('Save and send for review')
      expect(primary()).toHaveAttribute('value', 'send')
      expect(screen.getByTestId('profile-save-only')).toHaveAttribute('value', 'save')
    })
    it('live with changes waiting: send for review again', () => {
      render({ profile: myProfile({ status: 'live-with-changes', hasNewerDraft: true }) })
      expect(primary()).toHaveTextContent('Save and send for review')
    })
    it('already in review or live and unchanged: plain "Save"', () => {
      render({ profile: myProfile({ status: 'in-review', isPublished: false }) })
      expect(primary()).toHaveTextContent(/^Save$/)
    })
    it('a verified creator whose edits go live: "Save and publish"', () => {
      render({ profile: myProfile({ autoPublish: true }) })
      expect(primary()).toHaveTextContent('Save and publish')
      expect(primary()).toHaveAttribute('value', 'save')
    })
    it('the primary button submits the form it is not inside, and is first so Enter in a field presses it', () => {
      render({ profile: myProfile({ status: 'draft', isPublished: false }) })
      expect(primary()).toHaveAttribute('form', 'profile-form')
      const buttons = [...document.querySelectorAll('button[form="profile-form"]')]
      expect(buttons[0]).toBe(primary())
    })
  })

  describe('results', () => {
    const press = async () => userEvent.setup().click(screen.getByTestId('profile-save'))

    it('sends the form with the language and the button\'s intent', async () => {
      render({ profile: myProfile({ status: 'draft', isPublished: false }) })
      await press()
      const form = submitProfileForm.mock.calls[0]![1]
      expect(form.get('intent')).toBe('send')
      expect(form.get('locale')).toBe('en')
      expect(form.get('displayName_en')).toBe('Sara Khan')
      expect(form.getAll('personas')).toEqual(['1'])
    })

    it('says what happened: saved, saved and live, sent for review', async () => {
      for (const [state, text] of [
        [{ status: 'saved', published: false }, 'Saved. Your changes are waiting for review.'],
        [{ status: 'saved', published: true }, 'Saved and live.'],
        [{ status: 'saved', published: false, submitted: true }, 'Saved and sent for review.'],
      ] as const) {
        submitProfileForm.mockResolvedValueOnce(state)
        const { unmount } = render({ profile: myProfile({ autoPublish: true }) })
        await press()
        expect(await screen.findByText(text)).toBeInTheDocument()
        unmount()
      }
    })

    it('puts each error beside its field in one plain sentence, and says some parts need another look', async () => {
      submitProfileForm.mockResolvedValueOnce({
        status: 'error',
        formError: 'creators.errors.generic',
        errors: { displayName_en: 'creators.errors.nameLength', 'social.0.url': 'creators.errors.socialInvalid', personas: 'creators.persona.inactive', languages: 'creators.errors.languageInvalid' },
      })
      render()
      await press()
      expect(await screen.findByText('Enter a name, 2 to 60 characters.')).toBeInTheDocument()
      expect(screen.getByLabelText('English', { selector: '#displayName-en' })).toHaveAttribute('aria-invalid', 'true')
      expect(screen.getByLabelText('English', { selector: '#displayName-en' })).toHaveAttribute('aria-describedby', 'displayName-en-error')
      expect(screen.getByText('Use a full https:// link to that site.')).toBeInTheDocument()
      expect(screen.getByText("That kind of professional isn't offered right now. Choose another.")).toBeInTheDocument()
      expect(screen.getByText('Choose a language from the list.')).toBeInTheDocument()
      expect(screen.getByTestId('profile-feedback')).toHaveTextContent('Some parts need another look.')
      // The reader lands on the first thing to fix, not 5000 px away at the closing bar.
      expect(screen.getByLabelText('English', { selector: '#displayName-en' })).toHaveFocus()
    })

    it('a sample row\'s error reaches the row inside the form, under the row\'s own field name', async () => {
      const { SampleManager } = await import('./SampleManager')
      submitProfileForm.mockResolvedValueOnce({ status: 'error', formError: 'creators.errors.generic', errors: { 'sample.0.caption_en': 'creators.errors.captionLength' } })
      render({ samples: <SampleManager locale="en" samples={[mySample(1)]} specialties={[{ id: 10, name: 'Portrait' }]} hasProfile /> })
      await press()
      expect(await screen.findByText('Keep captions under 140 characters.')).toBeInTheDocument()
      expect(document.getElementById('caption-0-en')).toHaveAttribute('aria-invalid', 'true')
      expect(document.getElementById('caption-0-en')).toHaveFocus()
    })

    it('a failure that is about no field is shown once, for the whole form', async () => {
      submitProfileForm.mockResolvedValueOnce({ status: 'error', errors: {}, formError: 'creators.errors.notProvider' })
      render()
      await press()
      expect(await screen.findByRole('alert')).toHaveTextContent('Only professional accounts have a profile.')
    })

    it('an unknown error key says the generic thing, never a raw key', async () => {
      submitProfileForm.mockResolvedValueOnce({ status: 'error', errors: { bio_en: 'creators.something.new' } })
      render()
      await press()
      expect(await screen.findByText("That didn't save. Check the highlighted parts and try again.")).toBeInTheDocument()
      expect(screen.queryByText('creators.something.new')).toBeNull()
    })
  })

  it('puts the page language first and is fully Arabic in Arabic', () => {
    render({}, 'ar')
    const inputs = [...document.querySelectorAll<HTMLInputElement>('input[name^="displayName_"]')]
    expect(inputs.map((i) => i.lang)).toEqual(['ar', 'en'])
    expect(screen.getByText('الأساسيات')).toBeInTheDocument()
    expect(document.querySelector('[dir="rtl"]')).not.toBeNull()
  })
})
