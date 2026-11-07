'use client'

import { similarIntents } from '@shoot/domain/pages'
import { useDocumentInfo, useFormFields } from '@payloadcms/ui'
import { useEffect, useState } from 'react'

type Found = { id: number; title: string; slug?: string; intent?: Record<string, unknown> | null }

/** Spec US4-S5: tells the editor when another intent page is about the same thing (it never blocks saving). */
export function SimilarPages() {
  const { id } = useDocumentInfo()
  const persona = useFormFields(([fields]) => fields['intent.persona']?.value)
  const specialty = useFormFields(([fields]) => fields['intent.specialty']?.value)
  const location = useFormFields(([fields]) => fields['intent.location']?.value)
  const [similar, setSimilar] = useState<Found[]>([])

  useEffect(() => {
    if (!persona && !specialty && !location) return
    const controller = new AbortController()
    fetch('/api/pages?where[kind][equals]=intent&limit=100&depth=0&draft=true', { signal: controller.signal })
      .then((response) => (response.ok ? response.json() : { docs: [] }))
      .then((body: { docs: Found[] }) =>
        setSimilar(similarIntents(body.docs, { personaId: persona ? String(persona) : null, specialtyId: specialty ? String(specialty) : null, locationId: location ? String(location) : null }, id)),
      )
      .catch(() => undefined)
    return () => controller.abort()
  }, [persona, specialty, location, id])

  if (similar.length === 0) return null
  return (
    <div role="status" style={{ margin: '0 0 16px', padding: '10px 14px', borderRadius: 8, background: 'var(--theme-warning-100, #fff4e5)', color: 'var(--theme-warning-900, #6a3b00)', fontSize: 14 }}>
      {similar.length === 1 ? 'Another intent page is' : `${similar.length} other intent pages are`} about the same thing: {similar.map((p) => p.title).join(', ')}. Search engines may treat them as competing; make this page different or merge them.
    </div>
  )
}
