interface Props {
  label: string
  value: string | number
  sub?: string
  variant?: 'default' | 'primary'
}

export default function StatCard({ label, value, sub, variant = 'default' }: Props) {
  const isPrimary = variant === 'primary'

  return (
    <div className={`glass rounded-2xl p-6 relative overflow-hidden group hover:-translate-y-1 transition-all duration-500 border ${isPrimary ? 'border-white/[0.16] hover:border-white/30 hover:shadow-[0_12px_40px_rgba(255,255,255,0.08)]' : 'border-white/[0.12] hover:border-white/25 hover:shadow-[0_12px_40px_rgba(255,255,255,0.05)]'}`}>
      <div className={`absolute top-0 right-0 w-28 h-28 rounded-full blur-3xl -mr-8 -mt-8 transition-colors duration-500 ${isPrimary ? 'bg-white/15 group-hover:bg-white/25' : 'bg-white/[0.06] group-hover:bg-white/[0.12]'}`} />
      <div className="relative z-10">
        <div className="text-[10px] font-bold text-white/55 uppercase tracking-[0.2em] mb-3">{label}</div>
        <div className={`text-3xl font-black tracking-tight mb-2 truncate transition-all duration-300 ${isPrimary ? 'text-white group-hover:text-glow' : 'text-white/90 group-hover:text-white group-hover:text-glow'}`}>{value}</div>
        {sub && <div className="text-xs text-white/45 font-medium truncate">{sub}</div>}
      </div>
    </div>
  )
}
