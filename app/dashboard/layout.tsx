// app/dashboard/layout.tsx
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Sidebar from '@/components/dashboard/Sidebar'
import { Outfit } from 'next/font/google'
import '../globals.css'

const outfit = Outfit({ subsets: ['latin'], weight: ['300', '400', '500', '600', '700', '800'] })

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  return (
    <html lang="en" className="dark">
      <body className={`${outfit.className} bg-background text-primary min-h-screen selection:bg-white/30 selection:text-white`}>
        <div className="flex h-screen overflow-hidden bg-background">
          <Sidebar email={user.email ?? ''} role={profile?.role ?? null} />
          <main className="flex-1 overflow-y-auto p-6 md:p-10 lg:p-12 relative z-0">
            {/* Subtle radial gradient background behind the dashboard content */}
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-hero-glow opacity-30 -z-10 pointer-events-none" />
            
            <div className="animate-fade-in-up">
              {children}
            </div>
          </main>
        </div>
      </body>
    </html>
  )
}
