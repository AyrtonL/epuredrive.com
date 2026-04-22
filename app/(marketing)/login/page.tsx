// app/(marketing)/login/page.tsx
import type { Metadata } from 'next'
import LoginForm from '@/components/LoginForm'

export const metadata: Metadata = {
  title: 'Sign In — éPure Drive Platform',
  robots: { index: false, follow: false },
}

const ERROR_MESSAGES: Record<string, string> = {
  auth_callback_failed:
    'We could not finish signing you in. Please try again.',
  tenant_create_failed:
    'Your account was created but we could not set up your workspace. Please sign in again and contact support if this persists.',
}

export default function LoginPage({
  searchParams,
}: {
  searchParams: { error?: string }
}) {
  const errorMessage = searchParams.error
    ? ERROR_MESSAGES[searchParams.error] ?? null
    : null

  return (
    <section className="min-h-[90vh] bg-[#0a0a0a] flex items-center justify-center">
      <div className="w-full max-w-md px-6">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Welcome back</h1>
          <p className="text-white/50 text-sm">Sign in to manage your fleet</p>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-2xl p-8 space-y-4">
          {errorMessage && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm px-4 py-3 rounded-lg">
              {errorMessage}
            </div>
          )}
          <LoginForm />
        </div>
      </div>
    </section>
  )
}
