import type React from 'react'
import Link from 'next/link'
import JsonLd from '@/components/JsonLd'
import { buildBreadcrumbSchema } from '@/lib/utils/jsonld'

const SITE = 'https://epuredrive.com'

interface Crumb {
  name: string
  path: string
}

interface Props {
  badge: string
  title: React.ReactNode
  intro: React.ReactNode
  /** e.g. "October 10, 2026"; shown under the intro */
  updated?: string
  breadcrumbs: Crumb[]
  /** Extra JSON-LD (Article, etc.) rendered after the breadcrumb schema */
  schema?: Record<string, unknown>[]
  ctaTitle?: string
  ctaText?: string
  children: React.ReactNode
}

/**
 * Shared layout for long-form marketing pages (guides, comparisons, pricing):
 * hero, readable article column, closing CTA and breadcrumb schema.
 */
export default function ArticleShell({
  badge,
  title,
  intro,
  updated,
  breadcrumbs,
  schema = [],
  ctaTitle = 'Run your rental business from one dashboard.',
  ctaText = 'Branded booking site, online payments and fleet management. Starter plan free forever — no credit card.',
  children,
}: Props) {
  return (
    <>
      <section className="relative pt-32 pb-14 overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-black" />
        <div className="absolute inset-0 -z-10 bg-grid-lines opacity-100 pointer-events-none" />
        <div className="absolute inset-0 -z-10 bg-warm-glow pointer-events-none" />
        <div className="max-w-3xl mx-auto px-6">
          <nav aria-label="Breadcrumb" className="mb-8 text-xs text-white/35">
            {breadcrumbs.map((c, i) => (
              <span key={c.path}>
                {i > 0 && <span className="mx-2">/</span>}
                {i < breadcrumbs.length - 1 ? (
                  <Link href={c.path} className="hover:text-white transition-colors">{c.name}</Link>
                ) : (
                  <span className="text-white/55">{c.name}</span>
                )}
              </span>
            ))}
          </nav>
          <div className="inline-flex items-center gap-2 bg-white/[0.05] border border-white/[0.09] rounded-full px-4 py-1.5 mb-6">
            <span className="text-[11px] font-bold tracking-[0.25em] text-white/40 uppercase">{badge}</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold text-white leading-[1.08] mb-6 tracking-tight">
            {title}
          </h1>
          <div className="text-lg md:text-xl text-white/50 font-light leading-relaxed">{intro}</div>
          {updated && <p className="mt-6 text-xs text-white/30">Last updated {updated}</p>}
        </div>
      </section>

      <section className="relative pb-20 bg-black">
        <article className="article-body max-w-3xl mx-auto px-6">{children}</article>
      </section>

      <section className="relative py-20 bg-black">
        <div className="section-divider absolute top-0 left-0 right-0" />
        <div className="max-w-3xl mx-auto px-6 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-5 tracking-tight">{ctaTitle}</h2>
          <p className="text-white/40 mb-10 font-light text-lg max-w-lg mx-auto">{ctaText}</p>
          <Link
            href="/sign-up"
            className="inline-block bg-white text-black font-semibold px-12 py-4 rounded-xl text-base hover:bg-white/90 active:scale-[0.97] transition-all cta-glow"
          >
            Get started free
          </Link>
        </div>
      </section>

      <JsonLd
        schema={buildBreadcrumbSchema(breadcrumbs.map((c) => ({ name: c.name, url: `${SITE}${c.path === '/' ? '' : c.path}` })))}
      />
      {schema.map((s, i) => (
        <JsonLd key={i} schema={s} />
      ))}
    </>
  )
}

/** Article schema for guides and comparison pages. */
export function buildArticleSchema(opts: {
  headline: string
  description: string
  path: string
  datePublished: string
  dateModified?: string
}): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: opts.headline,
    description: opts.description,
    url: `${SITE}${opts.path}`,
    mainEntityOfPage: `${SITE}${opts.path}`,
    datePublished: opts.datePublished,
    dateModified: opts.dateModified ?? opts.datePublished,
    image: `${SITE}/og-image.jpg`,
    author: { '@type': 'Organization', name: 'éPure Drive', url: SITE },
    publisher: {
      '@type': 'Organization',
      name: 'éPure Drive',
      logo: { '@type': 'ImageObject', url: `${SITE}/icon-512.png` },
    },
  }
}

/** Page metadata shared by the long-form pages: canonical + OG + Twitter. */
export function articleMetadata(opts: { title: string; description: string; path: string; type?: 'article' | 'website' }) {
  const url = `${SITE}${opts.path}`
  return {
    title: { absolute: opts.title },
    description: opts.description,
    alternates: { canonical: url },
    openGraph: {
      type: opts.type ?? 'article',
      url,
      siteName: 'éPure Drive',
      title: opts.title,
      description: opts.description,
      images: [{ url: `${SITE}/og-image.jpg`, width: 1200, height: 630, alt: 'éPure Drive', type: 'image/jpeg' }],
    },
    twitter: {
      card: 'summary_large_image' as const,
      title: opts.title,
      description: opts.description,
      images: [`${SITE}/og-image.jpg`],
    },
  }
}
