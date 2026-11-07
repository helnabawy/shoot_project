import type { Payload } from 'payload'
import { isEditorUser } from '@/shared/payload/access'
import { countReferences } from './references'

/** An upload nobody has attached to a profile within this long is cleared (research §6). */
export const ORPHAN_AFTER_MS = 24 * 60 * 60 * 1000
const BATCH = 100

/**
 * Deletes images that providers uploaded and that no profile uses (neither its published row nor its
 * latest draft) after 24 hours, which also frees their quota. Editors' uploads are never touched.
 * Returns how many files it deleted.
 */
export async function deleteOrphanedUploads(payload: Payload, now = Date.now()): Promise<number> {
  const cutoff = new Date(now - ORPHAN_AFTER_MS).toISOString()
  const { docs } = await payload.find({
    collection: 'media',
    where: { and: [{ uploadedBy: { exists: true } }, { createdAt: { less_than: cutoff } }] },
    sort: 'createdAt',
    limit: BATCH,
    depth: 1,
    pagination: false,
    overrideAccess: true,
  })
  let deleted = 0
  for (const media of docs) {
    const uploader = media.uploadedBy
    if (!uploader || typeof uploader !== 'object' || isEditorUser(uploader)) continue
    const used = await countReferences(payload, {
      or: [{ photo: { equals: media.id } }, { 'samples.image': { equals: media.id } }],
    })
    if (used > 0) continue
    try {
      await payload.delete({ collection: 'media', id: media.id, overrideAccess: true })
      deleted += 1
    } catch {
      // A reference appeared since the count (the delete guard refused): keep it.
    }
  }
  return deleted
}
