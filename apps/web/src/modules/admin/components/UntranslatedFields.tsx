'use client'

import { useDocumentInfo } from '@payloadcms/ui'
import { useEffect, useState } from 'react'
import { findUntranslatedFields } from '@/shared/payload/localization'

/**
 * FR-038: lists localised fields that still have English text but no Arabic, so editors can
 * finish the translation. Reads the saved document with every locale.
 */
export function UntranslatedFields() {
  const { globalSlug, id, collectionSlug, lastUpdateTime } = useDocumentInfo() as {
    globalSlug?: string
    collectionSlug?: string
    id?: string | number
    lastUpdateTime?: number
  }
  const [missing, setMissing] = useState<string[] | null>(null)

  useEffect(() => {
    const url = globalSlug
      ? `/api/globals/${globalSlug}?locale=all&depth=0&draft=true`
      : collectionSlug && id
        ? `/api/${collectionSlug}/${id}?locale=all&depth=0&draft=true`
        : null
    if (!url) return
    let cancelled = false
    fetch(url, { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : null))
      .then((doc) => {
        if (!cancelled && doc) setMissing(findUntranslatedFields(doc, 'ar'))
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [globalSlug, collectionSlug, id, lastUpdateTime])

  if (missing === null) return null
  return (
    <div style={{ padding: '12px 0', fontSize: 13, lineHeight: 1.5 }}>
      <strong style={{ display: 'block', marginBottom: 4 }}>Arabic translation</strong>
      {missing.length === 0 ? (
        <span>Everything with English text also has Arabic.</span>
      ) : (
        <>
          <span>
            {missing.length} field{missing.length === 1 ? '' : 's'} show English on the Arabic site:
          </span>
          <ul style={{ margin: '6px 0 0', paddingInlineStart: 18, maxHeight: 220, overflow: 'auto' }}>
            {missing.map((path) => (
              <li key={path}>
                <code>{path}</code>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  )
}
