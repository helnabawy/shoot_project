'use client'

import { IDENTITY_DOCUMENTS, IDENTITY_UPLOAD_TYPES, type IdentityDocumentKind } from '@shoot/domain/creators'
import { useTranslations } from 'next-intl'
import { useActionState } from 'react'
import { cx, GlyphTile } from '@/shared/ui/bar'
import { FieldError } from '@/shared/ui/Field'
import { CheckIcon, DocumentIcon, LockIcon } from '@/shared/ui/icons'
import { uploadIdentityDocument, type ProfileState } from '../actions'
import { errorMessageKey } from '../errors'
import type { MyIdentity, MyIdentityDocument } from '../my-profile'

const idle: ProfileState = { status: 'idle' }

/** One document: what it is, where its check stands, and (until verified) a file field with its own upload button. */
function DocumentRow({ kind, doc, locale }: { kind: IdentityDocumentKind; doc: MyIdentityDocument; locale: string }) {
  const t = useTranslations('creators.identity')
  const te = useTranslations('creators.err')
  // The server action goes straight to `useActionState`, so the form also works without JavaScript.
  const [state, run, pending] = useActionState(uploadIdentityDocument, idle)
  const error = state.status === 'error' ? te(errorMessageKey(state.errors[kind] ?? state.formError) as never) : null
  const name = t(kind)
  const id = `identity-${kind}`
  const uploaded = doc.uploadedAt
    ? t('uploadedOn', { date: new Intl.DateTimeFormat(locale === 'ar' ? 'ar-AE-u-nu-latn' : 'en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Dubai' }).format(new Date(doc.uploadedAt)) })
    : null
  const chip =
    doc.state === 'verified'
      ? 'text-selected-ink font-semibold'
      : doc.state === 'pending'
        ? 'text-mute'
        : 'rounded-md bg-attention px-1.5 py-0.5 text-on-attention'

  return (
    <div className="px-4 py-3" data-testid={`identity-${kind}`} data-state={doc.state}>
      <div className="grid grid-cols-[30px_minmax(0,1fr)_auto] items-start gap-3">
        <GlyphTile tone={doc.state === 'verified' ? 'set' : 'default'}>
          {doc.state === 'verified' ? <CheckIcon width={15} height={15} /> : <DocumentIcon width={16} height={16} />}
        </GlyphTile>
        <div className="min-w-0">
          <h3 className="text-[16px] font-semibold leading-snug text-ink">{name}</h3>
          <p className="text-[13px] text-mute">
            {t(`${kind}Help` as never)}
            {uploaded ? ` ${uploaded}.` : ''}
          </p>
        </div>
        <span className={cx('text-end text-[13px] [&:lang(ar)]:text-[14px]', chip)} data-testid={`identity-${kind}-status`}>
          {t(doc.state)}
        </span>
      </div>
      {doc.state === 'rejected' && doc.note ? (
        <p role="note" className="ms-[42px] mt-2 rounded-md bg-attention px-3 py-2 text-[14px] text-on-attention">
          {t('note', { note: doc.note })}
        </p>
      ) : null}
      {doc.state !== 'verified' ? (
        <form action={run} className="ms-[42px] mt-2" aria-label={t('choose', { document: name })}>
          <input type="hidden" name="kind" value={kind} />
          <input type="hidden" name="locale" value={locale} />
          <label htmlFor={id} className="sr-only">
            {t('choose', { document: name })}
          </label>
          <div className="flex flex-wrap items-center gap-2">
            <input
              id={id}
              type="file"
              name="document"
              required
              accept={IDENTITY_UPLOAD_TYPES.join(',')}
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? `${id}-error` : `${id}-help`}
              className="block min-h-11 w-full min-w-0 text-[15px] text-ink sm:w-auto sm:flex-1 file:me-3 file:min-h-11 file:cursor-pointer file:rounded-[var(--radius-row)] file:border-0 file:bg-tile file:px-4 file:text-[15px] file:text-ink"
            />
            <button
              type="submit"
              disabled={pending}
              aria-busy={pending || undefined}
              data-testid={`identity-${kind}-upload`}
              className="inline-flex min-h-11 items-center rounded-[var(--radius-row)] bg-tile px-4 text-[15px] font-semibold text-ink hover:bg-ink/[0.08] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)] disabled:opacity-60"
            >
              {pending ? t('uploading') : doc.state === 'missing' ? t('upload') : t('replace')}
            </button>
          </div>
          <p id={`${id}-help`} className="mt-1 text-[13px] text-mute">
            {t('fileHelp')}
          </p>
          {error ? <FieldError id={`${id}-error`}>{error}</FieldError> : null}
          {state.status === 'saved' ? (
            <p role="status" className="mt-1 text-[13px] text-mute">
              {t('uploaded')}
            </p>
          ) : null}
        </form>
      ) : null}
    </div>
  )
}

/**
 * CP-FR-013: the Emirates ID and trade license, both needed before review. Each row says where its
 * check stands in words and uploads on its own; the files are never shown back, not even to their owner.
 */
export function IdentitySection({ identity, locale }: { identity: MyIdentity; locale: string }) {
  const t = useTranslations('creators.identity')
  return (
    <>
      <p className="mt-1 px-1 text-[15px] text-mute">{t('intro')}</p>
      <div className="-mx-3 mt-4 divide-y divide-hair border-y border-hair">
        <p className="flex items-start gap-3 px-4 py-3 text-[14px] text-mute" data-testid="identity-private">
          <GlyphTile>
            <LockIcon width={15} height={15} />
          </GlyphTile>
          <span className="pt-1">{t('private')}</span>
        </p>
        {IDENTITY_DOCUMENTS.map((kind) => (
          <DocumentRow key={kind} kind={kind} doc={identity[kind]} locale={locale} />
        ))}
      </div>
    </>
  )
}
