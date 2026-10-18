import { processPreparedImage } from '@/services/image/processor'
import type { PreparedImage } from '@/types/image'

export interface PdfOptions {
  pageWidthMm: number
  pageHeightMm: number
  marginMm: number
  layout: 'single' | 'grid'
}

function fitInside(sourceWidth: number, sourceHeight: number, boxWidth: number, boxHeight: number) {
  const scale = Math.min(boxWidth / sourceWidth, boxHeight / sourceHeight)
  return { width: sourceWidth * scale, height: sourceHeight * scale }
}

export async function generateImagePdf(
  images: PreparedImage[],
  options: PdfOptions,
  onProgress?: (done: number, total: number) => void,
  signal?: AbortSignal,
): Promise<Blob> {
  const { pageWidthMm, pageHeightMm, marginMm } = options
  if (
    ![pageWidthMm, pageHeightMm, marginMm].every(Number.isFinite) ||
    Math.min(pageWidthMm, pageHeightMm) < 50 ||
    Math.max(pageWidthMm, pageHeightMm) > 1000 ||
    marginMm < 0 ||
    marginMm * 2 + 4 >= Math.min(pageWidthMm, pageHeightMm)
  )
    throw new Error('invalidPageSize')
  const { jsPDF } = await import('jspdf')
  const pageWidth = options.pageWidthMm
  const pageHeight = options.pageHeightMm
  const orientation = pageWidth > pageHeight ? 'landscape' : 'portrait'
  const pdf = new jsPDF({
    orientation,
    unit: 'mm',
    format: [pageWidth, pageHeight],
    compress: true,
  })
  const columns = options.layout === 'grid' ? 2 : 1
  const rows = options.layout === 'grid' ? 2 : 1
  const perPage = columns * rows
  const gap = options.layout === 'grid' ? 4 : 0
  const cellWidth = (pageWidth - options.marginMm * 2 - gap * (columns - 1)) / columns
  const cellHeight = (pageHeight - options.marginMm * 2 - gap * (rows - 1)) / rows

  for (let index = 0; index < images.length; index += 1) {
    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError')
    const image = images[index]
    const slot = index % perPage
    if (index > 0 && slot === 0) pdf.addPage([pageWidth, pageHeight], orientation)

    const maxEdge = 2000
    const scale = Math.min(1, maxEdge / Math.max(image.width, image.height))
    const jpeg = await processPreparedImage(
      image,
      {
        width: Math.max(1, Math.round(image.width * scale)),
        height: Math.max(1, Math.round(image.height * scale)),
        mimeType: 'image/jpeg',
        quality: 0.84,
        backgroundColor: '#ffffff',
      },
      signal,
    )
    const bytes = new Uint8Array(await jpeg.arrayBuffer())
    const column = slot % columns
    const row = Math.floor(slot / columns)
    const boxX = options.marginMm + column * (cellWidth + gap)
    const boxY = options.marginMm + row * (cellHeight + gap)
    const fitted = fitInside(image.width, image.height, cellWidth, cellHeight)
    const x = boxX + (cellWidth - fitted.width) / 2
    const y = boxY + (cellHeight - fitted.height) / 2
    pdf.addImage(bytes, 'JPEG', x, y, fitted.width, fitted.height, undefined, 'FAST')
    onProgress?.(index + 1, images.length)
  }

  if (signal?.aborted) throw new DOMException('Aborted', 'AbortError')
  return pdf.output('blob')
}
