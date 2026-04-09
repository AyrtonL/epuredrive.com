import Link from 'next/link'

interface LogoProps {
  href?: string
  className?: string
}

/**
 * Shared logo component — update this single file when the designer delivers final assets.
 * Currently renders text; replace with <Image> or inline SVG when ready.
 */
export default function Logo({ href = '/', className = '' }: LogoProps) {
  const content = (
    <span className={`flex items-center gap-1 ${className}`}>
      <span className="text-lg font-bold tracking-[0.12em] text-white uppercase">
        éPure
      </span>
      <span className="text-lg font-light tracking-[0.12em] text-white/40 uppercase">
        Drive
      </span>
    </span>
  )

  if (!href) return content

  return <Link href={href}>{content}</Link>
}
