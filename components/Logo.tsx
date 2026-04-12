import Link from 'next/link'
import Image from 'next/image'

interface LogoProps {
  href?: string
  className?: string
  height?: number
}

export default function Logo({ href = '/', className = '', height = 28 }: LogoProps) {
  const content = (
    <span className={`flex items-center ${className}`}>
      <Image
        src="/logo-white.svg"
        alt="éPure Drive"
        width={Math.round(height * (790 / 173))}
        height={height}
        priority
      />
    </span>
  )

  if (!href) return content

  return <Link href={href}>{content}</Link>
}
