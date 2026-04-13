// components/SignUpForm.tsx
'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { trackPixelEvent } from '@/lib/meta-pixel'
import { trackAdsConversion } from '@/lib/google-ads'

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

    const { data: authData, error: authError } = await supabase.auth.signUp({ email, password })
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

    // 2 — Create tenant via existing Netlify function
    const res = await fetch('/.netlify/functions/create-tenant', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, email, company }),
    })

    if (!res.ok) {
      const data = await res.json()
      setError(data.error || 'Failed to create your account.')
      setLoading(false)
      return
    }

    trackPixelEvent('CompleteRegistration', { content_name: 'Tenant Created' })
    trackAdsConversion('signup')

    router.push('/dashboard')
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
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm px-4 py-3 rounded-lg">
          {error}
        </div>
      )}
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
  )
}
