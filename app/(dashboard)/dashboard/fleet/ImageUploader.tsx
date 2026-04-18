'use client'

import { useState, useRef } from 'react'
import Image from 'next/image'
import { uploadCarImage, deleteCarImage } from './upload-actions'

const MAX_IMAGES = 10

interface Props {
  images: string[]
  onChange: (images: string[]) => void
}

export default function ImageUploader({ images, onChange }: Props) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return
    setError(null)

    const remaining = MAX_IMAGES - images.length
    if (remaining <= 0) {
      setError(`Maximum ${MAX_IMAGES} images allowed.`)
      return
    }

    const filesToUpload = Array.from(files).slice(0, remaining)
    setUploading(true)

    const newUrls: string[] = []
    for (const file of filesToUpload) {
      const fd = new FormData()
      fd.append('file', file)
      const result = await uploadCarImage(fd)
      if (result.error) {
        setError(result.error)
        break
      }
      if (result.url) newUrls.push(result.url)
    }

    if (newUrls.length > 0) {
      onChange([...images, ...newUrls])
    }
    setUploading(false)
    if (inputRef.current) inputRef.current.value = ''
  }

  async function handleRemove(url: string) {
    await deleteCarImage(url)
    onChange(images.filter(u => u !== url))
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    handleFiles(e.dataTransfer.files)
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-[11px] font-bold text-white/50 uppercase tracking-widest">
          Photos ({images.length}/{MAX_IMAGES})
        </label>
        {images.length > 0 && (
          <span className="text-[10px] text-white/30">Drag to reorder • Click × to remove</span>
        )}
      </div>

      {/* Gallery Grid */}
      {images.length > 0 && (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
          {images.map((url, idx) => {
            const src = url.startsWith('http') || url.startsWith('/') ? url : `/${url}`
            return (
            <div key={url} className="relative group aspect-[4/3] rounded-xl overflow-hidden border border-white/10">
              <Image src={src} alt={`Car photo ${idx + 1}`} fill className="object-cover" />
              {idx === 0 && (
                <div className="absolute top-1.5 left-1.5 bg-black/70 text-[9px] font-bold text-white px-1.5 py-0.5 rounded uppercase tracking-wider">
                  Cover
                </div>
              )}
              <button
                type="button"
                onClick={() => handleRemove(url)}
                className="absolute top-1.5 right-1.5 w-5 h-5 bg-black/70 hover:bg-red-500 text-white rounded-full flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
              >
                ×
              </button>
            </div>
            )
          })}
        </div>
      )}

      {/* Upload Zone */}
      {images.length < MAX_IMAGES && (
        <div
          onDrop={handleDrop}
          onDragOver={e => e.preventDefault()}
          onClick={() => inputRef.current?.click()}
          className="border-2 border-dashed border-white/10 hover:border-white/20 rounded-xl p-6 text-center cursor-pointer transition-colors"
        >
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            className="hidden"
            onChange={e => handleFiles(e.target.files)}
          />
          {uploading ? (
            <div className="text-white/50 text-sm">Uploading...</div>
          ) : (
            <>
              <svg className="w-8 h-8 text-white/20 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 16v-8m0 0l-3 3m3-3l3 3M3 16v2a2 2 0 002 2h14a2 2 0 002-2v-2" />
              </svg>
              <p className="text-white/40 text-sm">Drop images here or click to upload</p>
              <p className="text-white/20 text-[10px] mt-1">JPEG, PNG, WebP • Max 10MB each • Up to {MAX_IMAGES} images</p>
            </>
          )}
        </div>
      )}

      {error && (
        <p className="text-red-400 text-xs">{error}</p>
      )}
    </div>
  )
}
