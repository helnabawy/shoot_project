import { legalMetadata, legalPage, legalRevalidate } from '@/modules/legal/render'

export const revalidate = legalRevalidate
export const generateMetadata = legalMetadata('professional-terms')
export default legalPage('professional-terms')
