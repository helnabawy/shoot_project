// Run with `pnpm --filter web seed` (payload run). Loads .env through Payload's CLI.
import config from '@payload-config'
import { getPayload } from 'payload'
import { seed } from './seed'

const payload = await getPayload({ config })
try {
  await seed(payload, {
    adminEmail: process.env.SEED_ADMIN_EMAIL,
    adminPassword: process.env.SEED_ADMIN_PASSWORD,
  })
  process.exit(0)
} catch (error) {
  payload.logger.error(error)
  process.exit(1)
}
