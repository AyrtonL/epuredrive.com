// lib/telematics/registry.ts
// Lazy singleton lookup for telematics providers. Only 'bouncie' exists today;
// adding Smartcar/Samsara later means adding an implementation + a branch here.

import type { TelematicsProvider } from './provider'
import { BouncieProvider } from './bouncie'

let bouncieSingleton: BouncieProvider | null = null

export function getProvider(name: 'bouncie'): TelematicsProvider {
  if (name !== 'bouncie') throw new Error(`Unknown telematics provider: ${name}`)
  if (!bouncieSingleton) bouncieSingleton = new BouncieProvider()
  return bouncieSingleton
}
