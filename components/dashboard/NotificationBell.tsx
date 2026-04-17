'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Notification {
  id: string
  event: string
  title: string
  body: string | null
  metadata: Record<string, unknown>
  read: boolean
  created_at: string
}

const EVENT_ICONS: Record<string, string> = {
  new_booking: '📅',
  booking_modified: '✏️',
  booking_cancelled: '❌',
  maintenance_due: '🔧',
  payment_received: '💰',
  team_invite_accepted: '👤',
  turo_sync_complete: '🔄',
  vehicle_status_change: '🚗',
}

function timeAgo(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000)
  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

export default function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0 })

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch('/api/notifications?limit=20')
      if (!res.ok) return
      const data = await res.json()
      setNotifications(data.notifications ?? [])
      setUnreadCount(data.unread_count ?? 0)
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }, [])

  // Initial fetch
  useEffect(() => {
    fetchNotifications()
  }, [fetchNotifications])

  // Supabase Realtime subscription
  useEffect(() => {
    const supabase = createClient()

    // Remove any stale channel with the same name (singleton client may cache it)
    const existing = supabase.getChannels().find(c => c.topic === 'realtime:notifications-realtime')
    if (existing) supabase.removeChannel(existing)

    const channel = supabase
      .channel('notifications-realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications' },
        () => {
          fetchNotifications()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [fetchNotifications])

  // Click outside to close
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node
      if (
        dropdownRef.current && !dropdownRef.current.contains(target) &&
        buttonRef.current && !buttonRef.current.contains(target)
      ) {
        setOpen(false)
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  const markAsRead = useCallback(async (id: string) => {
    setNotifications(prev =>
      prev.map(n => n.id === id ? { ...n, read: true } : n)
    )
    setUnreadCount(prev => Math.max(0, prev - 1))
    await fetch('/api/notifications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
  }, [])

  const markAllRead = useCallback(async () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
    setUnreadCount(0)
    await fetch('/api/notifications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ all: true }),
    })
  }, [])

  return (
    <div ref={dropdownRef} className="relative">
      {/* Bell Button */}
      <button
        ref={buttonRef}
        onClick={() => {
          if (!open && buttonRef.current) {
            const rect = buttonRef.current.getBoundingClientRect()
            setDropdownPos({ top: rect.bottom + 8, left: rect.left })
          }
          setOpen(prev => !prev)
        }}
        className="relative w-8 h-8 rounded-lg flex items-center justify-center text-white/30 hover:text-white/70 transition-all"
        aria-label="Notifications"
      >
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 01-3.46 0" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full" />
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div style={{ top: dropdownPos.top, left: dropdownPos.left }} className="fixed w-80 max-h-[420px] glass border border-white/10 rounded-2xl shadow-[0_8px_40px_rgba(0,0,0,0.5)] z-[100] flex flex-col overflow-hidden animate-fade-in">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
            <span className="text-white text-sm font-bold">Notifications</span>
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                className="text-[10px] font-medium text-white/40 hover:text-white/70 uppercase tracking-widest transition-colors"
              >
                Mark all read
              </button>
            )}
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            {loading ? (
              <div className="flex items-center justify-center py-10">
                <div className="w-4 h-4 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center px-4">
                <svg className="w-8 h-8 text-white/10 mb-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
                  <path d="M13.73 21a2 2 0 01-3.46 0" />
                </svg>
                <p className="text-white/30 text-xs">No notifications yet</p>
              </div>
            ) : (
              notifications.map((n) => (
                <button
                  key={n.id}
                  onClick={() => { if (!n.read) markAsRead(n.id) }}
                  className={`w-full text-left px-4 py-3 border-b border-white/[0.04] hover:bg-white/[0.03] transition-colors flex gap-3 ${
                    !n.read ? 'bg-white/[0.02]' : ''
                  }`}
                >
                  <span className="text-base mt-0.5 shrink-0">{EVENT_ICONS[n.event] ?? '🔔'}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <span className={`text-sm font-medium truncate ${n.read ? 'text-white/50' : 'text-white'}`}>
                        {n.title}
                      </span>
                      {!n.read && (
                        <span className="w-2 h-2 rounded-full bg-blue-400 shrink-0 mt-1.5" />
                      )}
                    </div>
                    {n.body && (
                      <p className="text-white/30 text-xs mt-0.5 line-clamp-2">{n.body}</p>
                    )}
                    <span className="text-white/20 text-[10px] mt-1 block">{timeAgo(n.created_at)}</span>
                  </div>
                </button>
              ))
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="px-4 py-2.5 border-t border-white/[0.06] text-center">
              <a
                href="/dashboard/settings/notifications"
                className="text-[10px] font-medium text-white/30 hover:text-white/60 uppercase tracking-widest transition-colors"
              >
                Notification Settings
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
