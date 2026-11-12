import 'server-only'
import { endpoints } from '@shoot/domain/api/v1'
import { defineHandler } from '@/shared/api/handler'
import { addSample, readMyProfile, removeSample, saveMyProfile, setVisibility, submitForReview, uploadIdentity, uploadPhoto } from './commands/my-profile'

/**
 * The creator's own profile on `/api/mobile/v1/me/creator/profile…` (feature 014): thin adapters over
 * `commands/my-profile.ts`. Every answer is the same `myProfileV1` view.
 */

export const getMyCreatorProfileV1 = defineHandler({ ...endpoints.myCreatorProfile, run: (ctx) => readMyProfile(ctx) })
export const saveMyCreatorProfileV1 = defineHandler({ ...endpoints.creatorProfileSave, run: (ctx, { body }) => saveMyProfile(ctx, body) })
export const submitMyCreatorProfileV1 = defineHandler({ ...endpoints.creatorProfileSubmit, run: (ctx) => submitForReview(ctx) })
export const setMyCreatorVisibilityV1 = defineHandler({ ...endpoints.creatorProfileVisibility, run: (ctx, { body }) => setVisibility(ctx, body.hidden) })
export const uploadMyCreatorPhotoV1 = defineHandler({ ...endpoints.creatorPhotoUpload, run: (ctx, { body }) => uploadPhoto(ctx, body) })
export const addMyCreatorSampleV1 = defineHandler({ ...endpoints.creatorSampleAdd, run: (ctx, { body }) => addSample(ctx, body) })
export const removeMyCreatorSampleV1 = defineHandler({ ...endpoints.creatorSampleRemove, run: (ctx, { params }) => removeSample(ctx, Number(params.index)) })
export const uploadMyCreatorIdentityV1 = defineHandler({ ...endpoints.creatorIdentityUpload, run: (ctx, { params, body }) => uploadIdentity(ctx, params.kind, body) })
