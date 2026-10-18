import { ImageProcessingError } from './errors'
import { validateImageDimensions } from './dimensions'
import type { CropRect, OutputImageFormat, SupportedImageFormat } from '@/types/image'

export const OUTPUT_FORMATS: OutputImageFormat[] = ['jpeg', 'png', 'webp']

export function formatToMimeType(
  format: OutputImageFormat,
): 'image/jpeg' | 'image/png' | 'image/webp' {
  return `image/${format}` as 'image/jpeg' | 'image/png' | 'image/webp'
}

export function formatToExtension(format: OutputImageFormat): 'jpg' | 'png' | 'webp' {
  return format === 'jpeg' ? 'jpg' : format
}

export function inputFormatToOutput(format: SupportedImageFormat): OutputImageFormat {
  return format
}

export function calculateSavings(originalBytes: number, outputBytes: number): number {
  if (originalBytes <= 0) return 0
  return ((originalBytes - outputBytes) / originalBytes) * 100
}

export function calculateResizeDimensions(
  sourceWidth: number,
  sourceHeight: number,
  requestedWidth: number,
  requestedHeight: number,
  lockRatio: boolean,
  changedSide: 'width' | 'height' = 'width',
): { width: number; height: number } {
  const width = Math.max(1, Math.round(requestedWidth))
  const height = Math.max(1, Math.round(requestedHeight))

  if (!lockRatio) {
    validateImageDimensions(width, height)
    return { width, height }
  }

  const ratio = sourceWidth / sourceHeight
  const result =
    changedSide === 'height'
      ? { width: Math.max(1, Math.round(height * ratio)), height }
      : { width, height: Math.max(1, Math.round(width / ratio)) }
  validateImageDimensions(result.width, result.height)
  return result
}

export function fitCropToBounds(crop: CropRect, imageWidth: number, imageHeight: number): CropRect {
  if (![crop.x, crop.y, crop.width, crop.height].every(Number.isFinite)) {
    throw new ImageProcessingError('invalidCrop')
  }

  const width = Math.min(imageWidth, Math.max(1, Math.round(crop.width)))
  const height = Math.min(imageHeight, Math.max(1, Math.round(crop.height)))
  const x = Math.min(imageWidth - width, Math.max(0, Math.round(crop.x)))
  const y = Math.min(imageHeight - height, Math.max(0, Math.round(crop.y)))

  if (width <= 0 || height <= 0) throw new ImageProcessingError('invalidCrop')
  return { x, y, width, height }
}

export function rotatedDimensions(
  width: number,
  height: number,
  rotation: 0 | 90 | 180 | 270,
): { width: number; height: number } {
  return rotation === 90 || rotation === 270 ? { width: height, height: width } : { width, height }
}

export async function supportsOutputMimeType(mimeType: string): Promise<boolean> {
  const canvas = document.createElement('canvas')
  canvas.width = 1
  canvas.height = 1

  try {
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, mimeType, 0.8))
    return blob?.type === mimeType
  } finally {
    canvas.width = 0
    canvas.height = 0
  }
}
