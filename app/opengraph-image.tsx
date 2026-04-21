import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const alt = 'éPure Drive — Premium Fleet Software for Car Rental Businesses'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function OGImage() {
  const BASE = 'https://epuredrive.com'

  return new ImageResponse(
    (
      <div
        style={{
          background: '#000',
          width: '100%',
          height: '100%',
          display: 'flex',
          fontFamily: 'sans-serif',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* ── Background: fleet page screenshot ── */}
        <img
          src={`${BASE}/assets/screenshots/site-fleet.png`}
          width={680}
          height={440}
          style={{
            position: 'absolute',
            right: -30,
            bottom: -20,
            borderRadius: 16,
            border: '1px solid rgba(255,255,255,0.1)',
            opacity: 0.55,
          }}
        />

        {/* ── Dashboard screenshot (stacked behind) ── */}
        <img
          src={`${BASE}/assets/screenshots/dash-overview.png`}
          width={600}
          height={390}
          style={{
            position: 'absolute',
            right: 60,
            bottom: 30,
            borderRadius: 16,
            border: '1px solid rgba(255,255,255,0.08)',
            opacity: 0.3,
          }}
        />

        {/* ── Dark gradient overlay for readability ── */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background:
              'linear-gradient(to right, #000 35%, rgba(0,0,0,0.85) 55%, rgba(0,0,0,0.4) 100%)',
            display: 'flex',
          }}
        />

        {/* ── Left content ── */}
        <div
          style={{
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            padding: '60px 64px',
            width: '55%',
          }}
        >
          {/* Brand */}
          <div
            style={{
              display: 'flex',
              alignItems: 'baseline',
              gap: 8,
              marginBottom: 32,
            }}
          >
            <span
              style={{
                fontSize: 52,
                fontWeight: 900,
                fontStyle: 'italic',
                color: 'white',
                letterSpacing: '-2px',
              }}
            >
              éPure
            </span>
            <span
              style={{
                fontSize: 14,
                fontWeight: 800,
                color: 'rgba(255,255,255,0.3)',
                letterSpacing: '8px',
                textTransform: 'uppercase',
              }}
            >
              DRIVE
            </span>
          </div>

          {/* Headline */}
          <div
            style={{
              fontSize: 36,
              fontWeight: 800,
              color: 'white',
              lineHeight: 1.15,
              marginBottom: 20,
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <span>Your fleet. Online.</span>
            <span>In minutes.</span>
          </div>

          {/* Subtitle */}
          <div
            style={{
              fontSize: 18,
              color: 'rgba(255,255,255,0.5)',
              fontWeight: 400,
              lineHeight: 1.5,
              marginBottom: 32,
              maxWidth: 400,
            }}
          >
            Fleet management, online bookings, payments & digital contracts — all in one platform.
          </div>

          {/* Feature pills */}
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {['Branded Site', 'Online Booking', 'Stripe + Square', 'Turo Sync'].map(
              (label) => (
                <div
                  key={label}
                  style={{
                    background: 'rgba(255,255,255,0.08)',
                    border: '1px solid rgba(255,255,255,0.12)',
                    borderRadius: 20,
                    padding: '6px 16px',
                    fontSize: 13,
                    fontWeight: 600,
                    color: 'rgba(255,255,255,0.6)',
                  }}
                >
                  {label}
                </div>
              )
            )}
          </div>

          {/* CTA line */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              marginTop: 32,
            }}
          >
            <div
              style={{
                width: 8,
                height: 8,
                borderRadius: 4,
                background: '#34d399',
              }}
            />
            <span
              style={{
                fontSize: 14,
                fontWeight: 600,
                color: 'rgba(255,255,255,0.4)',
                letterSpacing: '0.5px',
              }}
            >
              Free to start — epuredrive.com
            </span>
          </div>
        </div>
      </div>
    ),
    { ...size }
  )
}
