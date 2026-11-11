import { defineConfig } from '@playwright/test'

// Feature 007: `refs` renders the canvas boards; `compare` checks the app's goldens against them.
// References come only from the boards: snapshots are never written (FR-045).
export default defineConfig({
  testDir: './tests',
  outputDir: './build/test-results',
  snapshotPathTemplate: 'build/refs/{arg}{ext}',
  updateSnapshots: 'none',
  reporter: [['list'], ['html', { outputFolder: 'build/report', open: 'never' }]],
  workers: 4,
  retries: 0,
  fullyParallel: true,
  use: { deviceScaleFactor: 2, reducedMotion: 'reduce', browserName: 'chromium' },
  projects: [
    { name: 'unit', testMatch: /manifest\.spec\.ts/ },
    { name: 'refs', testMatch: /(refs|derivation)\.spec\.ts/ },
    { name: 'compare', testMatch: /compare\.spec\.ts/, dependencies: ['refs'] },
  ],
})
