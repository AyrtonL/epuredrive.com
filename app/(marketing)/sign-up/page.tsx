// app/(marketing)/sign-up/page.tsx
import type { Metadata } from 'next'
import SignUpForm from '@/components/SignUpForm'

export const metadata: Metadata = { title: 'Sign Up — éPure Drive Platform' }

export default function SignUpPage() {
  return (
    <section className="min-h-[90vh] bg-[#0a0a0a] flex items-center justify-center">
      <div className="w-full max-w-md px-6">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Get your fleet page</h1>
          <p className="text-white/50 text-sm">Free forever. Live in minutes.</p>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-2xl p-8">
          <SignUpForm />
        </div>
      </div>
    </section>
  )
}
