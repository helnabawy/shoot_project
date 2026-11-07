import { useId, type ReactNode } from 'react'
import { cx } from './cx'

/**
 * A labelled group of rows. As a fieldset it gives radio rows a proper accessible name
 * (the legend), which is what makes the no-JavaScript form usable with a screen reader.
 */
export function ResultGroup({
  label,
  id,
  children,
  as = 'div',
  message,
  className,
}: {
  label: ReactNode
  id?: string
  children: ReactNode
  as?: 'div' | 'fieldset'
  message?: ReactNode
  className?: string
}) {
  const labelId = `${useId()}-label`
  const heading = (
    <span id={labelId} className="group-label block px-4 pt-2.5 pb-1">
      {label}
    </span>
  )
  if (as === 'fieldset') {
    return (
      <fieldset
        id={id}
        className={cx('min-w-0 border-0 p-0 pb-1', className)}
        aria-invalid={message ? true : undefined}
      >
        <legend className="contents">{heading}</legend>
        {message}
        {children}
      </fieldset>
    )
  }
  return (
    <div id={id} role="group" aria-labelledby={labelId} className={cx('pb-1', className)}>
      {heading}
      {message}
      {children}
    </div>
  )
}
