'use server'

// app/(dashboard)/dashboard/telematics/alerts/actions.ts
// Server actions for the Alerts page:
//   - ackEventAction     : acknowledge one event
//   - ackManyAction      : bulk acknowledge up to 500 events
//
// Security:
//   - requireTenantId for the signed-in session
//   - isFeatureEnabled defense-in-depth
//   - Zod-validated inputs (single uuid / uuid array)
//   - Writes via the admin client with explicit tenant_id filter
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { requireTenantId } from '@/lib/supabase/dashboard-auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { isFeatureEnabled } from '@/lib/supabase/feature-flags'

const BOUNCIE_FLAG = 'bouncie_telematics'
const ALERTS_PATH = '/dashboard/telematics/alerts'

export interface AckResult {
  ok: boolean
  error: string | null
  updatedCount?: number
}

async function resolveUserAndTenant(): Promise<
  | { ok: true; userId: string; tenantId: string }
  | { ok: false; error: string }
> {
  const { tenantId } = await requireTenantId()

  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'unauthorized' }

  const enabled = await isFeatureEnabled(tenantId, BOUNCIE_FLAG)
  if (!enabled) {
    return {
      ok: false,
      error: 'Bouncie telematics is not enabled for this workspace.',
    }
  }

  return { ok: true, userId: user.id, tenantId }
}

export async function ackEventAction(id: unknown): Promise<AckResult> {
  const parsed = z.string().uuid().safeParse(id)
  if (!parsed.success) return { ok: false, error: 'Invalid event id.' }

  const ctx = await resolveUserAndTenant()
  if (!ctx.ok) return { ok: false, error: ctx.error }

  const admin = createAdminClient()
  const { error } = await admin
    .from('telematics_events')
    .update({
      acknowledged_at: new Date().toISOString(),
      acknowledged_by: ctx.userId,
    })
    .eq('id', parsed.data)
    .eq('tenant_id', ctx.tenantId)
    .is('acknowledged_at', null)

  if (error) return { ok: false, error: 'Could not acknowledge event.' }
  revalidatePath(ALERTS_PATH)
  return { ok: true, error: null, updatedCount: 1 }
}

export async function ackManyAction(ids: unknown): Promise<AckResult> {
  const parsed = z.array(z.string().uuid()).min(1).max(500).safeParse(ids)
  if (!parsed.success) return { ok: false, error: 'Invalid event ids.' }

  const ctx = await resolveUserAndTenant()
  if (!ctx.ok) return { ok: false, error: ctx.error }

  const admin = createAdminClient()
  const { error, count } = await admin
    .from('telematics_events')
    .update(
      {
        acknowledged_at: new Date().toISOString(),
        acknowledged_by: ctx.userId,
      },
      { count: 'exact' },
    )
    .in('id', parsed.data)
    .eq('tenant_id', ctx.tenantId)
    .is('acknowledged_at', null)

  if (error) return { ok: false, error: 'Could not acknowledge events.' }
  revalidatePath(ALERTS_PATH)
  return { ok: true, error: null, updatedCount: count ?? 0 }
}
