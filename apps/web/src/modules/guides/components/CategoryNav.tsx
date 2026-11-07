import Link from 'next/link'
import { localizeHref } from '@/shared/i18n/href'
import type { Locale } from '@/shared/lib/locale'
import { cx } from '@/shared/ui/bar'
import type { CategoryEntry } from '../queries'

/** The topics as a row of links (a real address each, so it filters without scripting). */
export function CategoryNav({ categories, active, locale, labels }: { categories: CategoryEntry[]; active?: string; locale: Locale; labels: { nav: string; all: string } }) {
  if (categories.length === 0) return null
  const item = (href: string, label: string, current: boolean) => (
    <li key={href}>
      <Link
        href={localizeHref(href, locale)}
        aria-current={current ? 'page' : undefined}
        className={cx('inline-flex min-h-11 items-center rounded-md px-3 text-[14px]', current ? 'bg-selected font-medium text-selected-ink' : 'text-mute hover:text-ink')}
      >
        {label}
      </Link>
    </li>
  )
  return (
    <nav aria-label={labels.nav} data-testid="category-nav">
      <ul className="-mx-3 flex flex-wrap gap-1">
        {item('/guides', labels.all, !active)}
        {categories.map((c) => item(`/guides/category/${c.slug}`, c.name, c.slug === active))}
      </ul>
    </nav>
  )
}
