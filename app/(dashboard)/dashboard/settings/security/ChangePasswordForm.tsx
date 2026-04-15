'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function ChangePasswordForm() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(false)

    const form = new FormData(e.currentTarget)
    const currentPassword = String(form.get('currentPassword') || '')
    const newPassword = String(form.get('newPassword') || '')
    const confirm = String(form.get('confirm') || '')

    if (newPassword.length < 8) {
      setError('New password must be at least 8 characters.')
      setLoading(false)
      return
    }

    if (newPassword !== confirm) {
      setError('New passwords do not match.')
      setLoading(false)
      return
    }

    if (newPassword === currentPassword) {
      setError('New password must be different from your current password.')
      setLoading(false)
      return
    }

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user?.email) {
      setError('Session expired. Please sign in again.')
      setLoading(false)
      return
    }

    // Re-authenticate with current password before allowing the change
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: currentPassword,
    })

    if (signInError) {
      setError('Current password is incorrect.')
      setLoading(false)
      return
    }

    const { error: updateError } = await supabase.auth.updateUser({ password: newPassword })

    if (updateError) {
      setError(updateError.message)
      setLoading(false)
      return
    }

    // Fire branded "password changed" security email (non-blocking)
    fetch('/api/auth/password-changed', { method: 'POST' }).catch(() => {})

    e.currentTarget.reset()
    setSuccess(true)
    setLoading(false)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm px-4 py-3 rounded-xl">
          {error}
        </div>
      )}
      {success && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm px-4 py-3 rounded-xl">
          Password updated. We&apos;ve sent a confirmation to your email.
        </div>
      )}

      <div>
        <label
          htmlFor="currentPassword"
          className="block text-[10px] font-bold tracking-[0.2em] uppercase text-white/40 mb-2"
        >
          Current Password
        </label>
        <input
          id="currentPassword"
          name="currentPassword"
          type="password"
          required
          autoComplete="current-password"
          className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-white text-sm placeholder-white/20 focus:outline-none focus:border-white/20 transition-colors"
        />
      </div>

      <div>
        <label
          htmlFor="newPassword"
          className="block text-[10px] font-bold tracking-[0.2em] uppercase text-white/40 mb-2"
        >
          New Password
        </label>
        <input
          id="newPassword"
          name="newPassword"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-white text-sm placeholder-white/20 focus:outline-none focus:border-white/20 transition-colors"
        />
        <p className="text-white/30 text-[11px] mt-2">Minimum 8 characters.</p>
      </div>

      <div>
        <label
          htmlFor="confirm"
          className="block text-[10px] font-bold tracking-[0.2em] uppercase text-white/40 mb-2"
        >
          Confirm New Password
        </label>
        <input
          id="confirm"
          name="confirm"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-white text-sm placeholder-white/20 focus:outline-none focus:border-white/20 transition-colors"
        />
      </div>

      <div className="pt-2">
        <button
          type="submit"
          disabled={loading}
          className="bg-white text-black px-10 py-4 rounded-2xl text-xs font-black uppercase tracking-[0.2em] hover:bg-white/90 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
        >
          {loading ? 'Updating…' : 'Update Password'}
        </button>
      </div>
    </form>
  )
}
