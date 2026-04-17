import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/fetch-ical?url=<encoded-url>
 * Proxy route to fetch external iCal feeds (CORS bypass).
 * Replaces legacy /.netlify/functions/fetch-ical
 */

// Allowlisted iCal hosts — only these can be fetched through this proxy
const ALLOWED_HOSTS = [
  'turo.com',
  'calendar.google.com',
  'p62-caldav.icloud.com',
  'p63-caldav.icloud.com',
  'caldav.icloud.com',
  'outlook.office365.com',
  'calendar.yahoo.com',
  'airbnb.com',
  'ical.booking.com',
  'admin.booking.com',
]

function isSafeIcalUrl(raw: string): boolean {
  try {
    const { protocol, hostname } = new URL(raw)
    if (protocol !== 'https:') return false
    return ALLOWED_HOSTS.some(h => hostname === h || hostname.endsWith(`.${h}`))
  } catch {
    return false
  }
}

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get('url')
  if (!url) {
    return NextResponse.json({ error: 'Missing url parameter' }, { status: 400 })
  }

  if (!isSafeIcalUrl(url)) {
    return NextResponse.json({ error: 'URL not allowed — only known iCal hosts are permitted' }, { status: 403 })
  }

  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'EpureDrive-CalSync/1.0',
        'Accept': 'text/calendar',
      },
      next: { revalidate: 0 }, // no cache — always fresh
    })

    if (!res.ok) {
      return NextResponse.json({ error: `Upstream fetch failed: ${res.status}` }, { status: 502 })
    }

    const icsText = await res.text()

    return new NextResponse(icsText, {
      status: 200,
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Cache-Control': 'no-store',
      },
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to fetch feed' }, { status: 500 })
  }
}
