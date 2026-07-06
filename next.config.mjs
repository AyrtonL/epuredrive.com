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
