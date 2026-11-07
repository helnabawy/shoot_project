import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderWithLocale } from '../../../../tests/setup/render'
import { mySample } from '../../../../tests/fixtures/creators'
import type { ProfileState } from '../actions'

type Mock = ReturnType<typeof vi.fn<(prev: ProfileState, form: FormData) => Promise<ProfileState>>>
const make = (): Mock => vi.fn(async () => ({ status: 'saved', published: false }))
const actions = vi.hoisted(() => ({ addSample: null as unknown, moveSample: null as unknown, removeSample: null as unknown }))
const addSample = (actions.addSample = make())
const moveSample = (actions.moveSample = make())
const removeSample = (actions.removeSample = make())
vi.mock('../actions', () => ({
  addSample: (p: ProfileState, f: FormData) => (actions.addSample as Mock)(p, f),
  moveSample: (p: ProfileState, f: FormData) => (actions.moveSample as Mock)(p, f),
  removeSample: (p: ProfileState, f: FormData) => (actions.removeSample as Mock)(p, f),
}))

const { SampleManager } = await import('./SampleManager')

const specialties = [{ id: 10, name: 'Portrait' }, { id: 11, name: 'Events' }]
const render = (over: Partial<Parameters<typeof SampleManager>[0]> = {}, locale: 'en' | 'ar' = 'en') =>
  renderWithLocale(<SampleManager locale={locale} samples={[mySample(1), mySample(2), mySample(3)]} specialties={specialties} hasProfile {...over} />, { locale })

