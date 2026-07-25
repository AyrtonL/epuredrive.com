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
    pdf.addImage(imgData, 'JPEG', 0, 0 - y, pageW, imgH)
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
