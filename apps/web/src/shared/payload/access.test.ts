import type { PayloadRequest } from 'payload'
import { describe, expect, it } from 'vitest'
import { anyone, authenticated, hasRole, isAdmin, isAdminField, isAdminOrSelf, isEditor, nobody } from './access'

const req = (user: unknown) => ({ req: { user } as unknown as PayloadRequest })
const admin = { id: 1, roles: ['admin'] }
const editor = { id: 2, roles: ['editor'] }
const member = { id: 3, roles: ['member'] }

describe('FR-016 / FR-024 access matrix', () => {
  it.each([
    ['anonymous', null, { anyone: true, authenticated: false, isAdmin: false, isEditor: false }],
    ['member', member, { anyone: true, authenticated: true, isAdmin: false, isEditor: false }],
    ['editor', editor, { anyone: true, authenticated: true, isAdmin: false, isEditor: true }],
    ['admin', admin, { anyone: true, authenticated: true, isAdmin: true, isEditor: true }],
  ])('%s', (_label, user, expected) => {
    expect(anyone(req(user))).toBe(expected.anyone)
    expect(authenticated(req(user))).toBe(expected.authenticated)
    expect(isAdmin(req(user))).toBe(expected.isAdmin)
    expect(isEditor(req(user))).toBe(expected.isEditor)
    expect(nobody(req(user))).toBe(false)
  })

  it('isAdminOrSelf: admin sees all, member sees own, anonymous nothing', () => {
    expect(isAdminOrSelf(req(admin))).toBe(true)
    expect(isAdminOrSelf(req(member))).toEqual({ id: { equals: 3 } })
    expect(isAdminOrSelf(req(null))).toBe(false)
  })

  it('field-level admin access', () => {
    expect(isAdminField(req(admin) as never)).toBe(true)
    expect(isAdminField(req(editor) as never)).toBe(false)
  })

  it('hasRole tolerates missing roles', () => {
    expect(hasRole({ roles: null }, 'admin')).toBe(false)
    expect(hasRole(undefined, 'member')).toBe(false)
  })
})
