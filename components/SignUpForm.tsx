// components/SignUpForm.tsx
'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { trackPixelEvent } from '@/lib/meta-pixel'
import { trackAdsConversion } from '@/lib/google-ads'
import { trackSignUpStart } from '@/lib/analytics'
import GoogleOneTapButton from '@/components/GoogleOneTapButton'

export default function SignUpForm() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [emailSent, setEmailSent] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const form = new FormData(e.currentTarget)
    const email = form.get('email') as string
    const password = form.get('password') as string
    const company = form.get('company') as string

    const supabase = createClient()

    trackPixelEvent('Lead', { content_name: 'Sign Up Form Submit' })
    trackAdsConversion('lead')
    trackSignUpStart('email')

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { company },
        emailRedirectTo: `${window.location.origin}/api/auth/callback`,
      },
    })
    if (authError) {
      setError(authError.message)
      setLoading(false)
      return
    }

    if (!authData.user?.id) {
      setError('Sign up failed — no user ID returned.')
      setLoading(false)
      return
    }

    // No session => either email confirmation is required OR the address is
    // already registered (Supabase returns both states the same way to prevent
    // email enumeration). In either case, tell the user to check their email.
    if (!authData.session) {
      setEmailSent(true)
      setLoading(false)
      return
    }

    // Auto-confirmed path: create tenant immediately using the session token.
    const accessToken = authData.session.access_token

    const res = await fetch('/.netlify/functions/create-tenant', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ company }),
    })

    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setError(data.error || 'Failed to create your account.')
      setLoading(false)
      return
    }

    router.push('/dashboard?signup=email')
  }

  if (emailSent) {
    return (
      <div className="text-center space-y-4 py-4">
        <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 flex items-center justify-center mx-auto">
          <svg className="w-8 h-8 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        </div>
        <h3 className="text-white font-bold text-lg">Check your email</h3>
        <p className="text-white/50 text-sm max-w-xs mx-auto">
          We sent a confirmation link to your email. Click it to activate your account and access your dashboard.
        </p>
        <div className="mt-4 pt-4 border-t border-white/10 text-xs text-white/40 max-w-xs mx-auto">
          Already signed up before?{' '}
          <a href="/login" className="text-white/70 hover:text-white underline transition-colors">
            Sign in instead
          </a>
          {' '}or{' '}
          <a href="/forgot-password" className="text-white/70 hover:text-white underline transition-colors">
            reset your password
          </a>.
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      <GoogleOneTapButton
        text="signup_with"
        disabled={loading}
        onBeforeSignIn={() => {
          trackPixelEvent('Lead', { content_name: 'Google Sign Up' })
          trackAdsConversion('lead')
          trackSignUpStart('google')
        }}
        onError={(message) => setError(message)}
      />

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-white/10"></div>
        </div>
        <div className="relative flex justify-center text-xs">
          <span className="bg-white/5 px-3 text-white/40">or</span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="company" className="block text-sm text-white/60 mb-1">Company name</label>
        <input
          id="company"
          name="company"
          type="text"
          required
          placeholder="Miami Luxury Rentals"
          className="w-full bg-white/5 border border-white/10 text-white placeholder:text-white/30 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-white/30"
        />
      </div>
      <div>
        <label htmlFor="email" className="block text-sm text-white/60 mb-1">Email</label>
        <input
          id="email"
          name="email"
          type="email"
          required
          placeholder="you@yourcompany.com"
          className="w-full bg-white/5 border border-white/10 text-white placeholder:text-white/30 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-white/30"
        />
      </div>
      <div>
        <label htmlFor="password" className="block text-sm text-white/60 mb-1">Password</label>
        <input
          id="password"
          name="password"
          type="password"
          required
          minLength={8}
          placeholder="Min. 8 characters"
          className="w-full bg-white/5 border border-white/10 text-white placeholder:text-white/30 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-white/30"
        />
      </div>
      <button
        type="submit"
        disabled={loading}
        className="w-full bg-white text-black font-semibold py-3 rounded-lg text-sm hover:bg-white/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {loading ? 'Creating account…' : 'Create your fleet page →'}
      </button>
      <p className="text-center text-xs text-white/30">
        Already have an account?{' '}
        <a href="/login" className="text-white/60 hover:text-white transition-colors">Sign in</a>
      </p>
      </form>
    </div>
  )
}
