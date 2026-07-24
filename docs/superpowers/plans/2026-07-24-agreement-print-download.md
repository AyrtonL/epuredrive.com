# Agreement Print/Download Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let customers print/download their rental agreement on demand from the signing page, and let staff reach the same controls from the dashboard, without duplicating the styled agreement document or its PDF-generation logic.

**Architecture:** Extract the existing client-side html2canvas+jsPDF blob-generation logic (currently inline, used only at sign time) into a shared `lib/agreements/pdf.ts` utility. The customer-facing agreement page (`AgreementSigner.tsx`) reuses it for both the existing sign-time upload and a new on-demand "Download" button, plus a "Print" button using `window.print()` and Tailwind's `print:` variant for a clean print layout. The dashboard (`BookingModal.tsx`) gets a "View / Print / Download" button that opens the same customer-facing page in a new tab via a new read-only server action, rather than re-rendering the document a second time.

**Tech Stack:** Next.js App Router, React client components, TypeScript, `html2canvas` ^1.4.1, `jspdf` ^4.2.1, Jest (`jsdom` environment) + `next/jest`, Supabase (via `createClient`/`requireTenantId`).

## Global Constraints

- Do not change the sign-time PDF upload behavior (`POST /api/agreement/upload-pdf`, `reservations.agreement_pdf_url`) — only refactor its blob-generation step to use the shared utility.
- The new dashboard action must not mint a new `agreement_token` or send any email — it only reads the existing token.
- No new dependencies — reuse `html2canvas` and `jspdf`, already installed.
- Follow existing code patterns exactly: `useTransition` for async button actions in `BookingModal.tsx`, `'use server'` action file conventions in `actions.ts`, Tailwind-only styling (no new CSS files).

---

### Task 1: Shared PDF blob-generation utility

**Files:**
- Create: `lib/agreements/pdf.ts`
- Test: `__tests__/lib/agreements/pdf.test.ts`

**Interfaces:**
- Produces: `generateAgreementPdfBlob(element: HTMLElement): Promise<Blob>` — used by Task 2 (sign-time upload) and Task 3 (on-demand download).
- Produces: `paginateImageIntoPdf(pdf: JsPDFLike, imgData: string, canvasWidth: number, canvasHeight: number): void` — pure pagination logic, exported for testing, also used internally by `generateAgreementPdfBlob`.
- Produces: `interface JsPDFLike { internal: { pageSize: { getWidth(): number; getHeight(): number } }; addImage(imageData: string, format: string, x: number, y: number, width: number, height: number): void; addPage(): void }`

- [ ] **Step 1: Write the failing test for pagination math**

Create `__tests__/lib/agreements/pdf.test.ts`:

```ts
import { paginateImageIntoPdf, type JsPDFLike } from '@/lib/agreements/pdf'

function fakePdf(pageW: number, pageH: number) {
  const calls: { addImage: Array<[string, string, number, number, number, number]>; addPage: number } = {
    addImage: [],
    addPage: 0,
  }
  const pdf: JsPDFLike = {
    internal: { pageSize: { getWidth: () => pageW, getHeight: () => pageH } },
    addImage: (imageData, format, x, y, width, height) => {
      calls.addImage.push([imageData, format, x, y, width, height])
    },
    addPage: () => {
      calls.addPage += 1
    },
  }
  return { pdf, calls }
}

describe('paginateImageIntoPdf', () => {
  it('renders a single page when the image fits within one page height', () => {
    const { pdf, calls } = fakePdf(200, 280)
    // canvasWidth : canvasHeight ratio matches pageW so imgH stays <= pageH
    paginateImageIntoPdf(pdf, 'data:image/jpeg;base64,AAA', 200, 250)

    expect(calls.addImage).toHaveLength(1)
    expect(calls.addPage).toBe(0)
  })

  it('adds additional pages when the image is taller than one page', () => {
    const { pdf, calls } = fakePdf(200, 280)
    // imgH = (700 * 200) / 200 = 700mm tall, page is 280mm -> 3 pages
    paginateImageIntoPdf(pdf, 'data:image/jpeg;base64,AAA', 200, 700)

    expect(calls.addImage).toHaveLength(3)
    expect(calls.addPage).toBe(2)
  })

  it('shifts the image up by one page height on each subsequent page', () => {
    const { pdf, calls } = fakePdf(200, 280)
    paginateImageIntoPdf(pdf, 'data:image/jpeg;base64,AAA', 200, 700)

    const yOffsets = calls.addImage.map((call) => call[3])
    expect(yOffsets).toEqual([0, -280, -560])
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest __tests__/lib/agreements/pdf.test.ts`
Expected: FAIL with "Cannot find module '@/lib/agreements/pdf'"

