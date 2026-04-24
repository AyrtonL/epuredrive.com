// components/telematics/KpiRow.tsx
// Server component — renders the 4 KPI StatCards at the top of the Live Map.
import StatCard from '@/components/dashboard/StatCard'
import type { TelematicsKpi } from '@/lib/telematics/kpi'

interface Props {
  kpi: TelematicsKpi
}

export default function KpiRow({ kpi }: Props) {
  const onlineLabel =
    kpi.totalCount === 0 ? '—' : `${kpi.onlineCount} / ${kpi.totalCount}`

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
      <StatCard
        label="Vehicles online"
        value={onlineLabel}
        sub={kpi.totalCount === 0 ? 'No devices yet' : 'live feed'}
        accentColor="bg-emerald-500/60"
      />
      <StatCard
        label="Unacked alerts"
        value={kpi.unackedAlerts}
        sub={kpi.unackedAlerts === 0 ? 'All clear' : 'needs review'}
        accentColor={kpi.unackedAlerts > 0 ? 'bg-red-500/60' : undefined}
      />
      <StatCard
        label="Miles today"
        value={kpi.milesToday.toLocaleString()}
        sub="across fleet"
      />
      <StatCard
        label="Avg speed today"
        value={kpi.avgSpeedToday === null ? '—' : `${kpi.avgSpeedToday} mph`}
        sub={kpi.avgSpeedToday === null ? 'No movement yet' : 'mean of readings'}
      />
    </div>
  )
}
