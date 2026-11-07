import type { Access } from 'payload'
import { hasRole } from '@/shared/payload/access'

/** Price rows: everyone reads the active ones (they are shown on quotations), editors read and write all. */
export const activeOrEditor: Access = ({ req }) => (hasRole(req.user as never, 'admin', 'editor') ? true : { active: { equals: true } })
