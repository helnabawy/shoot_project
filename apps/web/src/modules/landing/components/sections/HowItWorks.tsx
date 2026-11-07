import type { HowItWorksBlock } from '@/payload-types'
import { CtaLink, type ContactDetails } from '@/shared/components/CtaLink'
import { cx, GlyphTile } from '@/shared/ui/bar'
import { ChevronIcon } from '@/shared/ui/icons'
import { Section } from '../Section'
import { StepVignette } from './StepVignette'

/**
 * The steps as one line of travel: graphite number tiles joined by a hairline, running down the
 * page on phones and across from 640 px (up to four steps; more stay vertical so none gets cramped).
 * Across, the track runs on past the last step to a forward chevron, and each step may carry a
 * drawing of the product at that moment (the CMS `visual`) between its number and its words.
 * The order carries meaning, so the numbers stay.
 */
export function HowItWorks({
  block,
  contact,
  locale,
}: {
  block: HowItWorksBlock
  contact: ContactDetails
  locale: string
}) {
  const steps = block.steps ?? []
  if (steps.length === 0) return null
  const across = steps.length <= 4
  return (
    <Section id={block.anchor} heading={block.heading} subheading={block.subheading}>
      <ol
        className={cx(
          '-mx-4 grid border-y border-hair px-4 py-6 lg:mx-0 lg:border-t-0 lg:pt-1',
          across && 'sm:auto-cols-fr sm:grid-flow-col sm:gap-6',
        )}
      >
        {steps.map((step, i) => {
          const last = i === steps.length - 1
          const visual = step.visual ?? 'none'
          return (
            <li
              key={step.id ?? i}
              className={cx(
                'relative grid content-start grid-cols-[30px_minmax(0,1fr)] gap-x-3.5',
                !last && 'pb-8',
                across && 'sm:grid-cols-1 sm:gap-y-4 sm:pb-0',
              )}
            >
              {last ? null : (
                <span
                  aria-hidden="true"
                  className={cx(
                    'absolute start-[14.5px] top-[38px] bottom-2 w-px bg-hair',
                    across && 'sm:hidden',
                  )}
                />
              )}
              <div className="flex h-[30px] items-center self-start">
                <GlyphTile tone="ink">{i + 1}</GlyphTile>
                {across ? (
                  <>
                    <span
                      aria-hidden="true"
                      className={cx(
                        'step-track hidden h-px flex-1 bg-mute/35 sm:block',
                        last ? 'ms-2' : 'ms-2 -me-6',
                      )}
                    />
                    {last ? (
                      <ChevronIcon
                        aria-hidden="true"
                        className="step-track-end -ms-[9px] hidden size-3.5 shrink-0 text-mute/70 sm:block"
                      />
                    ) : null}
                  </>
                ) : null}
              </div>
              <div className="flex flex-col pt-[5px] sm:pt-0">
                <h3 className="text-[17px] font-semibold leading-snug text-ink">{step.title}</h3>
                {step.body ? (
                  <p className="mt-1 max-w-[36ch] text-[15px] leading-relaxed text-pretty text-mute">
                    {step.body}
                  </p>
                ) : null}
                {visual !== 'none' ? (
                  <div className={cx('mt-4', across && 'sm:order-first sm:mt-0 sm:mb-4')}>
                    <StepVignette visual={visual} />
                  </div>
                ) : null}
              </div>
            </li>
          )
        })}
      </ol>
      {block.cta?.label ? (
        <div className="mt-4 -mx-2">
          <CtaLink cta={block.cta} contact={contact} locale={locale} />
        </div>
      ) : null}
    </Section>
  )
}
