interface Props {
  /** Site path prefix from getSiteBase(): '' on a tenant host, '/sites/[slug]' otherwise */
  base: string
}

export default function FleetBrowseLink({ base }: Props) {
  const href = `${base}/fleet`

  return (
    <a
      href={href}
      className="flex items-center justify-center w-full py-4 rounded-2xl bg-white/5 border border-white/5 text-white/40 text-[10px] font-black uppercase tracking-widest hover:bg-white/10 hover:text-white transition-all"
    >
      Browse More Vehicles
    </a>
  )
}
