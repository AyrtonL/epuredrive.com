'use client'

import { usePathname } from 'next/navigation'

interface Props {
  slug: string
}

export default function FleetBackLink({ slug }: Props) {
  const pathname = usePathname()
  const href = pathname.startsWith('/sites/') ? `/sites/${slug}` : '/'

  return (
    <a
      href={href}
      className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[.2em] text-white/30 hover:text-white transition-colors mb-8"
    >
      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
      </svg>
      Back to Home
    </a>
  )
}
