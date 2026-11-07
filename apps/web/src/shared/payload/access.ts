import type { Access, FieldAccess } from 'payload'

type Role = 'admin' | 'editor' | 'member'
type WithRoles = { roles?: Role[] | null } | null | undefined

export const hasRole = (user: WithRoles, ...roles: Role[]): boolean =>
  Boolean(user?.roles?.some((r) => roles.includes(r)))

export const anyone: Access = () => true
export const nobody: Access = () => false
export const authenticated: Access = ({ req }) => Boolean(req.user)
export const isAdmin: Access = ({ req }) => hasRole(req.user as WithRoles, 'admin')
/** Admins and editors: the content area (FR-016). */
export const isEditor: Access = ({ req }) => hasRole(req.user as WithRoles, 'admin', 'editor')
/** Admins see everything; members only their own document (FR-024). */
export const isAdminOrSelf: Access = ({ req }) => {
  if (hasRole(req.user as WithRoles, 'admin')) return true
  return req.user ? { id: { equals: req.user.id } } : false
}
export const isAdminField: FieldAccess = ({ req }) => hasRole(req.user as WithRoles, 'admin')
