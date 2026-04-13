import type { Metadata } from 'next'
import ResetPasswordForm from './ResetPasswordForm'

export const metadata: Metadata = {
  title: 'Set New Password — éPure Drive Platform',
  robots: { index: false, follow: false },
}

export default function ResetPasswordPage() {
  return (
    <section className="min-h-[90vh] bg-[#0a0a0a] flex items-center justify-center">
      <div className="w-full max-w-md px-6">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Set new password</h1>
          <p className="text-white/50 text-sm">Enter your new password below.</p>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-2xl p-8">
          <ResetPasswordForm />
        </div>
      </div>
    </section>
  )
}
