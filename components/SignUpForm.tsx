// components/SignUpForm.tsx
'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { trackPixelEvent } from '@/lib/meta-pixel'
import { trackAdsConversion } from '@/lib/google-ads'
import { trackSignUpStart } from '@/lib/analytics'

export default function SignUpForm() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [oauthLoading, setOauthLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [emailSent, setEmailSent] = useState(false)

  async function handleGoogleSignUp() {
    setOauthLoading(true)
    setError(null)
    trackPixelEvent('Lead', { content_name: 'Google Sign Up' })
    trackAdsConversion('lead')
    trackSignUpStart('google')
    const supabase = createClient()
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/api/auth/callback`,
      },
    })
    if (oauthError) {
      setError(oauthError.message)
      setOauthLoading(false)
    }
  }

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
      options: { data: { company } },
    })
    if (authError) {
      setError(authError.message)
      setLoading(false)
      return
    }

    const userId = authData.user?.id
    if (!userId) {
      setError('Sign up failed — no user ID returned.')
      setLoading(false)
      return
    }

    // Check if email confirmation is required (identities empty = unconfirmed)
    const needsConfirmation = authData.user?.identities?.length === 0
    if (needsConfirmation) {
      setEmailSent(true)
      setLoading(false)
      return
    }

    // Auto-confirmed path: create tenant immediately using the session token.
    const accessToken = authData.session?.access_token
    if (!accessToken) {
      setError('Sign up succeeded but no session token was returned.')
      setLoading(false)
      return
    }

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
        <a href="/login" className="text-white/60 hover:text-white text-sm transition-colors inline-block mt-2">
          Back to sign in
        </a>
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

      <button
        type="button"
        onClick={handleGoogleSignUp}
        disabled={oauthLoading || loading}
        className="w-full flex items-center justify-center gap-3 bg-white/5 border border-white/10 text-white font-medium py-3 rounded-lg text-sm hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        <svg className="w-5 h-5" viewBox="0 0 24 24">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
        </svg>
        {oauthLoading ? 'Redirecting…' : 'Sign up with Google'}
      </button>

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
