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
