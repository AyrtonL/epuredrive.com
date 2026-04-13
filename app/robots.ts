import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/dashboard/',
        '/login',
        '/sign-up',
        '/forgot-password',
        '/reset-password',
      ],
    },
    sitemap: 'https://epuredrive.com/sitemap.xml',
  }
}
