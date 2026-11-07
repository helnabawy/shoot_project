import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql'
import { execSync } from 'node:child_process'
import type { TestProject } from 'vitest/node'

let container: StartedPostgreSqlContainer | undefined

export const TEST_ENV = {
  PAYLOAD_SECRET: 'integration-test-secret-integration-test-secret',
  NEXT_PUBLIC_SITE_URL: 'http://localhost:3000',
  PREVIEW_SECRET: 'integration-preview-secret',
  CRON_SECRET: 'integration-cron-secret!!',
}

/** Starts a throwaway PostgreSQL and applies the committed migrations (constitution Principle III). */
export async function setup(project: TestProject) {
  container = await new PostgreSqlContainer('postgres:17').start()
  const databaseUri = container.getConnectionUri()
  const env = { ...process.env, ...TEST_ENV, DATABASE_URI: databaseUri, PAYLOAD_MIGRATING: 'true', NODE_ENV: 'test' } as NodeJS.ProcessEnv
  execSync('pnpm payload migrate', { stdio: 'pipe', env })
  Object.assign(process.env, TEST_ENV, { DATABASE_URI: databaseUri })
  project.provide('databaseUri', databaseUri)
}

export async function teardown() {
  await container?.stop()
}

declare module 'vitest' {
  export interface ProvidedContext {
    databaseUri: string
  }
}
