interface Props {
  label: string
  value: string | number
  sub?: string
  trend?: number | null
  trendLabel?: string
  accentColor?: string
  variant?: 'default' | 'primary'
  /** Optional daily values rendered as a sparkline under the value. */
  sparkline?: readonly number[]
  sparklineLabel?: string
}

const SPARK_W = 120
const SPARK_H = 28

function Sparkline({ values, label }: { values: readonly number[]; label?: string }) {
  if (values.length < 2) return null
  const max = Math.max(...values)
  const min = Math.min(...values)
  const range = max - min || 1
  const step = SPARK_W / (values.length - 1)
  const points = values.map((v, i) => `${(i * step).toFixed(1)},${(SPARK_H - 2 - ((v - min) / range) * (SPARK_H - 4)).toFixed(1)}`)
  const area = `0,${SPARK_H} ${points.join(' ')} ${SPARK_W},${SPARK_H}`

  return (
    <svg
      viewBox={`0 0 ${SPARK_W} ${SPARK_H}`}
      preserveAspectRatio="none"
      className="w-full h-7 mt-3"
      role="img"
      aria-label={label ?? 'Last 30 days'}
    >
      <polygon points={area} className="fill-white/[0.05]" />
      <polyline points={points.join(' ')} fill="none" className="stroke-white/50" strokeWidth={1.5} vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
    </svg>
  )
}

export default function StatCard({ label, value, sub, trend, trendLabel, accentColor, variant = 'default', sparkline, sparklineLabel }: Props) {
  const isPrimary = variant === 'primary'
  const trendPositive = trend != null && trend >= 0
  const trendColor = trendPositive ? 'text-emerald-400' : 'text-red-400'
  const trendBg = trendPositive ? 'bg-emerald-500/10' : 'bg-red-500/10'

  return (
    <div className={`glass rounded-2xl p-4 md:p-6 relative overflow-hidden group hover:-translate-y-0.5 transition-all duration-300 border ${isPrimary ? 'border-white/[0.16]' : 'border-white/[0.10]'}`}>
      {accentColor && (
        <div className={`absolute top-0 left-0 right-0 h-[2px] ${accentColor}`} />
      )}
      <div className="relative z-10">
        <div className="text-[10px] font-bold text-white/55 uppercase tracking-[0.18em] mb-2 md:mb-4">{label}</div>
        <div className="flex items-baseline gap-2.5">
          <div className={`text-2xl md:text-3xl font-black tracking-tight truncate ${isPrimary ? 'text-white' : 'text-white/90'}`}>{value}</div>
          {trend != null && (
            <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded ${trendColor} ${trendBg}`}>
              {trendPositive ? '+' : ''}{trend}{trendLabel ?? '%'}
            </span>
          )}
        </div>
        {sub && <div className="text-[12px] text-white/60 font-medium mt-1.5 md:truncate">{sub}</div>}
        {sparkline && <Sparkline values={sparkline} label={sparklineLabel} />}
      </div>
    </div>
  )
}
