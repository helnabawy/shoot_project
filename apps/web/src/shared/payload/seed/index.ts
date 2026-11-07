// Run with `pnpm --filter web seed` (payload run). Loads .env through Payload's CLI.
import config from '@payload-config'
import { getPayload } from 'payload'
import { seed } from './seed'

const payload = await getPayload({ config })
try {
  await seed(payload, {
    adminEmail: process.env.SEED_ADMIN_EMAIL,
    adminPassword: process.env.SEED_ADMIN_PASSWORD,
    // Local/e2e only: refused unless NEXT_PUBLIC_SITE_URL is a local or test host.
    demoCreators: process.env.SEED_DEMO_CREATORS === '1',
    demoGuides: process.env.SEED_DEMO_GUIDES === '1',
    siteUrl: process.env.NEXT_PUBLIC_SITE_URL,
    demoPassword: process.env.SEED_ADMIN_PASSWORD,
  })
  process.exit(0)
} catch (error) {
  payload.logger.error(error)
  process.exit(1)
}
