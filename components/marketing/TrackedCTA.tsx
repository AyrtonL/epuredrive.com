'use client'

import Link from 'next/link'
import { trackCTAClick } from '@/lib/analytics'

interface Props {
  href: string
  location: string
  className?: string
  children: React.ReactNode
}

export default function TrackedCTA({ href, location, className, children }: Props) {
  return (
    <Link
      href={href}
      onClick={() => trackCTAClick(location, href)}
      className={className}
    >
      {children}
    </Link>
  )
}
