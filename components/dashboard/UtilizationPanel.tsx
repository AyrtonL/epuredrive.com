import Link from 'next/link'

interface CarUtilization {
  name: string
  percentage: number
}

interface Props {
  cars: CarUtilization[]
  windowDays: number
}

// Low utilization isn't an error by itself — only flag a car that has
// barely moved in the window.
const IDLE_THRESHOLD_PCT = 15

const barColor = (pct: number): string => (pct < IDLE_THRESHOLD_PCT ? 'bg-amber-400/80' : 'bg-white/70')

export default function UtilizationPanel({ cars, windowDays }: Props) {
  return (
    <div className="glass rounded-2xl p-6 border border-white/[0.10]">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="text-white font-bold text-sm">Fleet utilization</h3>
          <div className="text-[12px] text-white/55 mt-0.5">Days rented, last {windowDays} days</div>
        </div>
        <Link href="/dashboard/finance/utilization" className="px-2.5 py-1.5 -mr-2.5 rounded-lg text-[12px] text-white/60 hover:text-white hover:bg-white/[0.06] transition-colors">
          Details &rarr;
        </Link>
      </div>
      <div className="space-y-3.5">
        {cars.map((car) => (
          <div key={car.name}>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[13px] text-white/80 font-medium truncate mr-3">{car.name}</span>
              <span className={`text-[12px] font-bold tabular-nums shrink-0 ${car.percentage < IDLE_THRESHOLD_PCT ? 'text-amber-300/90' : 'text-white/60'}`}>
                {car.percentage}%
              </span>
            </div>
            <div className="h-1.5 bg-white/[0.10] rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-700 ${barColor(car.percentage)}`}
                style={{ width: `${Math.max(car.percentage, 1)}%` }}
              />
            </div>
          </div>
        ))}
      </div>
      {cars.some((c) => c.percentage < IDLE_THRESHOLD_PCT) && (
        <div className="mt-5 pt-4 border-t border-white/[0.06] flex items-center gap-2 text-[12px] text-white/55">
          <span className="w-2 h-2 rounded-full bg-amber-400/80 shrink-0" />
          Under {IDLE_THRESHOLD_PCT}% — barely rented
        </div>
      )}
    </div>
  )
}