- [ ] **Step 3: Write the implementation**

Create `lib/agreements/pdf.ts`:

```ts
export interface JsPDFLike {
  internal: { pageSize: { getWidth(): number; getHeight(): number } }
  addImage(imageData: string, format: string, x: number, y: number, width: number, height: number): void
  addPage(): void
}

export function paginateImageIntoPdf(
  pdf: JsPDFLike,
  imgData: string,
  canvasWidth: number,
  canvasHeight: number
): void {
  const pageW = pdf.internal.pageSize.getWidth()
  const pageH = pdf.internal.pageSize.getHeight()
  const imgH = (canvasHeight * pageW) / canvasWidth

  let y = 0
  let remaining = imgH

  while (remaining > 0) {
    pdf.addImage(imgData, 'JPEG', 0, -y, pageW, imgH)
    remaining -= pageH
    if (remaining > 0) {
      pdf.addPage()
      y += pageH
    }
  }
}

export async function generateAgreementPdfBlob(element: HTMLElement): Promise<Blob> {
  const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
    import('html2canvas'),
    import('jspdf'),
  ])

  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    allowTaint: true,
    backgroundColor: '#ffffff',
  })

  const imgData = canvas.toDataURL('image/jpeg', 0.92)
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter' })

  paginateImageIntoPdf(pdf as unknown as JsPDFLike, imgData, canvas.width, canvas.height)

  return pdf.output('blob')
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest __tests__/lib/agreements/pdf.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add lib/agreements/pdf.ts __tests__/lib/agreements/pdf.test.ts
git commit -m "feat(agreements): extract shared PDF blob-generation utility"
```

---

### Task 2: Refactor sign-time upload to use the shared utility

**Files:**
- Modify: `app/(sites)/sites/[slug]/agreement/[token]/AgreementSigner.tsx:105-152`

**Interfaces:**
- Consumes: `generateAgreementPdfBlob(element: HTMLElement): Promise<Blob>` from Task 1 (`@/lib/agreements/pdf`).

- [ ] **Step 1: Replace the inline html2canvas/jsPDF logic with the shared utility**

In `app/(sites)/sites/[slug]/agreement/[token]/AgreementSigner.tsx`, add the import at the top (near the other imports):

```ts
import { generateAgreementPdfBlob } from '@/lib/agreements/pdf'
```

Replace the entire `generateAndUploadPDF` function (currently lines 105-152):

```ts
  async function generateAndUploadPDF(signatureDataUrl: string) {
    const element = agreementRef.current
    if (!element) return

    try {
      const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
        import('html2canvas'),
        import('jspdf'),
      ])

      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
      })

      const imgData = canvas.toDataURL('image/jpeg', 0.92)
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter' })
      const pageW = pdf.internal.pageSize.getWidth()
      const pageH = pdf.internal.pageSize.getHeight()
      const imgH = (canvas.height * pageW) / canvas.width
      let y = 0
      let remaining = imgH

      while (remaining > 0) {
        pdf.addImage(imgData, 'JPEG', 0, -y, pageW, imgH)
        remaining -= pageH
        if (remaining > 0) {
          pdf.addPage()
          y += pageH
        }
      }

      const pdfBlob = pdf.output('blob')
      const formData = new FormData()
      formData.append('pdf', pdfBlob, `agreement-${reservation.id}.pdf`)
      formData.append('token', token)

      await fetch('/api/agreement/upload-pdf', {
        method: 'POST',
        body: formData,
      })
    } catch {
      // PDF generation is best-effort — signing already succeeded
      console.warn('PDF generation failed, agreement is still signed')
    }
  }
```

