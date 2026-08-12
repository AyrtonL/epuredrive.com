'use client'

import { useState } from 'react'
import type { DamageMark } from '@/lib/supabase/types'

export type { DamageMark }

const MARK_TYPES: { value: DamageMark['type']; label: string; color: string }[] = [
  { value: 'scratch', label: 'Scratch', color: '#f59e0b' },
  { value: 'dent', label: 'Dent', color: '#ef4444' },
  { value: 'crack', label: 'Crack/Broken', color: '#a855f7' },
  { value: 'other', label: 'Other', color: '#3b82f6' },
]

function colorFor(type: DamageMark['type']): string {
  return MARK_TYPES.find((t) => t.value === type)?.color ?? '#3b82f6'
}

interface CarDamageDiagramProps {
  marks: DamageMark[]
  onChange?: (marks: DamageMark[]) => void
  theme?: 'dark' | 'light'
}

export default function CarDamageDiagram({ marks, onChange, theme = 'dark' }: CarDamageDiagramProps) {
  const editable = !!onChange
  const [pendingPoint, setPendingPoint] = useState<{ x: number; y: number } | null>(null)
  const [activeMarkId, setActiveMarkId] = useState<string | null>(null)

  const isLight = theme === 'light'
  const strokeColor = isLight ? '#9ca3af' : 'rgba(255,255,255,0.28)'
  const fillColor = isLight ? '#f3f4f6' : 'rgba(255,255,255,0.04)'
  const panelClass = isLight
    ? 'border border-gray-200 rounded-lg bg-white'
    : 'border border-white/[0.06] rounded-2xl bg-white/[0.02]'

  function handleDiagramClick(e: React.MouseEvent<SVGSVGElement>) {
    if (!editable) return
    const svg = e.currentTarget
    const rect = svg.getBoundingClientRect()
    const x = Math.round(((e.clientX - rect.left) / rect.width) * 1000) / 10
    const y = Math.round(((e.clientY - rect.top) / rect.height) * 1000) / 10
    setActiveMarkId(null)
    setPendingPoint({ x, y })
  }

  function addMark(type: DamageMark['type']) {
    if (!pendingPoint || !onChange) return
    const mark: DamageMark = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      x: pendingPoint.x,
      y: pendingPoint.y,
      type,
    }
    onChange([...marks, mark])
    setPendingPoint(null)
  }

  function removeMark(id: string) {
    if (!onChange) return
    onChange(marks.filter((m) => m.id !== id))
    setActiveMarkId(null)
  }

  function updateNote(id: string, note: string) {
    if (!onChange) return
    onChange(marks.map((m) => (m.id === id ? { ...m, note: note || undefined } : m)))
  }

  return (
    <div className="space-y-3">
      <div className={`${panelClass} p-4`}>
        <svg
          viewBox="0 0 200 400"
          onClick={handleDiagramClick}
          className={`w-full max-w-[220px] mx-auto block ${editable ? 'cursor-crosshair' : ''}`}
        >
          {/* top-down car silhouette */}
          <rect x="40" y="30" width="120" height="340" rx="28" fill={fillColor} stroke={strokeColor} strokeWidth="2" />
          <rect x="55" y="10" width="90" height="45" rx="14" fill={fillColor} stroke={strokeColor} strokeWidth="2" />
          <rect x="55" y="345" width="90" height="45" rx="14" fill={fillColor} stroke={strokeColor} strokeWidth="2" />
          <rect x="50" y="100" width="100" height="90" rx="8" fill="none" stroke={strokeColor} strokeWidth="1.5" />
          {/* wheels */}
          <rect x="24" y="85" width="16" height="45" rx="4" fill={strokeColor} />
          <rect x="160" y="85" width="16" height="45" rx="4" fill={strokeColor} />
          <rect x="24" y="270" width="16" height="45" rx="4" fill={strokeColor} />
          <rect x="160" y="270" width="16" height="45" rx="4" fill={strokeColor} />

          {marks.map((mark, i) => (
            <g key={mark.id}>
              <circle
                cx={(mark.x / 100) * 200}
                cy={(mark.y / 100) * 400}
                r="8"
                fill={colorFor(mark.type)}
                stroke="#fff"
                strokeWidth="1.5"
                className={editable ? 'cursor-pointer' : ''}
                onClick={(e) => {
                  if (!editable) return
                  e.stopPropagation()
                  setPendingPoint(null)
                  setActiveMarkId(activeMarkId === mark.id ? null : mark.id)
                }}
              />
              <text
                x={(mark.x / 100) * 200}
                y={(mark.y / 100) * 400 + 3.5}
                textAnchor="middle"
                fontSize="8"
                fontWeight="700"
                fill="#fff"
                pointerEvents="none"
              >
                {i + 1}
              </text>
            </g>
          ))}
        </svg>

        {editable && pendingPoint && (
          <div className={`mt-3 flex flex-wrap items-center gap-2 justify-center ${isLight ? '' : ''}`}>
            <span className={`text-xs ${isLight ? 'text-gray-500' : 'text-white/40'}`}>Mark as:</span>
            {MARK_TYPES.map((t) => (
              <button
                key={t.value}
                type="button"
                onClick={() => addMark(t.value)}
                className="text-xs font-semibold px-2.5 py-1 rounded-full text-white"
                style={{ background: t.color }}
              >
                {t.label}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setPendingPoint(null)}
              className={`text-xs px-2 py-1 ${isLight ? 'text-gray-400' : 'text-white/30'}`}
            >
              Cancel
            </button>
          </div>
        )}
      </div>

      {marks.length > 0 && (
        <div className="space-y-1.5">
          {marks.map((mark, i) => (
            <div
              key={mark.id}
              className={`flex items-center gap-2 text-xs rounded-lg px-2.5 py-1.5 ${
                isLight ? 'bg-gray-50 border border-gray-200' : 'bg-white/[0.03] border border-white/[0.06]'
              }`}
            >
              <span
                className="w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold text-white shrink-0"
                style={{ background: colorFor(mark.type) }}
              >
                {i + 1}
              </span>
              <span className={`font-medium shrink-0 ${isLight ? 'text-gray-700' : 'text-white/70'}`}>
                {MARK_TYPES.find((t) => t.value === mark.type)?.label}
              </span>
              {editable ? (
                <input
                  type="text"
                  placeholder="Add a note…"
                  value={mark.note ?? ''}
                  onChange={(e) => updateNote(mark.id, e.target.value)}
                  className={`flex-1 bg-transparent outline-none ${isLight ? 'text-gray-600 placeholder:text-gray-300' : 'text-white/50 placeholder:text-white/20'}`}
                />
              ) : (
                mark.note && <span className={isLight ? 'text-gray-500' : 'text-white/40'}>— {mark.note}</span>
              )}
              {editable && (
                <button
                  type="button"
                  onClick={() => removeMark(mark.id)}
                  className={`shrink-0 ${isLight ? 'text-gray-300 hover:text-red-500' : 'text-white/20 hover:text-red-400'}`}
                >
                  ✕
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {editable && marks.length === 0 && !pendingPoint && (
        <p className={`text-xs text-center ${isLight ? 'text-gray-400' : 'text-white/30'}`}>
          Click on the diagram to mark scratches or dents
        </p>
      )}

      {activeMarkId && editable && (
        <div className="flex justify-center">
          <button
            type="button"
            onClick={() => removeMark(activeMarkId)}
            className="text-xs font-semibold text-red-400 px-2.5 py-1"
          >
            Remove marker #{marks.findIndex((m) => m.id === activeMarkId) + 1}
          </button>
        </div>
      )}
    </div>
  )
}
