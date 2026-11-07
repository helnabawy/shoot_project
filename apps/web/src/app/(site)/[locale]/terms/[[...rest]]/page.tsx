import { legalMetadata, legalPage, legalRevalidate } from '@/modules/legal/render'

export const revalidate = legalRevalidate
export const generateMetadata = legalMetadata('terms')
export default legalPage('terms')
