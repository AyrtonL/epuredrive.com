// Shared classes for the public booking widget. Labels used to be 9px at 30%
// opacity — unreadable on phones — so everything here starts at 11px.

export const LABEL = 'block text-[11px] font-bold uppercase tracking-wider text-white/55 ml-1 mb-1.5'

export const FIELD =
  'w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3.5 text-sm text-white placeholder:text-white/35 focus:ring-1 focus:ring-white/40 focus:border-white/40 outline-none appearance-none transition-colors'

export const FIELD_ERROR = 'border-red-400/60 ring-1 ring-red-400/30'

export const PRIMARY_BTN =
  'w-full bg-white text-black font-black uppercase tracking-[0.15em] text-xs py-4 rounded-2xl hover:bg-white/90 active:scale-[0.98] transition-all shadow-xl shadow-white/5 disabled:opacity-40 disabled:cursor-not-allowed'

export const CHOICE = (selected: boolean): string =>
  `rounded-2xl border transition-all duration-200 ${
    selected ? 'bg-white/[0.12] border-white text-white ring-1 ring-white' : 'bg-white/5 border-white/10 text-white/70 hover:border-white/25'
  }`