with:

```ts
  async function generateAndUploadPDF() {
    const element = agreementRef.current
    if (!element) return

    try {
      const pdfBlob = await generateAgreementPdfBlob(element)
      const formData = new FormData()
      formData.append('pdf', pdfBlob, `agreement-${reservation.id}.pdf`)
      formData.append('token', token)

      await fetch('/api/agreement/upload-pdf', {
        method: 'POST',
        body: formData,
      })
    } catch {
      // PDF generation is best-effort — signing already succeeded
      console.warn('PDF generation failed, agreement is still signed')
    }
  }
```

Note the signature changed from `generateAndUploadPDF(signatureDataUrl: string)` to `generateAndUploadPDF()` — the parameter was unused in the body. Update its one call site in `handleSubmit` (currently `void generateAndUploadPDF(signatureDataUrl)`) to `void generateAndUploadPDF()`.

- [ ] **Step 2: Verify no regressions with a manual sign-through test**

There is no existing automated test for `AgreementSigner.tsx`. Run the app locally (`npm run dev`), open an agreement link for a test reservation with a real `agreement_token`, sign it, and confirm in the Supabase Storage `agreements` bucket / `reservations.agreement_pdf_url` that a PDF is still produced and uploaded exactly as before.

- [ ] **Step 3: Run the existing test suite to confirm nothing else broke**

Run: `npx jest`
Expected: All tests pass (no test currently covers this file, so this is a regression check on the rest of the suite).

- [ ] **Step 4: Commit**

```bash
git add "app/(sites)/sites/[slug]/agreement/[token]/AgreementSigner.tsx"
git commit -m "refactor(agreements): use shared PDF utility for sign-time upload"
```

---

### Task 3: Add Print/Download buttons to the customer-facing agreement page

**Files:**
- Modify: `app/(sites)/sites/[slug]/agreement/[token]/AgreementSigner.tsx`

**Interfaces:**
- Consumes: `generateAgreementPdfBlob(element: HTMLElement): Promise<Blob>` from Task 1.
- Consumes: `agreementRef` (existing `useRef<HTMLDivElement>(null)`, already declared at the top of the component).

- [ ] **Step 1: Add download state and handlers**

Add state near the other `useState` calls (after `const [canvasSize, ...] = useState(...)`):

```ts
  const [downloading, setDownloading] = useState(false)
  const [downloadError, setDownloadError] = useState<string | null>(null)
```

Add handlers after `clearSignature`:

```ts
  async function handlePrint() {
    window.print()
  }

  async function handleDownload() {
    const element = agreementRef.current
    if (!element) return

    setDownloading(true)
    setDownloadError(null)

    try {
      const blob = await generateAgreementPdfBlob(element)
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `agreement-${reservation.booking_code || reservation.id}.pdf`
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(url)
    } catch {
      setDownloadError('Could not generate the PDF. Please try again.')
    } finally {
      setDownloading(false)
    }
  }

  function printDownloadControls() {
    return (
      <div className="flex items-center gap-2 print:hidden">
        <button
          type="button"
          onClick={handlePrint}
          className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1.5 rounded-lg font-bold transition-all"
        >
          Print
        </button>
        <button
          type="button"
          onClick={handleDownload}
          disabled={downloading}
          className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1.5 rounded-lg font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {downloading ? 'Preparing…' : 'Download PDF'}
        </button>
      </div>
    )
  }
```

Also add the import from Task 1 if not already present (it is, from Task 2):

```ts
import { generateAgreementPdfBlob } from '@/lib/agreements/pdf'
```

- [ ] **Step 2: Wire the controls and error message into the already-signed banner**

In the `alreadySigned` early return (the banner around line 204-214), change:

