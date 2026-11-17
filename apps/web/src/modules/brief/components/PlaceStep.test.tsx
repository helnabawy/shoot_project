import { act, fireEvent, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { renderWithLocale } from '../../../../tests/setup/render'

const searchPlaces = vi.fn()
const pickPlace = vi.fn()
const locatePlace = vi.fn()
vi.mock('@/modules/maps/actions', () => ({
  searchPlaces: (...a: unknown[]) => searchPlaces(...a),
  pickPlace: (...a: unknown[]) => pickPlace(...a),
  locatePlace: (...a: unknown[]) => locatePlace(...a),
}))

// The real map needs a browser canvas; a stand-in drops a pin where a tap would.
vi.mock('next/dynamic', () => ({
  default: () =>
    function MapStandIn({ onPick, label }: { onPick: (lat: number, lng: number) => void; label: string }) {
      return (
        <button type="button" aria-label={label} onClick={() => onPick(24.4672, 54.6031)}>
          map
        </button>
      )
    },
}))

const { PlaceStep } = await import('./PlaceStep')

const labels = { label: 'Where is the shoot?', search: 'Search a place or area', useLocation: 'Use my location', locating: 'Finding where you are…', denied: 'Your location is off. Search for the place instead.', noResults: 'No places found.', outside: 'Choose a place on land in the emirates we cover.', change: 'Change', hint: 'Creators see the area only.', mapHint: 'Or tap the map where it is.', mapLabel: 'Map' }
const yas = { lat: 24.4672, lng: 54.6031, inside: true, area: 'Yas Island', emirate: { slug: 'abu-dhabi', name: 'Abu Dhabi' }, mapUrl: 'https://maps.example.test/pin.png', placeId: 'yas-marina' }
const flush = () => act(async () => {})

describe('OF-US1 the place step', () => {
  beforeEach(() => vi.useFakeTimers({ shouldAdvanceTime: true }))
  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('OF-US1-S4a searching lists places; picking one shows its area and posts the pin', async () => {
    searchPlaces.mockResolvedValue([{ placeId: 'yas-marina', main: 'Yas Marina Circuit', secondary: 'Yas Island, Abu Dhabi' }])
    pickPlace.mockResolvedValue(yas)
    const { container } = renderWithLocale(<PlaceStep locale="en" labels={labels} />)
    fireEvent.change(screen.getByLabelText('Search a place or area'), { target: { value: 'yas' } })
    await act(() => vi.advanceTimersByTimeAsync(350))
    fireEvent.click(screen.getByRole('button', { name: /Yas Marina Circuit/ }))
    await flush()
    expect(screen.getByTestId('place-chosen')).toHaveTextContent('Yas Island, Abu Dhabi')
    expect(container.querySelector('input[name="place.lat"]')).toHaveValue(String(yas.lat))
    expect(container.querySelector('input[name="place.source"]')).toHaveValue('search')
    expect(container.querySelector('input[name="place.placeId"]')).toHaveValue('yas-marina')
    fireEvent.click(screen.getByRole('button', { name: 'Change' }))
    expect(container.querySelector('input[name="place.lat"]')).toBeNull()
  })

  it('OF-US1-S4 a place outside the emirates served is not taken', async () => {
    searchPlaces.mockResolvedValue([{ placeId: 'doha', main: 'Doha', secondary: 'Qatar' }])
    pickPlace.mockResolvedValue({ lat: 25.28, lng: 51.53, inside: false, area: null, emirate: null, mapUrl: null })
    const { container } = renderWithLocale(<PlaceStep locale="en" labels={labels} />)
    fireEvent.change(screen.getByLabelText('Search a place or area'), { target: { value: 'doha' } })
    await act(() => vi.advanceTimersByTimeAsync(350))
    fireEvent.click(screen.getByRole('button', { name: /Doha/ }))
    await flush()
    expect(screen.getByRole('status')).toHaveTextContent(labels.outside)
    expect(container.querySelector('input[name="place.lat"]')).toBeNull()
  })

  it('OF-US1-S4c "Use my location": allowed sets the pin; refused asks to search', async () => {
    let allow = true
    vi.stubGlobal('navigator', {
      ...navigator,
      geolocation: { getCurrentPosition: (ok: (p: unknown) => void, fail: () => void) => (allow ? ok({ coords: { latitude: yas.lat, longitude: yas.lng } }) : fail()) },
    })
    locatePlace.mockResolvedValue({ ...yas, placeId: undefined })
    const { container, unmount } = renderWithLocale(<PlaceStep locale="en" labels={labels} />)
    fireEvent.click(screen.getByTestId('place-locate'))
    await flush()
    expect(container.querySelector('input[name="place.source"]')).toHaveValue('device')
    unmount()
    allow = false
    renderWithLocale(<PlaceStep locale="en" labels={labels} />)
    fireEvent.click(screen.getByTestId('place-locate'))
    await flush()
    expect(screen.getByRole('status')).toHaveTextContent(labels.denied)
  })

  it('OF-US1-S4b a tap on the map drops the pin and posts it as dragged', async () => {
    locatePlace.mockResolvedValue({ ...yas, placeId: undefined })
    const { container } = renderWithLocale(<PlaceStep locale="en" labels={labels} emirateName="Abu Dhabi" />)
    expect(screen.getByText('Or tap the map where it is.')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Map' }))
    await flush()
    expect(locatePlace).toHaveBeenCalledWith(24.4672, 54.6031, 'en')
    expect(container.querySelector('input[name="place.source"]')).toHaveValue('drag')
    expect(screen.getByTestId('place-chosen')).toHaveTextContent('Yas Island, Abu Dhabi')
  })
})

