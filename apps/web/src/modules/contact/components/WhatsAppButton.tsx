import { WhatsAppIcon } from '@/shared/ui/icons'
import { cx } from '@/shared/ui/bar'
import { whatsappHref } from '../whatsapp'

/** A WhatsApp link for the single configured number (FR-010). Renders nothing without a valid number. */
export function WhatsAppButton({
  number,
  message,
  label,
  className,
  testId,
}: {
  number: string | null | undefined
  message?: string | null
  label: string
  className?: string
  testId?: string
}) {
  const href = whatsappHref(number, message)
  if (!href) return null
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" data-testid={testId} className={cx('inline-flex items-center gap-2', className)}>
      <WhatsAppIcon width={18} height={18} />
      <span>{label}</span>
    </a>
  )
}
