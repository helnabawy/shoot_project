import type { Page } from '@/payload-types'
import { RenderBlocks, type BlockContext } from '@/modules/landing'

/** An editor-built page: its title, then its sections exactly as the landing page renders them. */
export function PageView({ page, context }: { page: Page; context: BlockContext }) {
  return (
    <article data-testid="page-view">
      <header className="mx-auto max-w-[680px] px-4 pt-10 sm:pt-14">
        <h1 className="text-[34px] font-bold leading-tight tracking-[-0.03em] text-ink text-balance">{page.title}</h1>
      </header>
      <RenderBlocks sections={page.sections} context={context} />
    </article>
  )
}
