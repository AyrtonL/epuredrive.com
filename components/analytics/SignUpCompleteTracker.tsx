'use client'

import { useEffect } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { trackPixelEvent } from '@/lib/meta-pixel'
import { trackAdsConversion } from '@/lib/google-ads'
import { trackSignUpComplete } from '@/lib/analytics'

export default function SignUpCompleteTracker() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  useEffect(() => {
    const signup = searchParams.get('signup')
    if (signup !== 'email' && signup !== 'google') return

    trackPixelEvent('CompleteRegistration', { content_name: 'Tenant Created' })
    trackAdsConversion('signup')
    trackSignUpComplete(signup)

    const params = new URLSearchParams(searchParams.toString())
    params.delete('signup')
    const query = params.toString()
    router.replace(query ? `${pathname}?${query}` : pathname)
  }, [searchParams, pathname, router])

  return null
}
