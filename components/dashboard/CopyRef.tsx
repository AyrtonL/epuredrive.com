'use client'

import { useState } from 'react'

const COPIED_RESET_MS = 1500

interface Props {
  value: string
}

/** Booking reference that copies itself on click; sits above the row's link. */
export default function CopyRef({ value }: Props) {
  const [copied, setCopied] = useState(false)

  async function copy() {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      setTimeout(() => setCopied(false), COPIED_RESET_MS)
    } catch {
      // Clipboard can be blocked (insecure context / permissions) — the ref
      // is still visible and selectable, so there's nothing else to do.
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      title={copied ? 'Copied' : 'Copy reference'}
      className="relative z-10 font-mono text-[12px] text-white/55 hover:text-white rounded px-1 -mx-1 hover:bg-white/[0.08] transition-colors"
    >
      {copied ? 'Copied ✓' : value}
    </button>
  )
}
