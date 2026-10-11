// app/(marketing)/sign-up/page.tsx
import type { Metadata } from 'next'
import SignUpForm from '@/components/SignUpForm'

export const metadata: Metadata = {
  title: { absolute: 'Create Your Free Account | éPure Drive' },
  description: 'Create a free éPure Drive account and launch a branded booking site for your rental fleet in minutes.',
  // Crawlable (not blocked in robots.txt) so search engines can see this noindex.
  robots: { index: false, follow: false },
  openGraph: {
    title: 'Create Your Free Account | éPure Drive',
    description: 'Create a free éPure Drive account and launch a branded booking site for your rental fleet in minutes.',
    url: 'https://epuredrive.com/sign-up',
  },
  twitter: {
    title: 'Create Your Free Account | éPure Drive',
    description: 'Create a free éPure Drive account and launch a branded booking site for your rental fleet in minutes.',
  },
}

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
