// app/(marketing)/login/page.tsx
import type { Metadata } from 'next'
import LoginForm from '@/components/LoginForm'

export const metadata: Metadata = { title: 'Sign In — éPure Drive Platform' }

export default function LoginPage() {
  return (
    <section className="min-h-[90vh] bg-[#0a0a0a] flex items-center justify-center">
      <div className="w-full max-w-md px-6">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Welcome back</h1>
          <p className="text-white/50 text-sm">Sign in to manage your fleet</p>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-2xl p-8">
          <LoginForm />
        </div>
      </div>
    </section>
  )
}