```tsx
          <div className="bg-white rounded-2xl shadow-sm p-5 flex items-center gap-4 border-l-4" style={{ borderColor: accentColor }}>
            {tenant.logo_url && (
              <Image src={tenant.logo_url} alt={tenantName} width={100} height={40} className="h-10 w-auto object-contain" />
            )}
            <div>
              <h1 className="font-bold text-gray-900">{tenantName} — Rental Agreement</h1>
              <p className="text-xs text-green-600 font-semibold">
                {reservation.tenant_signed_at ? 'Finalized — Both parties have signed' : 'Signed — Pending operator close-out'}
              </p>
            </div>
          </div>
```

to:

```tsx
          <div className="bg-white rounded-2xl shadow-sm p-5 flex items-center justify-between gap-4 border-l-4 print:hidden" style={{ borderColor: accentColor }}>
            <div className="flex items-center gap-4">
              {tenant.logo_url && (
                <Image src={tenant.logo_url} alt={tenantName} width={100} height={40} className="h-10 w-auto object-contain" />
              )}
              <div>
                <h1 className="font-bold text-gray-900">{tenantName} — Rental Agreement</h1>
                <p className="text-xs text-green-600 font-semibold">
                  {reservation.tenant_signed_at ? 'Finalized — Both parties have signed' : 'Signed — Pending operator close-out'}
                </p>
              </div>
            </div>
            {printDownloadControls()}
          </div>
          {downloadError && <p className="text-red-500 text-sm print:hidden">{downloadError}</p>}
```

Also add `ref={agreementRef}` to the document wrapper in this same block, changing:

```tsx
          {/* Full Agreement Document */}
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
```

to:

```tsx
          {/* Full Agreement Document */}
          <div ref={agreementRef} className="bg-white rounded-2xl shadow-sm overflow-hidden">
```

- [ ] **Step 3: Wire the controls into the pre-sign / signing banner**

In the main return (bottom of the component, the `── Banner ──` block), change:

```tsx
        <div className="bg-white rounded-2xl shadow-sm p-5 flex items-center gap-4 border-l-4" style={{ borderColor: accentColor }}>
          {tenant.logo_url && (
            <Image src={tenant.logo_url} alt={tenantName} width={100} height={40} className="h-10 w-auto object-contain" />
          )}
          <div>
            <h1 className="font-bold text-gray-900">{tenantName} — Rental Agreement</h1>
            <p className="text-xs text-gray-500">
              Please review the agreement carefully and sign at the bottom.
            </p>
          </div>
        </div>
```

to:

```tsx
        <div className="bg-white rounded-2xl shadow-sm p-5 flex items-center justify-between gap-4 border-l-4 print:hidden" style={{ borderColor: accentColor }}>
          <div className="flex items-center gap-4">
            {tenant.logo_url && (
              <Image src={tenant.logo_url} alt={tenantName} width={100} height={40} className="h-10 w-auto object-contain" />
            )}
            <div>
              <h1 className="font-bold text-gray-900">{tenantName} — Rental Agreement</h1>
              <p className="text-xs text-gray-500">
                Please review the agreement carefully and sign at the bottom.
              </p>
            </div>
          </div>
          {printDownloadControls()}
        </div>
        {downloadError && <p className="text-red-500 text-sm print:hidden">{downloadError}</p>}
```

Note: the document wrapper in this branch (`<div ref={agreementRef} ...>`) already has the ref — no change needed there.

- [ ] **Step 4: Hide the action bar and outer page padding on print**

Add `print:hidden` to the action bar container so Sign/Submit controls don't print. Change the `{step === 'sign' && (` block's wrapper:

```tsx
          <div className="bg-white rounded-2xl shadow-sm p-5 flex items-center justify-between gap-4">
```

to:

```tsx
          <div className="bg-white rounded-2xl shadow-sm p-5 flex items-center justify-between gap-4 print:hidden">
```

Similarly, change the `{step === 'submitting' && (` block's wrapper from:

```tsx
          <div className="bg-white rounded-2xl shadow-sm p-5 flex items-center justify-center gap-3">
```

to:

```tsx
          <div className="bg-white rounded-2xl shadow-sm p-5 flex items-center justify-center gap-3 print:hidden">
```

