import config from '@payload-config'
import { getPayload } from 'payload'

/** The Payload Local API for server code (no HTTP round trip). */
export const getPayloadClient = () => getPayload({ config })
