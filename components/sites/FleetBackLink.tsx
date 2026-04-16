'use client'

import { useState, useEffect } from 'react'

interface Props {
  slug: string
}

export default function FleetBackLink({ slug }: Props) {
  const [href, setHref] = useState('/')

  useEffect(() => {
    if (window.location.pathname.startsWith('/sites/')) {
      setHref(`/sites/${slug}`)
    }
  }, [slug])

  return (
    <a
      href={href}
      className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[.2em] text-white/60 hover:text-white transition-colors mb-8"
    >
      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
      </svg>
      Back to Home
    </a>
  )
}