describe('CP-US3-S1 sample manager', () => {
  beforeEach(() => [addSample, moveSample, removeSample].forEach((m) => m.mockClear()))

  it('shows each sample with both captions, its specialty and its place in the order, and counts them', () => {
    render()
    expect(screen.getByTestId('sample-count')).toHaveTextContent('3 of 30 samples')
    const rows = screen.getAllByTestId('sample-row')
    expect(rows).toHaveLength(3)
    expect(within(rows[0]!).getByText('Sample 1')).toBeInTheDocument()
    expect(within(rows[0]!).getByDisplayValue('Caption 1')).toBeInTheDocument()
    expect(within(rows[0]!).getByDisplayValue('تعليق 1')).toHaveAttribute('dir', 'rtl')
    expect(within(rows[0]!).getByRole('combobox')).toHaveValue('10')
  })

  it('offers only the creator\'s own specialties, plus "None"', () => {
    render()
    const options = within(screen.getAllByTestId('sample-row')[0]!).getAllByRole('option').map((o) => o.textContent)
    expect(options).toEqual(['None', 'Portrait', 'Events'])
  })

  it('the first sample cannot move up and the last cannot move down', () => {
    render()
    expect(screen.getByTestId('sample-up-0').className).toContain('invisible')
    expect(screen.getByTestId('sample-down-2').className).toContain('invisible')
    expect(screen.getByTestId('sample-up-1').className).not.toContain('invisible')
    expect(screen.getByTestId('sample-down-1').className).not.toContain('invisible')
  })

  it('move and remove post the sample\'s index (and the direction), as plain forms', async () => {
    const user = userEvent.setup()
    render()
    await user.click(screen.getByTestId('sample-down-1'))
    expect(Object.fromEntries(moveSample.mock.calls[0]![1].entries())).toMatchObject({ index: '1', direction: 'down', locale: 'en' })
    await user.click(screen.getByTestId('sample-up-1'))
    expect(moveSample.mock.calls[1]![1].get('direction')).toBe('up')
    await user.click(screen.getByTestId('sample-remove-2'))
    expect(removeSample.mock.calls[0]![1].get('index')).toBe('2')
    for (const id of ['sample-up-1', 'sample-down-1', 'sample-remove-2']) expect(screen.getByTestId(id)).toHaveAccessibleName()
  })

  it('a row\'s captions and specialty belong to the profile form, so the closing action saves them', () => {
    render()
    const row = screen.getAllByTestId('sample-row')[1]!
    const en = within(row).getByDisplayValue('Caption 2')
    expect(en).toHaveAttribute('form', 'profile-form')
    expect(en).toHaveAttribute('name', 'sample.1.caption_en')
    expect(within(row).getByDisplayValue('تعليق 2')).toHaveAttribute('name', 'sample.1.caption_ar')
    expect(within(row).getByRole('combobox')).toHaveAttribute('name', 'sample.1.category')
    expect(within(row).getByRole('combobox')).toHaveAttribute('form', 'profile-form')
    expect(screen.queryByText('Save sample')).toBeNull()
  })

  it('moving and removing are announced politely', async () => {
    const user = userEvent.setup()
    render()
    const live = screen.getByTestId('sample-announce')
    expect(live).toHaveAttribute('aria-live', 'polite')
    await user.click(screen.getByTestId('sample-up-1'))
    expect(live).toHaveTextContent('Sample moved to position 1.')
    await user.click(screen.getByTestId('sample-down-1'))
    expect(live).toHaveTextContent('Sample moved to position 3.')
    await user.click(screen.getByTestId('sample-remove-2'))
    expect(live).toHaveTextContent('Sample removed.')
  })

  it('an empty profile says so plainly and offers to add the first sample', () => {
    render({ samples: [] })
    expect(screen.getByTestId('sample-empty')).toHaveTextContent('No samples yet.')
    expect(screen.queryByTestId('sample-row')).toBeNull()
    expect(screen.getByTestId('sample-add-submit')).not.toBeDisabled()
  })

  it('at thirty samples the add form is off and the limit is said in one sentence', () => {
    render({ samples: Array.from({ length: 30 }, (_, i) => mySample(i + 1)) })
    expect(screen.getByTestId('sample-full')).toHaveTextContent('You have 30 samples, the most a profile can have.')
    expect(screen.getByTestId('sample-add-submit')).toBeDisabled()
  })

  it('before the profile exists the add form is off', () => {
    render({ samples: [], hasProfile: false })
    expect(screen.getByTestId('sample-add-submit')).toBeDisabled()
  })

  it('the add form takes a photo or a video link with a poster, accepts only JPEG, PNG or WebP, and says the limits and the privacy note', () => {
    render()
    const form = screen.getByTestId('sample-add')
    expect(within(form).getByLabelText('Image')).toHaveAttribute('accept', 'image/jpeg,image/png,image/webp')
    expect(within(form).getByLabelText('Poster image')).toHaveAttribute('accept', 'image/jpeg,image/png,image/webp')
    expect(within(form).getByLabelText('YouTube or Vimeo link')).toHaveAttribute('dir', 'ltr')
    expect(within(form).getByRole('radio', { name: 'Photo' })).toBeChecked()
    expect(within(form).getByRole('radio', { name: 'Video link' })).not.toBeChecked()
    expect(screen.getByText(/can be opened by anyone who has their link, even before your profile is approved/)).toBeInTheDocument()
    expect(screen.getAllByText(/JPEG, PNG or WebP, up to 5 MB\./).length).toBeGreaterThanOrEqual(1)
  })

  it('adding posts the kind, the captions and the specialty with the file field', async () => {
    const user = userEvent.setup()
    render()
    const form = screen.getByTestId('sample-add')
    const file = new File([new Uint8Array([1, 2, 3])], 'work.png', { type: 'image/png' })
    const input = within(form).getByLabelText('Image') as HTMLInputElement
    await user.upload(input, file)
    expect(input.files?.[0]?.name).toBe('work.png')
    await user.type(within(form).getAllByRole('textbox')[1]!, 'Golden hour')
    await user.click(screen.getByTestId('sample-add-submit'))
    const posted = addSample.mock.calls[0]![1]
    expect(posted.get('kind')).toBe('image')
    // jsdom does not serialise user-event's file into FormData; the upload itself is covered by the action's integration tests.
    expect(posted.has('image')).toBe(true)
    expect(posted.get('caption_en')).toBe('Golden hour')
  })

  it('shows each add error next to its own field, in plain words', async () => {
    const user = userEvent.setup()
    addSample.mockResolvedValueOnce({ status: 'error', formError: 'creators.errors.generic', errors: { image: 'media.upload.size', videoUrl: 'creators.errors.videoHost', poster: 'creators.samples.poster', category: 'creators.samples.category', sample: 'creators.samples.limit' } })
    render()
    await user.click(screen.getByTestId('sample-add-submit'))
    expect(await screen.findByText('That image is over 5 MB. Choose a smaller one.')).toBeInTheDocument()
    expect(screen.getByText('Use a YouTube or Vimeo link.')).toBeInTheDocument()
    expect(screen.getByText('Add a poster image for the video.')).toBeInTheDocument()
    expect(screen.getByText('Choose one of your specialties.')).toBeInTheDocument()
    expect(screen.getByText('You have 30 samples, the most a profile can have.', { selector: 'p[id="add-sample-error"]' })).toBeInTheDocument()
  })

  it('shows a failure that is about no field once, for the whole form', async () => {
    const user = userEvent.setup()
    addSample.mockResolvedValueOnce({ status: 'error', errors: {}, formError: 'creators.errors.noProfile' })
    render({ samples: [] })
    await user.click(screen.getByTestId('sample-add-submit'))
    expect(await screen.findByRole('alert')).toHaveTextContent('Save your details first, then add samples.')
  })

  it('is fully Arabic and right to left in Arabic', () => {
    render({}, 'ar')
    expect(screen.getByText('الأعمال التي تعرضها')).toBeInTheDocument()
    expect(screen.getByTestId('sample-count')).toHaveTextContent('3 من 30 عملاً')
    expect(document.querySelector('[dir="rtl"]')).not.toBeNull()
  })
})