Also add `print:bg-white print:py-0 print:px-0` to the outermost page wrapper (`<div className="min-h-screen bg-gray-100 py-8 px-4">`) in both the `alreadySigned` branch and the main return, so the printed page isn't gray with extra padding — change each to:

```tsx
    <div className="min-h-screen bg-gray-100 py-8 px-4 print:bg-white print:py-0 print:px-0">
```

- [ ] **Step 5: Manual verification**

Run `npm run dev`, open a signed agreement link in the browser:
- Click "Print" → confirm the browser print preview shows only the agreement document (no banner buttons, no action bar, white background).
- Click "Download PDF" → confirm a file named `agreement-<booking_code>.pdf` downloads and opens correctly, showing the full document.
- Repeat on the pre-sign view (an agreement link that hasn't been signed yet) to confirm both buttons work there too.

- [ ] **Step 6: Run the test suite**

Run: `npx jest`
Expected: All tests pass.

- [ ] **Step 7: Commit**

```bash
git add "app/(sites)/sites/[slug]/agreement/[token]/AgreementSigner.tsx"
git commit -m "feat(agreements): add print and download controls to agreement page"
```

---

### Task 4: Extract `buildAgreementUrl` helper in dashboard bookings actions

**Files:**
- Modify: `app/(dashboard)/dashboard/bookings/actions.ts:500-511`
- Test: `__tests__/app/dashboard/bookings/build-agreement-url.test.ts`

**Interfaces:**
- Produces: `buildAgreementUrl(tenantSlug: string, token: string): string` — used by `sendAgreement` (existing) and `getAgreementViewUrl` (Task 5).

- [ ] **Step 1: Write the failing test**

Create `__tests__/app/dashboard/bookings/build-agreement-url.test.ts`:

```ts
/**
 * @jest-environment node
 */

import { buildAgreementUrl } from '@/app/(dashboard)/dashboard/bookings/actions'

describe('buildAgreementUrl', () => {
  const originalEnv = process.env.NEXT_PUBLIC_APP_URL

  afterEach(() => {
    process.env.NEXT_PUBLIC_APP_URL = originalEnv
  })

  it('uses NEXT_PUBLIC_APP_URL when set', () => {
    process.env.NEXT_PUBLIC_APP_URL = 'https://app.epuredrive.com'
    const url = buildAgreementUrl('acme', 'tok-123')
    expect(url).toBe('https://app.epuredrive.com/sites/acme/agreement/tok-123')
  })

  it('falls back to the tenant subdomain when NEXT_PUBLIC_APP_URL is not set', () => {
    delete process.env.NEXT_PUBLIC_APP_URL
    const url = buildAgreementUrl('acme', 'tok-123')
    expect(url).toBe('https://acme.epuredrive.com/sites/acme/agreement/tok-123')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest __tests__/app/dashboard/bookings/build-agreement-url.test.ts`
Expected: FAIL — `buildAgreementUrl` is not exported from `actions.ts`.

- [ ] **Step 3: Add the helper and use it in `sendAgreement`**

In `app/(dashboard)/dashboard/bookings/actions.ts`, add this function near the top, right after the `rowToBrand` function (currently ending around line 47):

```ts
export function buildAgreementUrl(tenantSlug: string, token: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || `https://${tenantSlug}.epuredrive.com`
  return `${baseUrl}/sites/${tenantSlug}/agreement/${token}`
}
```

Then in `sendAgreement` (around lines 510-511), replace:

```ts
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || `https://${tenantSlug}.epuredrive.com`
  const agreementUrl = `${baseUrl}/sites/${tenantSlug}/agreement/${newToken}`
