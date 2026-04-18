interface Props {
  label: string
  value: string | number
  sub?: string
  trend?: number | null
  trendLabel?: string
  accentColor?: string
  variant?: 'default' | 'primary'
}

export default function StatCard({ label, value, sub, trend, trendLabel, accentColor, variant = 'default' }: Props) {
  const isPrimary = variant === 'primary'
  const trendPositive = trend != null && trend >= 0
  const trendColor = trendPositive ? 'text-emerald-400' : 'text-red-400'
  const trendBg = trendPositive ? 'bg-emerald-500/10' : 'bg-red-500/10'

  return (
    <div className={`glass rounded-2xl p-6 relative overflow-hidden group hover:-translate-y-0.5 transition-all duration-300 border ${isPrimary ? 'border-white/[0.16]' : 'border-white/[0.10]'}`}>
      {accentColor && (
        <div className={`absolute top-0 left-0 right-0 h-[2px] ${accentColor}`} />
      )}
      <div className="relative z-10">
        <div className="text-[10px] font-bold text-white/50 uppercase tracking-[0.18em] mb-4">{label}</div>
        <div className="flex items-baseline gap-2.5">
          <div className={`text-3xl font-black tracking-tight truncate ${isPrimary ? 'text-white' : 'text-white/90'}`}>{value}</div>
          {trend != null && (
            <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded ${trendColor} ${trendBg}`}>
              {trendPositive ? '+' : ''}{trend}{trendLabel || '%'}
            </span>
          )}
        </div>
        {sub && <div className="text-[11px] text-white/40 font-medium mt-1.5 truncate">{sub}</div>}
      </div>
    </div>
  )
}
