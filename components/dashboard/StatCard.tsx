interface Props {
  label: string
  value: string | number
  sub?: string
}

export default function StatCard({ label, value, sub }: Props) {
  return (
    <div className="glass rounded-3xl p-6 relative overflow-hidden group hover:-translate-y-1 transition-all duration-500 hover:border-white/20 hover:shadow-[0_8px_30px_rgba(255,255,255,0.05)]">
      <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-3xl -mr-10 -mt-10 group-hover:bg-white/10 transition-colors duration-500" />
      <div className="relative z-10">
        <div className="text-sm font-semibold text-white/40 uppercase tracking-widest mb-2">{label}</div>
        <div className="text-4xl font-extrabold text-white tracking-tight mb-2 truncate group-hover:text-glow transition-all duration-300">{value}</div>
        {sub && <div className="text-xs text-white/50 font-medium truncate">{sub}</div>}
      </div>
    </div>
  )
}
