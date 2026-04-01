'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { parseIcal } from '@/lib/ical-parser'

async function getTenantId(): Promise<string> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: p } = await supabase.from('profiles').select('tenant_id').eq('id', user!.id).single()
  return p!.tenant_id
}

export async function createFeed(data: {
  car_id: number
  ical_url: string
  source_name: string
}): Promise<{ error: string | null }> {
  const supabase = createClient()
  const tenantId = await getTenantId()
  const { error } = await supabase.from('turo_feeds').insert({ ...data, tenant_id: tenantId })
  revalidatePath('/dashboard/integrations/turo')
  return { error: error?.message ?? null }
}

export async function deleteFeed(id: number): Promise<{ error: string | null }> {
  const supabase = createClient()
  const { error } = await supabase.from('turo_feeds').delete().eq('id', id)
  revalidatePath('/dashboard/integrations/turo')
  return { error: error?.message ?? null }
}

export async function syncAllFeeds(): Promise<{ imported: number; errors: number; message: string }> {
  const supabase = createClient()
  const tenantId = await getTenantId()

  const { data: feeds } = await supabase.from('turo_feeds').select('*').eq('tenant_id', tenantId)
  if (!feeds?.length) return { imported: 0, errors: 0, message: 'No feeds to sync.' }

  let totalImported = 0
  let errors = 0

  for (const feed of feeds) {
    try {
      const proxyUrl = `/api/fetch-ical?url=${encodeURIComponent(feed.ical_url)}`
      const res = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}${proxyUrl}`)
      if (!res.ok) throw new Error(`Fetch failed (${res.status})`)
      const icsText = await res.text()

      const events = parseIcal(icsText, feed.car_id, feed.source_name || 'Calendar')

      // Remove old entries from this feed source + car
      await supabase.from('reservations').delete()
        .eq('car_id', feed.car_id)
        .eq('source', 'ical')
        .ilike('notes', `%[${feed.source_name}]%`)

      if (events.length) {
        await supabase.from('reservations').insert(events.map(e => ({ ...e, tenant_id: tenantId })))
      }

      await supabase.from('turo_feeds').update({ last_synced: new Date().toISOString() }).eq('id', feed.id)
      totalImported += events.length
    } catch (err) {
      console.error('Sync error for feed', feed.id, err)
      errors++
    }
  }

  revalidatePath('/dashboard/calendar')
  revalidatePath('/dashboard/integrations/turo')
  return {
    imported: totalImported,
    errors,
    message: `✓ ${totalImported} event(s) imported${errors ? ` — ${errors} feed(s) failed` : ''}`
  }
}
