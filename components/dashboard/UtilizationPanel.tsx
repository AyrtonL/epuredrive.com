import Link from 'next/link'

interface CarUtilization {
  name: string
  percentage: number
}

interface Props {
  cars: CarUtilization[]
}

const barColor = (pct: number): string => {
  if (pct >= 80) return 'bg-emerald-400'
  if (pct >= 60) return 'bg-yellow-400'
  if (pct >= 40) return 'bg-orange-400'
  return 'bg-red-400'
}

export default function UtilizationPanel({ cars }: Props) {
  return (
    <div className="glass rounded-2xl p-6 border border-white/[0.10]">
      <div className="flex items-center justify-between mb-5">
        <div>
          <div className="text-[10px] font-bold text-white/40 uppercase tracking-[0.18em] mb-1">Fleet</div>
          <h3 className="text-white font-bold text-sm">Utilization</h3>
        </div>
        <Link href="/dashboard/fleet" className="text-[11px] text-white/40 hover:text-white/70 transition-colors">
          See all &rarr;
        </Link>
      </div>
      <div className="space-y-3.5">
        {cars.map((car) => (
          <div key={car.name}>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[12px] text-white/70 font-medium truncate mr-3">{car.name}</span>
              <span className="text-[11px] text-white/50 font-bold tabular-nums shrink-0">{car.percentage}%</span>
            </div>
            <div className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-700 ${barColor(car.percentage)}`}
                style={{ width: `${car.percentage}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
