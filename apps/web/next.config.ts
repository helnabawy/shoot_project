import bundleAnalyzer from '@next/bundle-analyzer'
import { withPayload } from '@payloadcms/next/withPayload'
import type { NextConfig } from 'next'
import createNextIntlPlugin from 'next-intl/plugin'
import path from 'path'
import { fileURLToPath } from 'url'

const dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(dirname, '../..')

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts')
const withBundleAnalyzer = bundleAnalyzer({ enabled: process.env.ANALYZE === 'true' })

const s3Host = process.env.S3_PUBLIC_HOST

const isProd = process.env.NODE_ENV === 'production'

// Baseline CSP for the public site (FR-063 security pass). Inline scripts stay allowed because the
// pages are statically generated (no per-request nonce) and next-themes/JSON-LD/the JS flag are
// inline. WhatsApp is reached by navigation, which CSP does not restrict.
const siteCsp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' data: blob:${s3Host ? ` https://${s3Host}` : ''}`,
  "font-src 'self' data:",
  "connect-src 'self'",
  "frame-ancestors 'self'",
  "base-uri 'self'",
  // Without JavaScript the brief form redirects to WhatsApp, and form-action covers that redirect.
  "form-action 'self' https://wa.me https://api.whatsapp.com",
  "object-src 'none'",
].join('; ')

const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  ...(isProd ? [{ key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' }] : []),
]

const nextConfig: NextConfig = {
  output: 'standalone',
  outputFileTracingRoot: repoRoot,
  // packages/domain ships TypeScript source; Next compiles it with the app.
  transpilePackages: ['@shoot/domain'],
  poweredByHeader: false,
  // addSample uploads a photo (up to 5 MB) through a server action so the form works without JavaScript;
  // Next's default body limit for server actions is 1 MB (specs/002-creator-profiles/research.md §15).
  experimental: { serverActions: { bodySizeLimit: '6mb' } },
  images: {
    formats: ['image/avif', 'image/webp'],
    localPatterns: [{ pathname: '/api/media/file/**' }],
    remotePatterns: s3Host ? [{ protocol: 'https', hostname: s3Host }] : [],
  },
  async headers() {
    return [
      { source: '/:path*', headers: securityHeaders },
      // The Payload admin and API keep their own needs; the CSP covers the public site only.
      ...(isProd
        ? [{ source: '/((?!admin|api|_next/static).*)', headers: [{ key: 'Content-Security-Policy', value: siteCsp }] }]
        : []),
    ]
  },
  webpack: (webpackConfig) => {
    webpackConfig.resolve.extensionAlias = {
      '.cjs': ['.cts', '.cjs'],
      '.js': ['.ts', '.tsx', '.js', '.jsx'],
      '.mjs': ['.mts', '.mjs'],
    }
    return webpackConfig
  },
  turbopack: { root: repoRoot },
}

export default withBundleAnalyzer(withNextIntl(withPayload(nextConfig, { devBundleServerPackages: false })))
