import { findSafeBreakRow, paginateImageIntoPdf, type JsPDFLike } from '@/lib/agreements/pdf'

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

// Builds a fake 2D context whose pixel rows are supplied directly, so tests
// can control exactly which rows are "blank" without a real canvas.
function fakeCtx(rows: Array<[number, number, number, number]>, canvasWidth: number): CanvasRenderingContext2D {
  return {
    getImageData: (_x: number, y: number, w: number, h: number) => {
      const data = new Uint8ClampedArray(w * h * 4)
      for (let r = 0; r < h; r++) {
        const [red, green, blue, alpha] = rows[y + r] ?? [0, 0, 0, 255]
        for (let c = 0; c < w; c++) {
          const offset = (r * w + c) * 4
          data[offset] = red
          data[offset + 1] = green
          data[offset + 2] = blue
          data[offset + 3] = alpha
        }
      }
      return { data } as unknown as ImageData
    },
  } as unknown as CanvasRenderingContext2D
}

describe('findSafeBreakRow', () => {
  it('returns the nearest blank row within the search window', () => {
    const rows: Array<[number, number, number, number]> = Array.from({ length: 20 }, () => [0, 0, 0, 255])
    rows[8] = [255, 255, 255, 255]
    const ctx = fakeCtx(rows, 1)

    expect(findSafeBreakRow(ctx, 1, 10, 5)).toBe(8)
  })

  it('falls back to the naive boundary when no blank row is found', () => {
    const rows: Array<[number, number, number, number]> = Array.from({ length: 20 }, () => [0, 0, 0, 255])
    const ctx = fakeCtx(rows, 1)

    expect(findSafeBreakRow(ctx, 1, 10, 5)).toBe(10)
  })

  it('falls back to the naive boundary when no context is provided', () => {
    expect(findSafeBreakRow(undefined, 1, 10, 5)).toBe(10)
  })
})

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

  it('shifts a page break to a nearby blank row instead of cutting through content', () => {
    const { pdf, calls } = fakePdf(100, 50)
    // pxPerMm = canvasWidth / pageW = 1, so pixel rows map 1:1 to mm.
    const rows: Array<[number, number, number, number]> = Array.from({ length: 150 }, () => [0, 0, 0, 255])
    rows[30] = [255, 255, 255, 255] // blank row inside the 40mm tolerance window before the naive 50mm break
    const ctx = fakeCtx(rows, 100)

    paginateImageIntoPdf(pdf, 'data:image/jpeg;base64,AAA', 100, 150, ctx)

    const yOffsets = calls.addImage.map((call) => call[3])
    expect(yOffsets[1]).toBe(-30)
  })
})
