import type { Access, FieldAccess, Where } from 'payload'
import { hasRole } from '@/shared/payload/access'

const admin = (user: unknown) => hasRole(user as never, 'admin')

/** Admins see every booking; a signed-in client sees their own (QM-US4-S4). Creators only through server queries. */
export const adminOrMember: Access = ({ req }) => (admin(req.user) ? true : req.user ? { member: { equals: req.user.id } } : false)

/** Quotations follow their booking's owner. */
export const adminOrBookingMember: Access = ({ req }) => (admin(req.user) ? true : req.user ? { 'booking.member': { equals: req.user.id } } : false)

/** Rows addressed to the signed-in user, in-app only. */
export const adminOrRecipient: Access = ({ req }) =>
  admin(req.user) ? true : req.user ? ({ and: [{ user: { equals: req.user.id } }, { channel: { equals: 'in-app' } }] } as Where) : false

/** Written by server code only (Local API with overrideAccess); refused for every REST caller. */
export const serverOnly: FieldAccess = () => false
