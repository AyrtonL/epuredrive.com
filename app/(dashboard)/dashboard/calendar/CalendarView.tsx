'use client'

import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import listPlugin from '@fullcalendar/list'
import interactionPlugin from '@fullcalendar/interaction'

interface CalendarViewProps {
  events: Array<Record<string, unknown>>
  onEventClick: (info: { event: { extendedProps: { type: string; data: unknown } } }) => void
}

export default function CalendarView({ events, onEventClick }: CalendarViewProps) {
  return (
    <>
      <style jsx global>{`
        /* ── Base ── */
        .fc {
          --fc-border-color: rgba(255,255,255,0.07);
          --fc-page-bg-color: transparent;
          --fc-neutral-bg-color: transparent;
          font-family: inherit;
        }

        /* ── Toolbar ── */
        .fc .fc-toolbar.fc-header-toolbar {
          margin-bottom: 1.5rem;
          gap: 0.5rem;
          flex-wrap: wrap;
        }
        .fc .fc-toolbar-title {
          font-size: 1.05rem;
          font-weight: 700;
          color: white;
          letter-spacing: -0.02em;
        }
        .fc .fc-toolbar-chunk {
          display: flex;
          align-items: center;
          gap: 0.375rem;
        }

        /* ── Nav buttons ── */
        .fc .fc-button {
          background: rgba(255,255,255,0.07) !important;
          border: 1px solid rgba(255,255,255,0.13) !important;
          color: rgba(255,255,255,0.70) !important;
          border-radius: 0.6rem !important;
          font-weight: 600 !important;
          font-size: 0.7rem !important;
          text-transform: uppercase !important;
          letter-spacing: 0.07em !important;
          padding: 0.45rem 0.9rem !important;
          transition: all 0.2s ease !important;
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.07) !important;
        }
        .fc .fc-button:hover {
          background: rgba(255,255,255,0.12) !important;
          border-color: rgba(255,255,255,0.22) !important;
          color: white !important;
        }
        .fc .fc-button:focus {
          box-shadow: 0 0 0 2px rgba(255,255,255,0.2) !important;
        }
        .fc .fc-button-primary:not(:disabled).fc-button-active,
        .fc .fc-button-primary:not(:disabled):active {
          background: rgba(255,255,255,0.18) !important;
          border-color: rgba(255,255,255,0.30) !important;
          color: white !important;
        }
        .fc .fc-button-group .fc-button {
          border-radius: 0 !important;
        }
        .fc .fc-button-group .fc-button:first-child {
          border-radius: 0.6rem 0 0 0.6rem !important;
        }
        .fc .fc-button-group .fc-button:last-child {
          border-radius: 0 0.6rem 0.6rem 0 !important;
        }

        /* ── Grid container ── */
        .fc-theme-standard .fc-scrollgrid {
          border: 1px solid rgba(255,255,255,0.09) !important;
          border-radius: 0.875rem !important;
          overflow: hidden !important;
        }
        .fc-theme-standard td,
        .fc-theme-standard th {
          border-color: rgba(255,255,255,0.06) !important;
        }

        /* ── Day header row (Mon Tue …) ── */
        .fc .fc-col-header-cell {
          background: rgba(255,255,255,0.04) !important;
          padding: 0.65rem 0 !important;
          border-bottom: 1px solid rgba(255,255,255,0.08) !important;
        }
        .fc .fc-col-header-cell-cushion {
          color: rgba(255,255,255,0.45) !important;
          font-size: 0.65rem !important;
          font-weight: 800 !important;
          text-transform: uppercase !important;
          letter-spacing: 0.14em !important;
          text-decoration: none !important;
          padding: 0 !important;
        }

        /* ── Day cells ── */
        .fc .fc-daygrid-day {
          background: transparent !important;
        }
        .fc .fc-daygrid-day:hover {
          background: rgba(255,255,255,0.02) !important;
        }
        .fc .fc-daygrid-day-number {
          color: rgba(255,255,255,0.50) !important;
          font-size: 0.72rem !important;
          font-weight: 500 !important;
          padding: 0.45rem 0.55rem !important;
          text-decoration: none !important;
        }
        .fc .fc-day-other .fc-daygrid-day-number {
          color: rgba(255,255,255,0.18) !important;
        }

        /* ── Today ── */
        .fc .fc-day-today {
          background: rgba(255,255,255,0.04) !important;
        }
        .fc .fc-day-today .fc-daygrid-day-number {
          color: white !important;
          background: rgba(255,255,255,0.18) !important;
          border-radius: 50% !important;
          width: 1.65rem !important;
          height: 1.65rem !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          margin: 0.3rem !important;
          font-weight: 700 !important;
          padding: 0 !important;
          box-shadow: 0 0 10px rgba(255,255,255,0.12) !important;
        }

        /* ── Events ── */
        .fc-h-event {
          border-left-width: 3px !important;
          border-top: none !important;
          border-right: none !important;
          border-bottom: none !important;
          border-radius: 0.3rem !important;
          padding: 2px 6px !important;
          font-size: 0.7rem !important;
          font-weight: 600 !important;
          cursor: pointer !important;
          transition: opacity 0.15s ease !important;
        }
        .fc-h-event:hover {
          opacity: 0.85 !important;
        }
        .fc-h-event .fc-event-title {
          font-weight: 600 !important;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .fc .fc-daygrid-more-link {
          color: rgba(255,255,255,0.45) !important;
          font-size: 0.65rem !important;
          font-weight: 700 !important;
          text-transform: uppercase !important;
          letter-spacing: 0.05em !important;
          padding: 1px 4px !important;
          border-radius: 0.25rem !important;
          transition: all 0.15s ease !important;
        }
        .fc .fc-daygrid-more-link:hover {
          color: white !important;
          background: rgba(255,255,255,0.08) !important;
        }

        /* ── List view ── */
        .fc .fc-list {
          border: none !important;
          background: transparent !important;
        }
        .fc .fc-list-day th {
          border-color: rgba(255,255,255,0.06) !important;
        }
        .fc .fc-list-day-cushion {
          background: rgba(255,255,255,0.04) !important;
          padding: 0.55rem 1rem !important;
        }
        .fc .fc-list-day-text,
        .fc .fc-list-day-side-text {
          color: rgba(255,255,255,0.55) !important;
          font-size: 0.68rem !important;
          font-weight: 800 !important;
          text-transform: uppercase !important;
          letter-spacing: 0.12em !important;
          text-decoration: none !important;
        }
        .fc .fc-list-event td {
          border-color: rgba(255,255,255,0.05) !important;
          background: transparent !important;
        }
        .fc .fc-list-event:hover td {
          background: rgba(255,255,255,0.04) !important;
          cursor: pointer !important;
        }
        .fc .fc-list-event-title a {
          color: rgba(255,255,255,0.80) !important;
          font-weight: 500 !important;
          text-decoration: none !important;
        }
        .fc .fc-list-event-time {
          color: rgba(255,255,255,0.38) !important;
          font-size: 0.72rem !important;
        }
        .fc-list-table td,
        .fc-list-table th {
          border-color: rgba(255,255,255,0.05) !important;
        }
        .fc .fc-list-empty {
          background: transparent !important;
          color: rgba(255,255,255,0.30) !important;
          font-size: 0.875rem !important;
        }
        .fc .fc-list-empty-cushion {
          margin: 3rem 0 !important;
        }

        /* ── Popover ("+N more") ── */
        .fc .fc-popover {
          background: #2B2B2B !important;
          border: 1px solid rgba(255,255,255,0.13) !important;
          border-radius: 0.75rem !important;
          box-shadow: 0 12px 40px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.07) !important;
          overflow: hidden !important;
        }
        .fc .fc-popover-header {
          background: rgba(255,255,255,0.05) !important;
          color: rgba(255,255,255,0.80) !important;
          font-weight: 700 !important;
          font-size: 0.75rem !important;
          padding: 0.5rem 0.75rem !important;
          border-bottom: 1px solid rgba(255,255,255,0.08) !important;
        }
        .fc .fc-popover-close {
          color: rgba(255,255,255,0.35) !important;
          opacity: 1 !important;
        }
        .fc .fc-popover-close:hover {
          color: white !important;
        }
        .fc .fc-popover-body {
          padding: 0.5rem !important;
        }
      `}</style>

      <FullCalendar
        plugins={[dayGridPlugin, listPlugin, interactionPlugin]}
        initialView="dayGridMonth"
        headerToolbar={{ left: 'prev,next today', center: 'title', right: 'dayGridMonth,listMonth' }}
        events={events as never}
        height="auto"
        eventClick={onEventClick as never}
        dayMaxEvents={3}
        fixedWeekCount={false}
      />
    </>
  )
}
