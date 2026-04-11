'use server'

import { createClient } from '@/lib/supabase/server'
import { requireTenantId } from '@/lib/supabase/dashboard-auth'

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const MAX_IMAGES = 10
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']

export async function uploadCarImage(
  formData: FormData
): Promise<{ url: string | null; error: string | null }> {
  const supabase = createClient()
  const { tenantId } = await requireTenantId()

  const file = formData.get('file') as File | null
  if (!file) return { url: null, error: 'No file provided.' }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return { url: null, error: 'Only JPEG, PNG, and WebP images are allowed.' }
  }

  if (file.size > MAX_FILE_SIZE) {
    return { url: null, error: 'File must be under 10MB.' }
  }

  const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
  const fileName = `${tenantId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`

  const { error } = await supabase.storage
    .from('car-images')
    .upload(fileName, file, {
      contentType: file.type,
      upsert: false,
    })

  if (error) {
    return { url: null, error: error.message }
  }

  const { data: { publicUrl } } = supabase.storage
    .from('car-images')
    .getPublicUrl(fileName)

  return { url: publicUrl, error: null }
}

export async function deleteCarImage(
  url: string
): Promise<{ error: string | null }> {
  const supabase = createClient()
  await requireTenantId()

  // Extract path from the public URL
  const match = url.match(/car-images\/(.+)$/)
  if (!match) return { error: 'Invalid image URL.' }

  const { error } = await supabase.storage
    .from('car-images')
    .remove([match[1]])

  return { error: error?.message ?? null }
}

export { MAX_IMAGES }
