import { legalMetadata, legalPage } from '@/modules/legal/render'

// Must be a literal Next.js can read statically; keep equal to legalRevalidate in modules/legal/render.
export const revalidate = 60
export const generateMetadata = legalMetadata('professional-terms')
export default legalPage('professional-terms')
