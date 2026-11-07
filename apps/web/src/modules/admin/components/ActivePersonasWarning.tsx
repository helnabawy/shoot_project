'use client'

import { useFormFields } from '@payloadcms/ui'

/** FR-027 edge case: without active personas the public site hides every audience-dependent part. */
export function ActivePersonasWarning() {
  const field = useFormFields(([fields]) => fields.activePersonas)
  const value = field?.value as unknown[] | null | undefined
  if (Array.isArray(value) && value.length > 0) return null
  return (
    <div
      role="status"
      style={{
        margin: '0 0 16px',
        padding: '10px 14px',
        borderRadius: 8,
        background: 'var(--theme-warning-100, #fff4e5)',
        color: 'var(--theme-warning-900, #6a3b00)',
        fontSize: 14,
      }}
    >
      No persona is active. The site will hide the professional-type choice, the specialties list and the invitation to
      professionals until you add at least one.
    </div>
  )
}
