# Agreement Print/Download — Design

**Date:** 2026-07-24
**Status:** Approved

## Problem

There is no way to print or download a rental agreement on demand:

- The customer-facing signing page (`app/(sites)/sites/[slug]/agreement/[token]/AgreementSigner.tsx`) has no print/download control at all, in any state (pre-sign, signing, or already-signed).
- A PDF is only ever produced once, automatically, right after the customer signs (`generateAndUploadPDF` in `AgreementSigner.tsx`), uploaded to Supabase Storage, and stored on `reservations.agreement_pdf_url`. That upload is explicitly best-effort — if it fails, there is no retry and no fallback.
- The dashboard (`app/(dashboard)/dashboard/bookings/BookingModal.tsx`, Agreement tab) only shows a "PDF" link when `agreement_pdf_url` happens to be set. If the operator counter-signs later, or the original upload failed, staff have no way to get a current copy.

## Goals

- Let a customer print or download their agreement themselves, from the same page they view/sign it on, in any state.
- Let staff do the same from the dashboard, without needing the original sign-time upload to have succeeded, and without re-sending the agreement or minting a new token.
- Reuse existing rendering and PDF-generation logic — do not duplicate the styled `AgreementDocument` render or its tenant-branding data fetch in a second place.

## Non-Goals

- Server-side PDF rendering (e.g. Puppeteer/Playwright) — out of scope; the existing client-side html2canvas+jsPDF approach is kept and reused, not replaced.
- Changing how the sign-time auto-generated PDF is created or uploaded — that flow is untouched except for extracting its blob-generation step into a shared utility.
- A dashboard-native in-app preview/print of the document (i.e. rendering `AgreementDocument` a second time inside `BookingModal`). The dashboard links out to the existing customer-facing page instead.

## Design

### 1. Shared PDF utility — `lib/agreements/pdf.ts`

Extract the html2canvas+jsPDF blob-generation logic currently inline in `AgreementSigner.tsx`'s `generateAndUploadPDF` into a standalone function:

```ts
export async function generateAgreementPdfBlob(element: HTMLElement): Promise<Blob>
```

- Same rendering approach as today: `html2canvas(element, { scale: 2, useCORS: true, allowTaint: true, backgroundColor: '#ffffff' })`, then paginated into a `jsPDF` (`format: 'letter'`).
- `AgreementSigner.tsx`'s existing sign-time flow calls this function and uploads the returned blob exactly as it does today (no behavior change).
- A new on-demand download action (see below) calls the same function and triggers a browser download via `URL.createObjectURL(blob)` + a temporary `<a download>` click, without any server round-trip or upload.

### 2. Customer-facing page — `AgreementSigner.tsx`

Add "Print" and "Download PDF" buttons to the banner, visible in every state where the document is rendered (`view`, `sign`, `submitting`, and the already-signed view):

- **Print** calls `window.print()`. A print stylesheet (scoped `@media print` rules, added alongside the component or in global CSS) hides the banner buttons, the signature/action bar, and other non-document chrome, leaving only the `agreementRef` document content with clean page breaks.
- **Download** calls `generateAgreementPdfBlob(agreementRef.current)`, then downloads the resulting blob as `agreement-{reservation.booking_code || reservation.id}.pdf`. Shows a brief inline loading state (button disabled, spinner/label change) while html2canvas renders, since this takes a moment on larger documents.
- Errors (e.g. html2canvas failing on an image CORS issue) are caught and surface a small inline error message near the buttons; they do not block viewing or signing the agreement.

### 3. Dashboard — `BookingModal.tsx` Agreement tab

- Extract the `baseUrl`/`tenantSlug`/token URL-building logic currently inline in `sendAgreement` (`app/(dashboard)/dashboard/bookings/actions.ts`) into a small shared helper (e.g. `buildAgreementUrl(tenantSlug: string, token: string): string`), used by both `sendAgreement` and the new action below — avoids duplicating that logic.
- Add a new server action:

  ```ts
  export async function getAgreementViewUrl(reservationId: number): Promise<{ url: string | null; error: string | null }>
  ```

  It looks up the reservation's existing `agreement_token` (scoped to the current tenant) and returns the agreement URL built from it. It does **not** mint a new token or send any email — it's a pure read, reusing whatever link was last sent to the customer.

- In the Agreement tab, add a "View / Print / Download" button next to the existing "PDF" link. Shown only when `reservation.agreement_token` is set. On click: calls `getAgreementViewUrl(reservation.id)`, then `window.open(url, '_blank')`. If no token exists yet (agreement never sent), the button is omitted — sending the agreement first (existing "Send Agreement" action) is the prerequisite, same as it is today for reaching the page at all.

## Data Flow

1. **Sign-time (unchanged):** customer signs → `POST /api/agreement/sign` saves signature → client calls `generateAgreementPdfBlob` → blob uploaded via `POST /api/agreement/upload-pdf` → `reservations.agreement_pdf_url` set.
2. **On-demand download (new):** customer or staff (via dashboard link-out) on the agreement page clicks Download → `generateAgreementPdfBlob(agreementRef.current)` runs in-browser → blob downloaded locally. No DB write, no upload.
3. **Print (new):** `window.print()` on either the pre-sign or signed view, styled by a print stylesheet.
4. **Dashboard link-out (new):** staff clicks "View / Print / Download" → server action reads existing `agreement_token` → opens the customer-facing page in a new tab → staff uses the Print/Download buttons from step 2/3.

## Error Handling

- `generateAgreementPdfBlob` failures (customer-facing download button): caught, inline error message shown, does not affect signing flow.
- `getAgreementViewUrl` (dashboard): returns `{ url: null, error }` if reservation not found under the current tenant, or if no `agreement_token` exists; the dashboard shows an inline error and does not open a blank/broken tab.
- Existing sign-time best-effort upload behavior (silent console warning on failure) is unchanged.

## Testing

- Unit test `lib/agreements/pdf.ts`'s pagination math (given a mocked canvas height/width, correct number of pages / `addPage` calls).
- Unit test `buildAgreementUrl` helper (correct URL shape given tenant slug + token).
- Unit test `getAgreementViewUrl` action: returns URL for valid token, returns error for missing reservation / missing token, respects tenant scoping.
- Manual verification: print preview and downloaded PDF checked visually on the customer-facing page (pre-sign and signed states) and via the dashboard link-out, per this project's UI-testing convention (browser check, not just type-checking).
