'use client'

import { useState, useRef, useMemo, useEffect } from 'react'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const BUCKET = 'license-photos'
const SIGNED_URL_TTL = 60 * 60 // 1 hour — enough to preview while the modal is open

interface Props {
  label: string
  path: string | null
  onChange: (path: string | null) => void
}

// License photos live in a private bucket (unlike car-images), since they're
// PII — so previews need a signed URL rather than a public one.
export default function LicensePhotoUploader({ label, path, onChange }: Props) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const supabase = useMemo(() => createClient(), [])

  useEffect(() => {
    let cancelled = false
    if (!path) {
      setPreviewUrl(null)
      return
    }
    supabase.storage
      .from(BUCKET)
      .createSignedUrl(path, SIGNED_URL_TTL)
      .then(({ data }) => {
        if (!cancelled) setPreviewUrl(data?.signedUrl ?? null)
      })
    return () => {
      cancelled = true
    }
  }, [path, supabase])

  async function handleFile(file: File | undefined) {
    if (!file) return
    setError(null)

    if (!ALLOWED_TYPES.includes(file.type)) {
      setError('Only JPEG, PNG, and WebP images are allowed.')
      return
    }
    if (file.size > MAX_FILE_SIZE) {
      setError('File must be under 10MB.')
      return
    }

    setUploading(true)
    const previousPath = path
    try {
      const { data: tenantId, error: tenantErr } = await supabase.rpc('current_tenant_id')
      if (tenantErr || !tenantId) {
        setError('Your session expired. Please refresh and sign in again.')
        return
      }

      const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
      const newPath = `${tenantId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`

      const { error: upErr } = await supabase.storage
        .from(BUCKET)
        .upload(newPath, file, { contentType: file.type, upsert: false })
      if (upErr) {
        setError(upErr.message)
        return
      }

      if (previousPath) await supabase.storage.from(BUCKET).remove([previousPath])
      onChange(newPath)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed. Please try again.')
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  async function handleRemove() {
    if (path) await supabase.storage.from(BUCKET).remove([path])
    onChange(null)
  }

  return (
    <div className="space-y-1">
      <label className="text-[11px] font-bold text-white/50 uppercase tracking-widest">{label}</label>
      {previewUrl ? (
        <div className="relative w-28 aspect-[4/3] rounded-xl overflow-hidden border border-white/10 group">
          <Image src={previewUrl} alt={label} fill unoptimized className="object-cover pointer-events-none" />
          <button
            type="button"
            onClick={handleRemove}
            className="absolute top-1 right-1 w-5 h-5 bg-black/70 hover:bg-red-500 text-white rounded-full flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
          >
            ×
          </button>
        </div>
      ) : (
        <div
          onClick={() => !uploading && inputRef.current?.click()}
          className="border-2 border-dashed border-white/10 hover:border-white/20 rounded-xl p-4 w-28 aspect-[4/3] flex items-center justify-center text-center cursor-pointer transition-colors"
        >
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(e) => handleFile(e.target.files?.[0])}
          />
          <p className="text-white/40 text-[11px]">{uploading ? 'Uploading…' : 'Upload photo'}</p>
        </div>
      )}
      {error && <p className="text-red-400 text-xs">{error}</p>}
    </div>
  )
}
