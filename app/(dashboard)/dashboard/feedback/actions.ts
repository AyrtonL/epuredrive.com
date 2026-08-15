'use server'

import { revalidatePath } from 'next/cache'
import { requireTenantId } from '@/lib/supabase/dashboard-auth'
import { createClient } from '@/lib/supabase/server'
import { isValidRating } from '@/lib/feedback/validate-rating'

export async function submitTenantFeedback(params: {
  rating: number
  comment: string
}): Promise<{ error: string | null }> {
  if (!isValidRating(params.rating)) {
    return { error: 'Invalid rating.' }
  }

  const { tenantId } = await requireTenantId()
  const supabase = createClient()

  const trimmedComment = params.comment.trim().slice(0, 2000)
  const { error } = await supabase.from('tenant_feedback').insert({
    tenant_id: tenantId,
    rating: params.rating,
    comment: trimmedComment.length > 0 ? trimmedComment : null,
  })

  if (error) return { error: 'Could not save feedback. Please try again.' }

  revalidatePath('/dashboard/feedback')
  return { error: null }
}
