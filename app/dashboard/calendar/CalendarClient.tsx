'use client'

import { useState, useMemo, useTransition } from 'react'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import listPlugin from '@fullcalendar/list'
import interactionPlugin from '@fullcalendar/interaction'
import type { Reservation, Car } from '@/lib/supabase/types'
import { deleteBlockedDate } from './actions'
import BlockDateModal from './BlockDateModal'
import ReservationDetailModal from './ReservationDetailModal'

function stringToColor(str: string) {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash)
  }
  let color = '#'
  for (let i = 0; i < 3; i++) {
    const value = (hash >> (i * 8)) & 0xff
    color += ('00' + value.toString(16)).substr(-2)
  }
  return color
}

export default function CalendarClient({
  reservations,
  cars,
  blockedDates,
}: {
  reservations: Reservation[]
  cars: Car[]
  blockedDates: any[]
}) {
  const [, startTransition] = useTransition()
  const [activeCarFilter, setActiveCarFilter] = useState('all')
  const [blockModalOpen, setBlockModalOpen] = useState(false)
  const [detailRes, setDetailRes] = useState<Reservation | null>(null)

  const carMap = useMemo(() => {
    return Object.fromEntries(cars.map((c) => [c.id, `${c.make} ${c.model_full || c.model}`]))
  }, [cars])

  const dailyRateMap = useMemo(() => {
    return Object.fromEntries(cars.map(c => [c.id, c.daily_rate ?? 0]))
  }, [cars])

  const events = useMemo(() => {
    const resEvents = reservations
      .filter((r) => r.status !== 'cancelled')
      .filter((r) => activeCarFilter === 'all' || String(r.car_id) === activeCarFilter)
      .map((r) => {
        const title = `${carMap[r.car_id ?? -1] || 'Car'} · ${r.customer_name}`
        const color = stringToColor(String(r.car_id || 0))
        return {
          id: String(r.id),
          title,
          start: `${r.pickup_date}T${r.pickup_time || '10:00'}`,
          end: `${r.return_date}T${r.return_time || '10:00'}`,
          backgroundColor: `${color}80`,
          borderColor: color,
          textColor: '#ffffff',
          extendedProps: { type: 'reservation', data: r },
        }
      })

    const blockEvents = (blockedDates || [])
      .filter((b) => activeCarFilter === 'all' || String(b.car_id) === activeCarFilter)
      .map((b) => ({
        id: `block_${b.id}`,
        title: `${carMap[b.car_id ?? -1] || 'Car'} · ${b.reason || 'Blocked'}`,
        start: b.start_date,
        end: new Date(new Date(b.end_date).getTime() + 86400000).toISOString().split('T')[0],
        backgroundColor: 'rgba(239, 68, 68, 0.4)',
        borderColor: 'rgb(239, 68, 68)',
        textColor: '#ffffff',
        extendedProps: { type: 'blocked', data: b },
      }))

    return [...resEvents, ...blockEvents]
  }, [reservations, cars, blockedDates, activeCarFilter, carMap])

  function handleEventClick(info: any) {
    const { type, data } = info.event.extendedProps
    if (type === 'reservation') {
      setDetailRes(data)
    } else if (type === 'blocked') {
      const blockId = data.id
      const carName = carMap[data.car_id] || 'this vehicle'
      if (confirm(`Remove block "${data.reason || 'Blocked'}" for ${carName}?`)) {
        startTransition(async () => {
          await deleteBlockedDate(blockId)
        })
      }
    }
  }

  return (
    <div className="text-white">
      {/* Toolbar */}
      <div className="mb-6 flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
        <div className="flex gap-3 flex-wrap items-center">
          <span className="text-sm text-white/50 uppercase tracking-widest font-bold hidden md:block">Filter:</span>
          <button onClick={() => setActiveCarFilter('all')}
            className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-all duration-300 ${activeCarFilter === 'all' ? 'bg-white text-black' : 'bg-white/5 hover:bg-white/10 text-white/70'}`}>
            All Fleet
          </button>
          {cars.map((car) => (
            <button key={car.id} onClick={() => setActiveCarFilter(String(car.id))}
              className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-all duration-300 ${activeCarFilter === String(car.id) ? 'bg-white text-black' : 'bg-white/5 hover:bg-white/10 text-white/70'}`}>
              {carMap[car.id]}
            </button>
          ))}
        </div>
        <button onClick={() => setBlockModalOpen(true)}
          className="bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 text-red-300 px-5 py-2 rounded-xl text-sm font-bold transition-all flex-shrink-0">
          + Block Dates
        </button>
      </div>

      <style jsx global>{`
        .fc { --fc-border-color: rgba(255, 255, 255, 0.1); --fc-button-bg-color: rgba(255, 255, 255, 0.05); --fc-button-border-color: rgba(255, 255, 255, 0.1); --fc-button-hover-bg-color: rgba(255, 255, 255, 0.1); --fc-button-hover-border-color: rgba(255, 255, 255, 0.2); --fc-button-active-bg-color: rgba(255, 255, 255, 0.2); --fc-button-active-border-color: rgba(255, 255, 255, 0.3); --fc-page-bg-color: transparent; font-family: inherit; }
        .fc .fc-toolbar-title { font-size: 1.25rem; font-weight: 700; color: white; }
        .fc .fc-col-header-cell-cushion, .fc .fc-daygrid-day-number { color: rgba(255, 255, 255, 0.7); font-weight: 500; }
        .fc-theme-standard .fc-scrollgrid { border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 0.75rem; overflow: hidden; }
        .fc .fc-button { border-radius: 0.5rem; font-weight: 600; text-transform: capitalize; transition: all 0.3s ease; padding: 0.5rem 1rem; }
        .fc-h-event { border-radius: 0.375rem; padding: 1px 4px; backdrop-filter: blur(8px); cursor: pointer; }
        .fc .fc-day-today { background-color: rgba(255, 255, 255, 0.03) !important; }
        .fc .fc-list-event:hover td { background: rgba(255,255,255,0.05) !important; cursor: pointer; }
      `}</style>

      <FullCalendar
        plugins={[dayGridPlugin, listPlugin, interactionPlugin]}
        initialView="dayGridMonth"
        headerToolbar={{ left: 'prev,next today', center: 'title', right: 'dayGridMonth,listMonth' }}
        events={events}
        height="auto"
        eventClick={handleEventClick}
        dayMaxEvents={3}
        fixedWeekCount={false}
      />

      <BlockDateModal
        isOpen={blockModalOpen}
        onClose={() => setBlockModalOpen(false)}
        cars={cars}
      />

      <ReservationDetailModal
        reservation={detailRes}
        cars={cars}
        dailyRateMap={dailyRateMap}
        onClose={() => setDetailRes(null)}
      />
    </div>
  )
}
