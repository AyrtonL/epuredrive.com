'use client'

// components/telematics/useInterval.ts
// Tiny declarative setInterval hook used for 15s dashboard polling.
// Pass delayMs = null to pause the timer.
import { useEffect, useRef } from 'react'

export function useInterval(callback: () => void, delayMs: number | null): void {
  const savedCallback = useRef(callback)

  useEffect(() => {
    savedCallback.current = callback
  }, [callback])

  useEffect(() => {
    if (delayMs === null) return undefined
    const id = setInterval(() => savedCallback.current(), delayMs)
    return () => clearInterval(id)
  }, [delayMs])
}
