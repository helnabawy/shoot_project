import 'server-only'
import { endpoints } from '@shoot/domain/api/v1'
import { defineHandler } from '@/shared/api/handler'
import { creatorHome } from './queries'

/** The creator home on `/api/mobile/v1/me/creator/home` (feature 023). Answers use the existing booking and brief endpoints. */
export const getCreatorHomeV1 = defineHandler({ ...endpoints.creatorHome, run: (ctx) => creatorHome(ctx) })
