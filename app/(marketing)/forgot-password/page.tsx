import type { Metadata } from 'next'
import ForgotPasswordForm from './ForgotPasswordForm'

export const metadata: Metadata = {
  title: { absolute: 'Reset Password | éPure Drive' },
  description: 'Reset the password for your éPure Drive account.',
  // Crawlable (not blocked in robots.txt) so search engines can see this noindex.
  robots: { index: false, follow: false },
  openGraph: {
    title: 'Reset Password | éPure Drive',
    description: 'Reset the password for your éPure Drive account.',
    url: 'https://epuredrive.com/forgot-password',
  },
  twitter: {
    title: 'Reset Password | éPure Drive',
    description: 'Reset the password for your éPure Drive account.',
  },
}

export default function ForgotPasswordPage() {
  return (
    <section className="min-h-[90vh] bg-[#0a0a0a] flex items-center justify-center">
      <div className="w-full max-w-md px-6">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Reset your password</h1>
          <p className="text-white/50 text-sm">
            Enter your email and we&apos;ll send you a link to reset your password.
          </p>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-2xl p-8">
          <ForgotPasswordForm />
        </div>
      </div>
    </section>
  )
}
