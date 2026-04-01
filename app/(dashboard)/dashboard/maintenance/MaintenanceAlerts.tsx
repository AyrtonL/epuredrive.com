'use client'

import React from 'react'
import type { CarService, Car } from '@/lib/supabase/types'

interface Props {
  services: CarService[]
  cars: Car[]
}

export default function MaintenanceAlerts({ services, cars }: Props) {
  const alerts: React.ReactNode[] = []

  const today = new Date()
  const fourteenDaysFromNow = new Date()
  fourteenDaysFromNow.setDate(today.getDate() + 14)

  // 1. Date-based alerts (check all services for pending next dates)
  services.forEach(s => {
    if (!s.next_service_date) return
    const nextDate = new Date(s.next_service_date)
    const car = cars.find(c => c.id === s.car_id)
    if (!car) return

    if (nextDate <= fourteenDaysFromNow) {
      const isOverdue = nextDate < today
      alerts.push(
        <div 
          key={`date-${s.id}`}
          className={`flex items-center gap-4 p-4 rounded-2xl border ${
            isOverdue 
              ? 'bg-red-500/10 border-red-500/30 text-red-200' 
              : 'bg-amber-500/10 border-amber-500/30 text-amber-200'
          }`}
        >
          <span className="text-xl">{isOverdue ? '⚠️' : '📅'}</span>
          <div className="flex-1">
            <div className="text-xs font-bold uppercase tracking-widest opacity-60 mb-0.5">
              {isOverdue ? 'Overdue Service' : 'Upcoming Service'}
            </div>
            <div className="text-sm font-medium">
              <span className="font-bold text-white">{car.make} {car.model_full || car.model}</span>
              {' — '}
              {s.service_type?.replace('_', ' ') || 'Maintenance'} due on <span className="font-bold">{s.next_service_date}</span>
            </div>
          </div>
        </div>
      )
    }
  })

  // 2. Mileage-based alerts (check each car's current mileage vs its latest service row with next_service_mileage)
  cars.forEach(car => {
    if (car.mileage == null) return
    
    // Find the latest service record for this car that has a next_service_mileage
    const latestWithMileage = services
      .filter(s => s.car_id === car.id && s.next_service_mileage)
      .sort((a, b) => (new Date(b.service_date || 0).getTime()) - (new Date(a.service_date || 0).getTime()))[0]

    if (!latestWithMileage || !latestWithMileage.next_service_mileage) return

    const remaining = latestWithMileage.next_service_mileage - car.mileage
    if (remaining <= 1000) {
      const isOverdue = remaining <= 0
      alerts.push(
        <div 
          key={`mileage-${car.id}`}
          className={`flex items-center gap-4 p-4 rounded-2xl border ${
            isOverdue 
              ? 'bg-red-500/10 border-red-500/30 text-red-200' 
              : 'bg-amber-500/10 border-amber-500/30 text-amber-200'
          }`}
        >
          <span className="text-xl">🔧</span>
          <div className="flex-1">
            <div className="text-xs font-bold uppercase tracking-widest opacity-60 mb-0.5">
              {isOverdue ? 'Mileage Overdue' : 'Mileage Warning'}
            </div>
            <div className="text-sm font-medium">
              <span className="font-bold text-white">{car.make} {car.model_full || car.model}</span>
              {' — '}
              {isOverdue 
                ? `Overdue by ${Math.abs(remaining).toLocaleString()} mi` 
                : `Due in ${remaining.toLocaleString()} mi`
              } (at {latestWithMileage.next_service_mileage.toLocaleString()} mi)
            </div>
          </div>
        </div>
      )
    }
  })

  if (alerts.length === 0) return null

  return (
    <div className="space-y-3 mb-8 animate-fade-in">
      <h3 className="text-[10px] font-bold text-white/40 uppercase tracking-[0.2em] px-1">Maintenance Alerts</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {alerts}
      </div>
    </div>
  )
}