```

with:

```ts
  const agreementUrl = buildAgreementUrl(tenantSlug, newToken)
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest __tests__/app/dashboard/bookings/build-agreement-url.test.ts`
Expected: PASS (2 tests)

- [ ] **Step 5: Run the full test suite**

Run: `npx jest`
Expected: All tests pass (confirms `sendAgreement`'s behavior is unchanged).

- [ ] **Step 6: Commit**

```bash
git add "app/(dashboard)/dashboard/bookings/actions.ts" __tests__/app/dashboard/bookings/build-agreement-url.test.ts
git commit -m "refactor(bookings): extract buildAgreementUrl helper from sendAgreement"
```

---

### Task 5: Add `getAgreementViewUrl` server action

**Files:**
- Modify: `app/(dashboard)/dashboard/bookings/actions.ts`
- Test: `__tests__/app/dashboard/bookings/get-agreement-view-url.test.ts`

**Interfaces:**
- Consumes: `buildAgreementUrl(tenantSlug: string, token: string): string` from Task 4.
- Consumes: `getTenantId(): Promise<string>` (existing, module-local to `actions.ts`).
- Produces: `getAgreementViewUrl(reservationId: number): Promise<{ url: string | null; error: string | null }>` — used by Task 6 (`BookingModal.tsx`).

- [ ] **Step 1: Write the failing tests**

Create `__tests__/app/dashboard/bookings/get-agreement-view-url.test.ts`:

```ts
/**
 * @jest-environment node
 */

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
}))
jest.mock('@/lib/supabase/dashboard-auth', () => ({
  requireTenantId: jest.fn().mockResolvedValue({ tenantId: 'tenant-123', supabase: null }),
}))

import { getAgreementViewUrl } from '@/app/(dashboard)/dashboard/bookings/actions'
import { createClient } from '@/lib/supabase/server'

function mockSupabase(responses: { reservation?: any; tenant?: any }) {
  return {
    from: jest.fn((table: string) => ({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: table === 'reservations' ? responses.reservation ?? null : null,
            }),
          }),
          single: jest.fn().mockResolvedValue({
            data: table === 'tenants' ? responses.tenant ?? null : null,
          }),
        }),
      }),
    })),
  }
}

