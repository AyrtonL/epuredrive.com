'use client'

import { useState, useRef, useEffect } from 'react'
import SupportModal from './SupportModal'

interface Props {
  plan: string
}

const PAID_PLANS = ['pro', 'max', 'enterprise']

export default function HelpButton({ plan }: Props) {
  const [open, setOpen] = useState(false)
  const [ticketOpen, setTicketOpen] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!PAID_PLANS.includes(plan)) return
    function handleClickOutside(e: MouseEvent) {
      if (
        panelRef.current &&
        !panelRef.current.contains(e.target as Node) &&
        !buttonRef.current?.contains(e.target as Node)
      ) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [plan])

  if (!PAID_PLANS.includes(plan)) return null

  const isPriority = plan === 'max' || plan === 'enterprise'

  return (
    <>
      {/* Panel */}
      {open && (
        <div
          ref={panelRef}
          className="fixed bottom-24 right-6 z-50 w-72 glass border border-white/10 rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.5)] overflow-hidden animate-fade-in"
        >
          {/* Header */}
          <div className="px-5 py-4 border-b border-white/[0.06] bg-white/[0.03]">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                <svg className="w-3.5 h-3.5 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
              </div>
              <div>
                <div className="text-white text-sm font-semibold">Help & Support</div>
                <div className="text-white/40 text-[11px]">
                  {isPriority ? 'Priority support' : 'Pro support'}
                </div>
              </div>
            </div>
          </div>

          {/* Options */}
          <div className="p-3 space-y-1.5">
            <a
              href="mailto:support@epuredrive.com"
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-white/70 hover:text-white hover:bg-white/[0.06] transition-all duration-200 group"
            >
              <div className="w-8 h-8 rounded-lg bg-white/[0.05] flex items-center justify-center shrink-0 group-hover:bg-white/[0.08]">
                <svg className="w-4 h-4 text-white/40 group-hover:text-white/70" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                  <polyline points="22,6 12,13 2,6" />
                </svg>
              </div>
              <div>
                <div className="text-[13px] font-medium">Email support</div>
                <div className="text-[11px] text-white/30">support@epuredrive.com</div>
              </div>
            </a>

            {isPriority && (
              <a
                href="https://wa.me/1234567890"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-white/70 hover:text-white hover:bg-white/[0.06] transition-all duration-200 group"
              >
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0 group-hover:bg-emerald-500/20">
                  <svg className="w-4 h-4 text-emerald-400/60 group-hover:text-emerald-400" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                  </svg>
                </div>
                <div>
                  <div className="text-[13px] font-medium">WhatsApp</div>
                  <div className="text-[11px] text-white/30">Priority response</div>
                </div>
              </a>
            )}

            <button
              onClick={() => { setTicketOpen(true); setOpen(false) }}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-white/70 hover:text-white hover:bg-white/[0.06] transition-all duration-200 group w-full text-left"
            >
              <div className="w-8 h-8 rounded-lg bg-violet-500/10 flex items-center justify-center shrink-0 group-hover:bg-violet-500/20">
                <svg className="w-4 h-4 text-violet-400/60 group-hover:text-violet-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="12" y1="18" x2="12" y2="12" />
                  <line x1="9" y1="15" x2="15" y2="15" />
                </svg>
              </div>
              <div>
                <div className="text-[13px] font-medium">Submit a ticket</div>
                <div className="text-[11px] text-white/30">Create a support request</div>
              </div>
            </button>

            <a
              href="https://docs.epuredrive.com"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-white/70 hover:text-white hover:bg-white/[0.06] transition-all duration-200 group"
            >
              <div className="w-8 h-8 rounded-lg bg-white/[0.05] flex items-center justify-center shrink-0 group-hover:bg-white/[0.08]">
                <svg className="w-4 h-4 text-white/40 group-hover:text-white/70" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="16" y1="13" x2="8" y2="13" />
                  <line x1="16" y1="17" x2="8" y2="17" />
                  <polyline points="10 9 9 9 8 9" />
                </svg>
              </div>
              <div>
                <div className="text-[13px] font-medium">Documentation</div>
                <div className="text-[11px] text-white/30">Guides & references</div>
              </div>
            </a>
          </div>

          {/* Footer badge */}
          <div className="px-5 py-3 border-t border-white/[0.04] flex items-center gap-2">
            <span className={`inline-block px-2 py-0.5 text-[10px] font-bold tracking-widest rounded-full uppercase ${
              isPriority
                ? 'text-amber-300 bg-amber-500/10 border border-amber-500/20'
                : 'text-primary bg-primary/10 border border-primary/20'
            }`}>
              {plan}
            </span>
            <span className="text-[11px] text-white/25">
              {isPriority ? 'Dedicated support included' : 'Priority support included'}
            </span>
          </div>
        </div>
      )}

      {/* Trigger button */}
      <button
        ref={buttonRef}
        onClick={() => setOpen((v) => !v)}
        aria-label="Help & Support"
        className={`fixed bottom-6 right-6 z-50 w-12 h-12 rounded-full flex items-center justify-center shadow-[0_4px_24px_rgba(0,0,0,0.5)] transition-all duration-200 border ${
          open
            ? 'bg-white text-black border-white/80 scale-95'
            : 'bg-white/10 hover:bg-white/20 text-white border-white/10 hover:border-white/20 backdrop-blur-xl'
        }`}
      >
        {open ? (
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        ) : (
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
        )}
      </button>

      <SupportModal isOpen={ticketOpen} onClose={() => setTicketOpen(false)} />
    </>
  )
}
