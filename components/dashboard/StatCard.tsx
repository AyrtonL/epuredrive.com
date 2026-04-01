interface Props {
  label: string
  value: string | number
  sub?: string
  variant?: 'default' | 'primary'
}

export default function StatCard({ label, value, sub, variant = 'default' }: Props) {
  const isPrimary = variant === 'primary'

  return (
    <div className={`glass rounded-3xl p-6 relative overflow-hidden group hover:-translate-y-1 transition-all duration-500 border border-white/5 ${isPrimary ? 'hover:border-primary/40 hover:shadow-[0_8px_30px_rgba(var(--primary-rgb),0.2)]' : 'hover:border-white/20 hover:shadow-[0_8px_30px_rgba(255,255,255,0.05)]'}`}>
      <div className={`absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl -mr-10 -mt-10 transition-colors duration-500 ${isPrimary ? 'bg-primary/20 group-hover:bg-primary/30' : 'bg-white/5 group-hover:bg-white/10'}`} />
      <div className="relative z-10">
        <div className="text-[10px] font-bold text-white/40 uppercase tracking-[0.2em] mb-3">{label}</div>
        <div className={`text-3xl font-black tracking-tight mb-2 truncate transition-all duration-300 ${isPrimary ? 'text-primary group-hover:text-glow-primary' : 'text-white group-hover:text-glow'}`}>{value}</div>
        {sub && <div className="text-xs text-white/30 font-medium truncate">{sub}</div>}
      </div>
    </div>
  )
}
