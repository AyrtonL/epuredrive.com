/**
 * GET /api/cron/sync-ical
 * Scheduled every 30 min via Netlify (thin wrapper calls this route).
 * Fetches all turo_feeds across all tenants, parses iCal, and upserts reservations.
 *
 * Protected by Authorization: Bearer {CRON_SECRET}
 */

import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { parseIcal } from '@/lib/ical-parser'

function verifyCronSecret(request: Request): boolean {
  const auth = request.headers.get('authorization')
  const secret = process.env.CRON_SECRET
  if (!secret) return false
  return auth === `Bearer ${secret}`
}

export async function GET(request: Request) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()

  const { data: feeds, error } = await supabase
    .from('turo_feeds')
    .select('id, tenant_id, car_id, ical_url, source_name')

  if (error) {
    console.error('[sync-ical] Failed to load feeds:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (!feeds?.length) {
    console.log('[sync-ical] No feeds configured')
    return NextResponse.json({ totalImported: 0, errors: 0 })
  }

  let totalImported = 0
  let errors = 0

  for (const feed of feeds) {
    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 8000)
      let icsText: string
      try {
        const icalRes = await fetch(feed.ical_url, {
          headers: { 'User-Agent': 'epuredrive-ical-sync/1.0' },
          redirect: 'follow',
          signal: controller.signal,
        })
        if (!icalRes.ok) throw new Error(`iCal fetch returned ${icalRes.status}`)
        icsText = await icalRes.text()
      } finally {
        clearTimeout(timeout)
      }

      const sourceName: string = feed.source_name || 'Calendar'
      const events = parseIcal(icsText, feed.car_id, sourceName)

      // Delete old reservations for this feed before re-inserting
      const isTuro = /turo/i.test(sourceName)
      if (isTuro) {
        await supabase
          .from('reservations')
          .delete()
          .eq('car_id', feed.car_id)
          .eq('tenant_id', feed.tenant_id)
          .eq('source', 'turo')
      } else {
        const safeName = sourceName.replace(/[[\]*&?%]/g, '')
        await supabase
          .from('reservations')
          .delete()
          .eq('car_id', feed.car_id)
          .eq('tenant_id', feed.tenant_id)
          .eq('source', 'ical')
          .ilike('notes', `%[${safeName}]%`)
      }

      if (events.length) {
        await supabase
          .from('reservations')
          .insert(events.map(e => ({ ...e, tenant_id: feed.tenant_id })))
        totalImported += events.length
      }

      await supabase
        .from('turo_feeds')
        .update({ last_synced: new Date().toISOString() })
        .eq('id', feed.id)

      console.log(`[sync-ical] Feed ${feed.id} (${sourceName}): imported ${events.length} events`)
    } catch (err: unknown) {
      console.error(`[sync-ical] Feed ${feed.id} failed:`, err instanceof Error ? err.message : err)
      errors++
    }
  }

  console.log(`[sync-ical] Finished: ${totalImported} imported, ${errors} error(s)`)
  return NextResponse.json({ totalImported, errors })
}
