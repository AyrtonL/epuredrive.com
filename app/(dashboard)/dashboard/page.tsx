// app/dashboard/page.tsx
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import PageHeader from '@/components/dashboard/PageHeader'
import StatCard from '@/components/dashboard/StatCard'
import MaintenanceAlerts from './maintenance/MaintenanceAlerts'
import type { Tenant, Reservation, Car, CarService, Transaction } from '@/lib/supabase/types'

export default async function DashboardPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('profiles')
    .select('tenant_id')
    .eq('id', user!.id)
    .single()

  const tenantId = profile!.tenant_id

  const [{ data: tenant }, { data: cars }, { data: allRes }, { data: services }, { data: transactions }] = await Promise.all([
    supabase.from('tenants').select('name, slug, brand_name, logo_url, plan').eq('id', tenantId).single(),
    supabase.from('cars').select('id, make, model, model_full, status, mileage').eq('tenant_id', tenantId),
    supabase.from('reservations').select('total_amount, status').eq('tenant_id', tenantId).eq('status', 'completed'),
    supabase.from('car_services').select('amount, next_service_date').eq('tenant_id', tenantId),
    supabase.from('transactions').select('amount').eq('tenant_id', tenantId),
  ])

  const t = tenant as Tenant
  const carRows = (cars ?? []) as Car[]
  const resRows = (allRes ?? []) as Reservation[]
  const svcRows = (services ?? []) as CarService[]
  const txRows = (transactions ?? []) as Transaction[]

  const displayName = t.brand_name || t.name
  const fleetUrl = `https://${t.slug}.epuredrive.com`

  const totalGross = resRows.reduce((s, r) => s + (Number(r.total_amount) || 0), 0)
  const totalMaint = svcRows.reduce((s, r) => s + (Number(r.amount) || 0), 0)
  const totalExp = txRows.reduce((s, r) => s + (Number(r.amount) || 0), 0)
  const netProfit = totalGross - totalMaint - totalExp

  const availableCars = carRows.filter(c => c.status === 'available').length
  const maintenanceCars = carRows.filter(c => c.status === 'maintenance').length
  const rentedCars = carRows.filter(c => c.status === 'rented').length

  const alertsCount = svcRows.filter(s => s.next_service_date && new Date(s.next_service_date) < new Date()).length

  return (
    <div className="max-w-5xl mx-auto space-y-12">
      <PageHeader title={`Welcome, ${displayName}`} description="Your fleet at a glance." />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-fade-in-up animation-delay-100">
        <StatCard label="Fleet Net Profit" value={`$${netProfit.toLocaleString(undefined, { maximumFractionDigits: 0 })}`} variant="primary" />
        <StatCard label="Gross Revenue" value={`$${totalGross.toLocaleString(undefined, { maximumFractionDigits: 0 })}`} />
        <StatCard label="Total Expenses" value={`$${(totalMaint + totalExp).toLocaleString(undefined, { maximumFractionDigits: 0 })}`} />
        <StatCard label="Cars Listed" value={carRows.length} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
           {alertsCount > 0 && (
             <MaintenanceAlerts services={svcRows} cars={carRows} />
           )}

           <div className="glass rounded-3xl p-8 border border-white/10">
             <div className="flex items-center justify-between mb-8">
                <h3 className="text-white font-bold tracking-tight">Fleet Status Breakdown</h3>
                <div className="text-[10px] text-white/40 uppercase tracking-[0.2em] font-bold">Real-time overview</div>
             </div>
             <div className="grid grid-cols-3 gap-4 text-center">
               <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
                 <div className="text-2xl font-bold text-emerald-400 mb-1">{availableCars}</div>
                 <div className="text-[10px] text-emerald-400/60 uppercase font-black tracking-widest">Available</div>
               </div>
               <div className="p-4 rounded-2xl bg-orange-500/10 border border-orange-500/20">
                 <div className="text-2xl font-bold text-orange-400 mb-1">{rentedCars}</div>
                 <div className="text-[10px] text-orange-400/60 uppercase font-black tracking-widest">Rented</div>
               </div>
               <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20">
                 <div className="text-2xl font-bold text-red-400 mb-1">{maintenanceCars}</div>
                 <div className="text-[10px] text-red-400/60 uppercase font-black tracking-widest">Maintenance</div>
               </div>
             </div>
           </div>
        </div>

        <div className="space-y-6">
          <div className="glass rounded-3xl p-8 border border-white/10 flex flex-col items-center text-center">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center mb-4 text-primary text-2xl font-black italic">
              É
            </div>
            <h3 className="text-white font-bold mb-1">{displayName}</h3>
            <p className="text-white/40 text-xs mb-6 capitalize">{t.plan || 'Free'} Plan Active</p>
            <a href={fleetUrl} target="_blank" rel="noopener noreferrer" 
               className="w-full bg-white text-black py-3 rounded-xl text-sm font-bold hover:bg-white/90 transition-all">
              Go To Public Fleet
            </a>
            <div className="mt-4 text-[10px] text-white/30 uppercase tracking-widest truncate max-w-full italic">{fleetUrl}</div>
          </div>
        </div>
      </div>

      <div className="animate-fade-in-up animation-delay-200">
        <h2 className="text-xl font-bold text-white mb-6 flex items-center">
          Quick Actions <span className="ml-3 h-px flex-1 bg-gradient-to-r from-surfaceBorder to-transparent" />
        </h2>
        <div className="grid md:grid-cols-3 gap-6">
          <Link href="/dashboard/bookings" className="glass rounded-3xl p-8 transition-all duration-500 hover:-translate-y-1 hover:border-white/20 hover:shadow-[0_8px_30px_rgba(255,255,255,0.05)] group relative overflow-hidden">
             <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="relative z-10 flex items-center justify-between mb-4">
              <div className="text-2xl font-bold text-white group-hover:text-glow transition-all duration-300">Bookings</div>
              <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center group-hover:bg-white group-hover:text-black transition-all duration-300">→</div>
            </div>
            <p className="text-sm text-white/50 font-light relative z-10">Review and manage your incoming reservations meticulously.</p>
          </Link>

          <Link href="/dashboard/fleet" className="glass rounded-3xl p-8 transition-all duration-500 hover:-translate-y-1 hover:border-white/20 hover:shadow-[0_8px_30px_rgba(255,255,255,0.05)] group relative overflow-hidden">
             <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="relative z-10 flex items-center justify-between mb-4">
              <div className="text-2xl font-bold text-white group-hover:text-glow transition-all duration-300">Fleet</div>
              <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center group-hover:bg-white group-hover:text-black transition-all duration-300">→</div>
            </div>
            <p className="text-sm text-white/50 font-light relative z-10">Curate your vehicles, edit details, and dial in availability.</p>
          </Link>

          <a href={fleetUrl} target="_blank" rel="noopener noreferrer" className="glass rounded-3xl p-8 transition-all duration-500 hover:-translate-y-1 hover:border-white/20 hover:shadow-[0_8px_30px_rgba(255,255,255,0.05)] group relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="relative z-10 flex items-center justify-between mb-4">
              <div className="text-2xl font-bold text-white group-hover:text-glow transition-all duration-300">Public Page</div>
              <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center group-hover:bg-white group-hover:text-black transition-all duration-300">↗</div>
            </div>
            <p className="text-[13px] text-white/50 font-light break-all relative z-10">{fleetUrl}</p>
          </a>
        </div>
      </div>
    </div>
  )
}
