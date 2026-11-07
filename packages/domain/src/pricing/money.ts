/** Every amount in the app is an integer number of fils (AED × 100): sums and percentages never drift. */
export const CURRENCY = 'AED'

/** AED as an editor types it → fils, rounded half-up. */
export function fils(aed: number): number {
  return Math.round(aed * 100)
}

/** Fils → AED for an editor's form. */
export function toAed(amount: number): number {
  return amount / 100
}

export function sumAmounts(lines: readonly { amount: number }[]): number {
  return lines.reduce((total, line) => total + line.amount, 0)
}

/** "AED 800" / "‏800 د.إ.‏"; two decimals only when the amount has fils. */
export function formatMoney(amount: number, locale: string): string {
  const digits = amount % 100 === 0 ? 0 : 2
  return new Intl.NumberFormat(locale === 'ar' ? 'ar-AE' : 'en-AE', {
    style: 'currency',
    currency: CURRENCY,
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(amount / 100)
}
