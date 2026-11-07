import type { ComponentPropsWithoutRef, ElementType, ReactNode } from 'react'
import { cx } from './cx'

type Props<T extends ElementType> = {
  as?: T
  size?: 'lg' | 'sm'
  /** `glass`: the frosted glass the bar wears when it floats over the hero image. */
  tone?: 'default' | 'glass'
  children: ReactNode
  className?: string
} & Omit<ComponentPropsWithoutRef<T>, 'as' | 'children' | 'className'>

/** The one floating panel of The Brief Bar: 14 px corners, hairline, blur, the system's only shadow. */
export function BriefBar<T extends ElementType = 'div'>({
  as,
  size = 'lg',
  tone = 'default',
  children,
  className,
  ...rest
}: Props<T>) {
  const Tag = (as ?? 'div') as ElementType
  return (
    <Tag
      className={cx(
        'bar-panel overflow-hidden',
        tone === 'glass' && 'bar-glass',
        size === 'sm' && 'text-[15px]',
        className,
      )}
      {...rest}
    >
      {children}
    </Tag>
  )
}
