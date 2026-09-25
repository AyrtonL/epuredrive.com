export interface JsPDFLike {
  internal: { pageSize: { getWidth(): number; getHeight(): number } }
  addImage(imageData: string, format: string, x: number, y: number, width: number, height: number): void
  addPage(): void
}

const BREAK_SEARCH_TOLERANCE_MM = 40
const BLANK_ROW_THRESHOLD = 240

function isRowBlank(data: Uint8ClampedArray, rowOffset: number, rowBytes: number): boolean {
  for (let i = rowOffset; i < rowOffset + rowBytes; i += 4) {
    if (data[i] < BLANK_ROW_THRESHOLD || data[i + 1] < BLANK_ROW_THRESHOLD || data[i + 2] < BLANK_ROW_THRESHOLD) {
      return false
    }
  }
  return true
}

/**
 * Looks upward from the naive fixed-height page boundary for the nearest row
 * with no ink (text, table borders, section headers), so a page break lands
 * in the whitespace between sections instead of slicing through content.
 * Falls back to the naive boundary if no blank row turns up in the tolerance
 * window, or no canvas context is available (e.g. in tests).
 */
export function findSafeBreakRow(
  ctx: CanvasRenderingContext2D | null | undefined,
  canvasWidth: number,
  naiveBreakPx: number,
  maxSearchPx: number
): number {
  const bottom = Math.floor(naiveBreakPx)
  if (!ctx || bottom <= 0) return bottom
  const top = Math.max(0, bottom - Math.floor(maxSearchPx))
  if (bottom <= top) return bottom

  const { data } = ctx.getImageData(0, top, canvasWidth, bottom - top)
  const rowBytes = canvasWidth * 4
  for (let row = bottom - top - 1; row >= 0; row--) {
    if (isRowBlank(data, row * rowBytes, rowBytes)) {
      return top + row
    }
  }
  return bottom
}

export function paginateImageIntoPdf(
  pdf: JsPDFLike,
  imgData: string,
  canvasWidth: number,
  canvasHeight: number,
  canvasContext?: CanvasRenderingContext2D | null
): void {
  const pageW = pdf.internal.pageSize.getWidth()
  const pageH = pdf.internal.pageSize.getHeight()
  const imgH = (canvasHeight * pageW) / canvasWidth
  const pxPerMm = canvasWidth / pageW
  const maxSearchPx = BREAK_SEARCH_TOLERANCE_MM * pxPerMm

  let consumedMm = 0
  while (true) {
    pdf.addImage(imgData, 'JPEG', 0, 0 - consumedMm, pageW, imgH)
    const naiveNextMm = consumedMm + pageH
    if (naiveNextMm >= imgH) break

    const safeBreakPx = findSafeBreakRow(canvasContext, canvasWidth, naiveNextMm * pxPerMm, maxSearchPx)
    const safeNextMm = safeBreakPx / pxPerMm
    // Never let the search push the break backwards or stall progress.
    const nextMm = safeNextMm > consumedMm ? safeNextMm : naiveNextMm

    pdf.addPage()
    consumedMm = nextMm
  }
}

/**
 * html2canvas can't rasterize SVGs that lean on <defs>/<clipPath>/<use> (our
 * tenant logos do, for the clipped background square) — it silently drops
 * the clipped artwork and paints only the underlying shape. Browsers render
 * these correctly, so we redraw each SVG <img> through an offscreen canvas
 * first and swap in that PNG for the capture, restoring the original SVG
 * src afterward.
 */
export async function rasterizeSvgImages(root: HTMLElement): Promise<() => void> {
  const svgImages = Array.from(root.querySelectorAll('img')).filter((img) =>
    img.src.split('?')[0].toLowerCase().endsWith('.svg')
  )

  const restores: Array<() => void> = []

  await Promise.all(
    svgImages.map(async (img) => {
      const originalSrc = img.src
      try {
        const width = img.naturalWidth || img.clientWidth || 256
        const height = img.naturalHeight || img.clientHeight || 256
        const pngDataUrl = await svgUrlToPngDataUrl(originalSrc, width, height)
        img.src = pngDataUrl
        restores.push(() => {
          img.src = originalSrc
        })
      } catch {
        // Leave the original SVG src in place if rasterization fails —
        // html2canvas will fall back to its (imperfect) native handling.
      }
    })
  )

  return () => restores.forEach((restore) => restore())
}

function svgUrlToPngDataUrl(url: string, width: number, height: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.crossOrigin = 'anonymous'
    image.onload = () => {
      const scale = 2
      const canvas = document.createElement('canvas')
      canvas.width = width * scale
      canvas.height = height * scale
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        reject(new Error('Canvas 2D context unavailable'))
        return
      }
      ctx.drawImage(image, 0, 0, canvas.width, canvas.height)
      resolve(canvas.toDataURL('image/png'))
    }
    image.onerror = () => reject(new Error(`Failed to load ${url}`))
    image.src = url
  })
}

export async function generateAgreementPdfBlob(element: HTMLElement): Promise<Blob> {
  const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
    import('html2canvas'),
    import('jspdf'),
  ])

  const restoreSvgImages = await rasterizeSvgImages(element)
  let canvas: HTMLCanvasElement
  try {
    canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
    })
  } finally {
    restoreSvgImages()
  }

  const imgData = canvas.toDataURL('image/jpeg', 0.92)
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter' })

  paginateImageIntoPdf(
    pdf as unknown as JsPDFLike,
    imgData,
    canvas.width,
    canvas.height,
    canvas.getContext('2d', { willReadFrequently: true })
  )

  return pdf.output('blob')
}
