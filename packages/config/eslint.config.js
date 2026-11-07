// Shared ESLint rules for framework-free TypeScript packages (packages/*).
// The web app extends Next's config in apps/web/eslint.config.mjs.
import tseslint from 'typescript-eslint'

export default tseslint.config(...tseslint.configs.recommended, {
  rules: {
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    // packages/domain must stay framework-free (constitution Principle V)
    'no-restricted-imports': [
      'error',
      {
        patterns: [
          { group: ['next', 'next/*', 'react', 'react/*', 'react-dom', 'payload', 'payload/*', '@payloadcms/*'], message: 'packages/domain must not import framework code.' },
        ],
      },
    ],
  },
})
