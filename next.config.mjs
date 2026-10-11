/** Keep in sync with middleware.ts. Netlify purges its CDN cache on every deploy. */
const MARKETING_CDN_CACHE = 'public, s-maxage=3600, stale-while-revalidate=86400, durable'

/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // Car image uploads go through a Server Action (uploadCarImage). The
    // default Server Action body limit is 1MB, which silently rejects most
    // photos and leaves the UI stuck on "Uploading…". Match the 10MB per-file
    // cap enforced in upload-actions.ts / ImageUploader.
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
  // Marketing pages render the same HTML for every visitor, but the root
  // layout reads headers() (for <html lang>) so Next marks them dynamic and
  // sends `Cache-Control: private, no-store` — every visit waited on a
  // function. Let Netlify's CDN cache them instead. Netlify purges its cache
  // on each deploy, so copy changes still go live immediately. Browsers keep
  // Next's no-store; only the CDN caches. Host-restricted so tenant sites
  // (slug.epuredrive.com/, DB-driven) are never cached here.
  async headers() {
    const cdnCache = {
      key: 'Netlify-CDN-Cache-Control',
      value: MARKETING_CDN_CACHE,
    }
    // '/' is handled in middleware: it may answer with a language redirect,
    // which must never be cached.
    return ['/es', '/features', '/faq', '/terms', '/privacy', '/cookies'].map((source) => ({
      source,
      has: [{ type: 'host', value: 'epuredrive.com' }],
      headers: [cdnCache],
    }))
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'brwzjwbpguiignrxvjdc.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
}

export default nextConfig
