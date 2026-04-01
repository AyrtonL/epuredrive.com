import { createClient } from '@/lib/supabase/server'
import PageHeader from '@/components/dashboard/PageHeader'
import FeedManager from './FeedManager'
import type { Car } from '@/lib/supabase/types'

export default async function TuroSyncPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase.from('profiles').select('tenant_id').eq('id', user!.id).single()
  const tenantId = profile!.tenant_id

  const [{ data: feeds }, { data: cars }] = await Promise.all([
    supabase.from('turo_feeds').select('*').eq('tenant_id', tenantId).order('created_at'),
    supabase.from('cars').select('id, make, model, model_full').eq('tenant_id', tenantId),
  ])

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <PageHeader title="Calendar Sync" description="Sync external iCal calendars (Turo, Airbnb, etc.) and import CSV earnings." />
      <FeedManager feeds={feeds ?? []} cars={(cars as Car[]) ?? []} />
    </div>
  )
}
