'use client'

import { useState } from 'react'

const TABS = [
  { id: 'brand', label: 'Brand' },
  { id: 'content', label: 'Site Content' },
  { id: 'locations', label: 'Locations' },
] as const

export type SettingsTab = (typeof TABS)[number]['id']

interface Props {
  activeTab: SettingsTab
  onChange: (tab: SettingsTab) => void
}

export default function SettingsTabs({ activeTab, onChange }: Props) {
  return (
    <div className="flex gap-1 p-1 bg-white/[0.03] border border-white/[0.06] rounded-2xl w-fit">
      {TABS.map(tab => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onChange(tab.id)}
          className={`px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${
            activeTab === tab.id
              ? 'bg-white/10 text-white border border-white/10'
              : 'text-white/35 hover:text-white/60 border border-transparent'
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  )
}
