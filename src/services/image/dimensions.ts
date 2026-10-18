import { ImageProcessingError } from './errors'
import { IMAGE_LIMITS } from './limits'

export function validateImageDimensions(width: number, height: number): void {
  if (!Number.isSafeInteger(width) || !Number.isSafeInteger(height) || width <= 0 || height <= 0) {
    throw new ImageProcessingError('invalidDimensions')
  }

  if (width > IMAGE_LIMITS.maxEdge || height > IMAGE_LIMITS.maxEdge) {
    throw new ImageProcessingError('edgeTooLarge', { max: IMAGE_LIMITS.maxEdge })
  }

  const pixels = width * height
  if (pixels > IMAGE_LIMITS.maxPixels) {
    throw new ImageProcessingError('pixelCountTooLarge', {
      max: Math.round(IMAGE_LIMITS.maxPixels / 1_000_000),
    })
  }

  // RGBA 解码至少需要每像素 4 字节；额外预留一份缓冲给 Canvas 编码过程。
  const estimatedBytes = pixels * 4 * 2
  if (estimatedBytes > IMAGE_LIMITS.maxDecodedBytes) {
    throw new ImageProcessingError('memoryRisk', {
      max: Math.round(IMAGE_LIMITS.maxDecodedBytes / (1024 * 1024)),
    })
  }
}
