import { legalMetadata, legalPage, legalRevalidate } from '@/modules/legal/render'

export const revalidate = legalRevalidate
export const generateMetadata = legalMetadata('privacy')
export default legalPage('privacy')
