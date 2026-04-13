import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const alt = 'éPure Drive — Premium Fleet Software for Car Rental Businesses'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function OGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          background: 'black',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'sans-serif',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Subtle gradient */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'radial-gradient(ellipse at 50% 30%, rgba(255,255,255,0.06) 0%, transparent 70%)',
          }}
        />

        {/* Top line accent */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: '20%',
            right: '20%',
            height: 2,
            background: 'linear-gradient(to right, transparent, rgba(255,255,255,0.3), transparent)',
          }}
        />

        {/* Brand mark */}
        <div
          style={{
            fontSize: 120,
            fontWeight: 900,
            fontStyle: 'italic',
            color: 'white',
            letterSpacing: '-4px',
            display: 'flex',
            marginBottom: 16,
          }}
        >
          éPure
        </div>

        <div
          style={{
            fontSize: 16,
            fontWeight: 800,
            color: 'rgba(255,255,255,0.3)',
            letterSpacing: '12px',
            textTransform: 'uppercase',
            marginBottom: 48,
          }}
        >
          DRIVE
        </div>

        <div
          style={{
            fontSize: 24,
            color: 'rgba(255,255,255,0.5)',
            fontWeight: 500,
            maxWidth: 600,
            textAlign: 'center',
            lineHeight: 1.4,
          }}
        >
          Premium Fleet Software for Car Rental Businesses
        </div>

        {/* Bottom bar */}
        <div
          style={{
            position: 'absolute',
            bottom: 40,
            fontSize: 13,
            color: 'rgba(255,255,255,0.2)',
            letterSpacing: '6px',
            textTransform: 'uppercase',
            fontWeight: 700,
          }}
        >
          epuredrive.com
        </div>
      </div>
    ),
    { ...size }
  )
}
