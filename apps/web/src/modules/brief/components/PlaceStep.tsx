'use client'

import dynamic from 'next/dynamic'
import { useEffect, useId, useRef, useState } from 'react'
import { locatePlace, pickPlace, searchPlaces, type PlacePick } from '@/modules/maps/actions'
import { rowClass, RowContent } from '@/shared/ui/bar'
import { SearchIcon } from '@/shared/ui/icons'

export interface PlaceStepLabels {
  label: string
  search: string
  useLocation: string
  locating: string
  denied: string
  noResults: string
  outside: string
  change: string
  hint: string
  /** "Or tap the map where it is." */
  mapHint: string
  /** The map's name for screen readers. */
  mapLabel: string
}

type Suggestion = { placeId: string; main: string; secondary: string }

// Leaflet loads only when the place step shows (landing JS budget).
const PlaceMap = dynamic(() => import('./PlaceMap'), { ssr: false, loading: () => <div className="h-56 w-full rounded-[12px] bg-tile" /> })

/**
 * 022 (US1, boards 57–63): where the shoot is, as a pin the client chooses by searching or with their location.
 * Posts `place.lat`, `place.lng`, `place.source` and `place.placeId` with the brief; the server reads the area
 * and emirate again (FR-005). Creators only ever see the area (FR-005b). The draggable map comes with the
 * browser map key; until then search and location set the pin.
 */
export function PlaceStep({ locale, labels, error, emirateName }: { locale: string; labels: PlaceStepLabels; error?: string; emirateName?: string }) {
  const id = useId()
  const [session] = useState(() => `s${Math.random().toString(36).slice(2, 14)}`)
  const [q, setQ] = useState('')
  const [results, setResults] = useState<Suggestion[] | null>(null)
  const [place, setPlace] = useState<(PlacePick & { source: 'search' | 'device' | 'drag' }) | null>(null)
  const [note, setNote] = useState<string | null>(null)
  const latest = useRef(0)
  const [focus, setFocus] = useState<{ lat: number; lng: number } | null>(null)

  // The map opens on the brief's emirate, found by the name the CMS gives it (no place is written in code).
  useEffect(() => {
    if (!emirateName) return
    let alive = true
    searchPlaces(emirateName, session, locale)
      .then(async (found) => (found[0] ? pickPlace(found[0].placeId, session, locale) : null))
      .then((p) => {
        if (alive && p) setFocus({ lat: p.lat, lng: p.lng })
      })
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [emirateName, session, locale])

  useEffect(() => {
    if (place || q.trim().length < 2) return
    const ticket = ++latest.current
    const timer = setTimeout(() => {
      searchPlaces(q, session, locale)
        .then((found) => ticket === latest.current && setResults(found))
        .catch(() => ticket === latest.current && setResults([]))
    }, 300)
    return () => clearTimeout(timer)
  }, [q, session, locale, place])

  const choose = (picked: PlacePick | null, source: 'search' | 'device' | 'drag') => {
    if (!picked || !picked.inside) {
      setNote(labels.outside)
      return
    }
    setNote(null)
    setResults(null)
    setPlace({ ...picked, source })
  }

  const locate = () => {
    if (!('geolocation' in navigator)) return setNote(labels.denied)
    setNote(labels.locating)
    navigator.geolocation.getCurrentPosition(
      (pos) => void locatePlace(pos.coords.latitude, pos.coords.longitude, locale).then((p) => choose(p, 'device')),
      () => setNote(labels.denied),
      { enableHighAccuracy: true, timeout: 10_000 },
    )
  }

  return (
    <div className="flex flex-col gap-2 px-3 pb-3" data-testid="place-step">
      <span className="group-label block px-1">{labels.label}</span>
      <PlaceMap pin={place ? { lat: place.lat, lng: place.lng } : null} focus={focus} label={labels.mapLabel} onPick={(lat, lng) => void locatePlace(lat, lng, locale).then((p) => choose(p, 'drag'))} />
      <p className="px-1 text-[13px] text-mute">{labels.mapHint}</p>
      {place ? (
        <div className="flex items-center gap-2.5 rounded-[12px] border border-hair bg-panel-solid p-2.5" data-testid="place-chosen">
          {place.mapUrl ? (
            // A small map of the client's own pin; only they see it.
            // eslint-disable-next-line @next/next/no-img-element
            <img src={place.mapUrl} alt="" width={84} height={64} className="h-16 w-[84px] shrink-0 rounded-[10px] object-cover" />
          ) : null}
          <span className="min-w-0 flex-1 text-[15px]">{[place.area, place.emirate?.name].filter(Boolean).join(locale === 'ar' ? '، ' : ', ')}</span>
          <button type="button" onClick={() => setPlace(null)} className="min-h-11 px-2 text-[15px] font-medium text-link">
            {labels.change}
          </button>
          <input type="hidden" name="place.lat" value={place.lat} />
          <input type="hidden" name="place.lng" value={place.lng} />
          <input type="hidden" name="place.source" value={place.source} />
          {place.placeId ? <input type="hidden" name="place.placeId" value={place.placeId} /> : null}
        </div>
      ) : (
        <>
          <label htmlFor={`${id}-q`} className="sr-only">
            {labels.search}
          </label>
          <div className="flex h-12 items-center gap-2 rounded-[9px] border border-control-border bg-panel-solid px-3 focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-focus">
            <SearchIcon width={16} height={16} aria-hidden="true" />
            <input
              id={`${id}-q`}
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={labels.search}
              autoComplete="off"
              dir="auto"
              aria-describedby={`${id}-hint`}
              aria-invalid={error ? true : undefined}
              className="min-w-0 flex-1 bg-transparent text-[16px] text-ink outline-none"
            />
          </div>
          {results ? (
            <ul aria-live="polite" className="flex flex-col" data-testid="place-results">
              {results.length === 0 ? <li className="px-1 text-[13px] text-mute">{labels.noResults}</li> : null}
              {results.map((r) => (
                <li key={r.placeId}>
                  <button type="button" className={rowClass('open')} onClick={() => void pickPlace(r.placeId, session, locale).then((p) => choose(p, 'search'))}>
                    <RowContent label={<span className="block text-start">{r.main}<span className="block text-[13px] text-mute">{r.secondary}</span></span>} />
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
          <button type="button" onClick={locate} className="min-h-11 self-start px-1 text-[15px] font-medium text-link" data-testid="place-locate">
            {labels.useLocation}
          </button>
        </>
      )}
      {note || error ? (
        <p role="status" className="px-1 text-[13px] text-ink">
          {error ?? note}
        </p>
      ) : null}
      <p id={`${id}-hint`} className="px-1 text-[13px] text-mute">
        {labels.hint}
      </p>
    </div>
  )
}