describe('getAgreementViewUrl', () => {
  it('returns an error when the reservation has no agreement_token', async () => {
    ;(createClient as jest.Mock).mockReturnValue(
      mockSupabase({ reservation: { agreement_token: null } })
    )

    const result = await getAgreementViewUrl(42)

    expect(result.url).toBeNull()
    expect(result.error).toMatch(/no agreement/i)
  })

  it('returns an error when the reservation is not found for this tenant', async () => {
    ;(createClient as jest.Mock).mockReturnValue(mockSupabase({ reservation: null }))

    const result = await getAgreementViewUrl(42)

    expect(result.url).toBeNull()
    expect(result.error).toBeTruthy()
  })

  it('returns the built URL when a token and tenant slug exist', async () => {
    process.env.NEXT_PUBLIC_APP_URL = 'https://app.epuredrive.com'
    ;(createClient as jest.Mock).mockReturnValue(
      mockSupabase({
        reservation: { agreement_token: 'tok-123' },
        tenant: { slug: 'acme' },
      })
    )

    const result = await getAgreementViewUrl(42)

    expect(result.error).toBeNull()
    expect(result.url).toBe('https://app.epuredrive.com/sites/acme/agreement/tok-123')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest __tests__/app/dashboard/bookings/get-agreement-view-url.test.ts`
Expected: FAIL — `getAgreementViewUrl` is not exported from `actions.ts`.

- [ ] **Step 3: Implement the action**

In `app/(dashboard)/dashboard/bookings/actions.ts`, add this function near `sendAgreement` (place it directly after `sendAgreement`'s closing brace):

```ts
export async function getAgreementViewUrl(
  reservationId: number
): Promise<{ url: string | null; error: string | null }> {
  const supabase = createClient()
  const tenantId = await getTenantId()

  const { data: reservation } = await supabase
    .from('reservations')
    .select('agreement_token')
    .eq('id', reservationId)
    .eq('tenant_id', tenantId)
    .single()

  if (!reservation || !reservation.agreement_token) {
    return { url: null, error: 'No agreement has been sent for this reservation yet' }
  }

  const { data: tenantRow } = await supabase
    .from('tenants')
    .select('slug')
    .eq('id', tenantId)
    .single()

  const tenantSlug = tenantRow?.slug || ''
  if (!tenantSlug) {
    return { url: null, error: 'Tenant configuration is missing a slug' }
  }

  return { url: buildAgreementUrl(tenantSlug, reservation.agreement_token), error: null }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest __tests__/app/dashboard/bookings/get-agreement-view-url.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 5: Run the full test suite**

Run: `npx jest`
Expected: All tests pass.

- [ ] **Step 6: Commit**

```bash
git add "app/(dashboard)/dashboard/bookings/actions.ts" __tests__/app/dashboard/bookings/get-agreement-view-url.test.ts
git commit -m "feat(bookings): add getAgreementViewUrl action for dashboard agreement link-out"
```

---

### Task 6: Add "View / Print / Download" button to the dashboard Agreement tab

**Files:**
- Modify: `app/(dashboard)/dashboard/bookings/BookingModal.tsx`

**Interfaces:**
- Consumes: `getAgreementViewUrl(reservationId: number): Promise<{ url: string | null; error: string | null }>` from Task 5.
- Consumes: existing `reservation.agreement_token` field (from `@/lib/supabase/types`'s `Reservation`).
- Consumes: existing `agreementMsg` / `setAgreementMsg` state (already declared at line 62) for surfacing errors.

- [ ] **Step 1: Import the action and add transition state**

In `app/(dashboard)/dashboard/bookings/BookingModal.tsx`, update the existing actions import (currently lines 6-13):

```ts
import {
  createReservation,
  updateReservation,
  sendAgreement,
  getLatestOdometer,
  searchCustomersForBooking,
  type CustomerLookup,
} from './actions'
```

to:

```ts
import {
  createReservation,
  updateReservation,
  sendAgreement,
  getAgreementViewUrl,
  getLatestOdometer,
  searchCustomersForBooking,
  type CustomerLookup,
} from './actions'
```

Add a new transition state next to `isSendingAgreement` (currently line 59):

```ts
  const [isSendingAgreement, setIsSendingAgreement] = useTransition()
  const [isOpeningAgreement, setIsOpeningAgreement] = useTransition()
```

- [ ] **Step 2: Add the button**

In the Agreement tab's button row (currently lines 847-870, the `<div className="flex items-center gap-2">` that already holds the "PDF" link), add the new button as the first child, before the existing `{reservation.agreement_pdf_url && (...)}` block:

```tsx
                      <div className="flex items-center gap-2">
                        {reservation.agreement_token && (
                          <button
                            type="button"
                            disabled={isOpeningAgreement}
                            onClick={() => {
                              setAgreementMsg(null)
                              setIsOpeningAgreement(async () => {
                                const result = await getAgreementViewUrl(reservation.id)
                                if (result.error || !result.url) {
                                  setAgreementMsg('Error: ' + (result.error || 'Could not open agreement'))
                                } else {
                                  window.open(result.url, '_blank', 'noopener,noreferrer')
                                }
                              })
                            }}
                            className="text-xs bg-white/5 hover:bg-white/10 text-white/70 px-3 py-1.5 rounded-lg font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            {isOpeningAgreement ? 'Opening…' : 'View / Print / Download'}
                          </button>
                        )}
                        {reservation.agreement_pdf_url && (
```

(The rest of the existing "PDF" link block and the "Send Agreement"/"Resend" button that follow it are unchanged.)

- [ ] **Step 3: Manual verification**

Run `npm run dev`, open the dashboard, open a booking that has already had an agreement sent (`agreement_token` set) and click "View / Print / Download" — confirm a new tab opens to the correct `/sites/<slug>/agreement/<token>` URL where the Print/Download buttons from Task 3 are visible and functional. Then open a booking that has never had an agreement sent and confirm the button does not appear.

- [ ] **Step 4: Run the full test suite**

Run: `npx jest`
Expected: All tests pass.

- [ ] **Step 5: Commit**

```bash
git add "app/(dashboard)/dashboard/bookings/BookingModal.tsx"
git commit -m "feat(bookings): link to agreement print/download from the dashboard"
```

---

## Post-Implementation

- Update the Notion Dev Log per this project's `CLAUDE.md` convention, noting the files touched and status.
