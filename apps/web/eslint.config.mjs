import nextVitals from 'eslint-config-next/core-web-vitals'
import nextTs from 'eslint-config-next/typescript'

const eslintConfig = [
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^(_|ignore)' },
      ],
      'jsx-a11y/alt-text': 'error',
      'jsx-a11y/anchor-is-valid': 'error',
    },
  },
  {
    ignores: [
      '.next/',
      'coverage/',
      'playwright-report/',
      'test-results/',
      'src/payload-types.ts',
      'src/migrations/',
      'src/app/(payload)/admin/importMap.js',
      'next-env.d.ts',
    ],
  },
]

export default eslintConfig
