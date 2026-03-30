// app/dashboard/layout.tsx
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Outfit } from 'next/font/google'
import '../globals.css'

const outfit = Outfit({ subsets: ['latin'], weight: ['400', '600', '700'] })

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  return (
    <html lang="en">
      <body className={`${outfit.className} bg-[#0d0d0d] text-white min-h-screen`}>
        <div className="flex h-screen overflow-hidden">
          {/* Sidebar */}
          <aside className="w-56 bg-[#111] border-r border-white/10 flex flex-col shrink-0">
            <div className="h-16 flex items-center px-5 border-b border-white/10">
              <img src="/assets/logo.png" alt="éPure Drive" className="h-7" />
            </div>
            <nav className="flex-1 px-3 py-4 space-y-1">
              <a href="/dashboard" className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-white/70 hover:text-white hover:bg-white/5 transition-colors">
                Overview
              </a>
              <a href="/dashboard/fleet" className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-white/70 hover:text-white hover:bg-white/5 transition-colors">
                Fleet Page
              </a>
              <a href="/admin/dashboard.html" className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-white/70 hover:text-white hover:bg-white/5 transition-colors">
                Full Dashboard ↗
              </a>
            </nav>
            <div className="px-5 py-4 border-t border-white/10">
              <p className="text-xs text-white/30 truncate">{user.email}</p>
            </div>
          </aside>

          {/* Main */}
          <main className="flex-1 overflow-y-auto">
            {children}
          </main>
        </div>
      </body>
    </html>
  )
}
