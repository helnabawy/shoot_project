'use client'

import { useTranslations } from 'next-intl'
import { useState } from 'react'
import { cx, ResultGroup } from '@/shared/ui/bar'

/** "Send the code by": SMS (default) or WhatsApp, as a two-part segmented choice of native radios. */
export function ChannelChoice({ defaultValue = 'sms' }: { defaultValue?: string }) {
  const t = useTranslations('auth.otp')
  const [value, setValue] = useState(defaultValue === 'whatsapp' ? 'whatsapp' : 'sms')
  return (
    <ResultGroup as="fieldset" label={t('channel')} className="border-t border-hair">
      <div className="mx-3 mt-1 mb-2 grid grid-cols-2 gap-1 rounded-[var(--radius-row)] bg-ink/[0.06] p-1">
        {(['sms', 'whatsapp'] as const).map((channel) => (
          <label
            key={channel}
            className={cx(
              'grid min-h-10 cursor-pointer place-items-center rounded-[calc(var(--radius-row)-2px)] text-[15px] font-medium transition-colors duration-100',
              'has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-[var(--focus)]',
              value === channel ? 'bg-ink text-canvas' : 'text-ink hover:bg-ink/[0.06]',
            )}
          >
            <input type="radio" name="channel" value={channel} checked={value === channel} onChange={() => setValue(channel)} className="sr-only" />
            {t(`channels.${channel}`)}
          </label>
        ))}
      </div>
    </ResultGroup>
  )
}
