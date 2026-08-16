// components/GoogleOneTapButton.tsx
'use client'

import Script from 'next/script'
import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface GoogleCredentialResponse {
  credential: string
}

interface GoogleIdentityServices {
  accounts: {
    id: {
      initialize: (config: Record<string, unknown>) => void
      renderButton: (parent: HTMLElement, options: Record<string, unknown>) => void
    }
  }
}

declare global {
  interface Window {
    google?: GoogleIdentityServices
  }
}

interface GoogleOneTapButtonProps {
  text: 'signin_with' | 'signup_with' | 'continue_with'
  onBeforeSignIn?: () => void
  onError: (message: string) => void
  disabled?: boolean
}

async function generateNonce(): Promise<[string, string]> {
  const raw = crypto.randomUUID() + crypto.randomUUID()
  const hashBuffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(raw))
  const hashed = Array.from(new Uint8Array(hashBuffer))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
  return [raw, hashed]
}

async function completeGoogleSignIn(credential: string, nonce: string): Promise<string> {
  const supabase = createClient()
  const { data, error } = await supabase.auth.signInWithIdToken({
    provider: 'google',
    token: credential,
    nonce,
  })

  if (error || !data.session) {
    throw new Error(error?.message || 'No session returned from Google sign-in.')
  }

  const user = data.session.user
  const accessToken = data.session.access_token

  const { data: profile } = await supabase
    .from('profiles')
    .select('tenant_id')
    .eq('id', user.id)
    .maybeSingle()

  if (profile?.tenant_id) {
    return '/dashboard'
  }

  const company =
    (user.user_metadata?.company as string | undefined) ||
    (user.user_metadata?.full_name as string | undefined) ||
    (user.user_metadata?.name as string | undefined) ||
    ''

  const res = await fetch('/.netlify/functions/create-tenant', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify({ company }),
  })

  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error || 'Failed to create your account.')
  }

  return '/dashboard?signup=google'
}

export default function GoogleOneTapButton({
  text,
  onBeforeSignIn,
  onError,
  disabled,
}: GoogleOneTapButtonProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [scriptLoaded, setScriptLoaded] = useState(false)
  const [signingIn, setSigningIn] = useState(false)

  useEffect(() => {
    if (!scriptLoaded || !containerRef.current) return
    const container = containerRef.current
    let cancelled = false

    async function setup() {
      const [rawNonce, hashedNonce] = await generateNonce()
      if (cancelled || !window.google) return

      window.google.accounts.id.initialize({
        client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
        nonce: hashedNonce,
        callback: async (response: GoogleCredentialResponse) => {
          try {
            setSigningIn(true)
            onBeforeSignIn?.()
            const redirectTo = await completeGoogleSignIn(response.credential, rawNonce)
            window.location.href = redirectTo
          } catch (err) {
            setSigningIn(false)
            onError(err instanceof Error ? err.message : 'Google sign-in failed.')
          }
        },
      })

      const width = Math.min(container.getBoundingClientRect().width || 400, 400)
      container.replaceChildren()
      window.google.accounts.id.renderButton(container, {
        type: 'standard',
        theme: 'filled_black',
        size: 'large',
        text,
        shape: 'rectangular',
        width,
      })
    }

    setup()

    return () => {
      cancelled = true
    }
  }, [scriptLoaded, text, onBeforeSignIn, onError])

  return (
    <>
      <Script
        src="https://accounts.google.com/gsi/client"
        strategy="afterInteractive"
        onLoad={() => setScriptLoaded(true)}
      />
      <div className="relative">
        <div
          ref={containerRef}
          className={disabled || signingIn ? 'pointer-events-none opacity-50' : ''}
        />
        {signingIn && (
          <p className="text-center text-xs text-white/40 mt-2">Signing in…</p>
        )}
      </div>
    </>
  )
}
