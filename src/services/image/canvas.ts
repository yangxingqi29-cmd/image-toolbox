import { ImageProcessingError } from './errors'
import { validateImageDimensions } from './dimensions'
import { fitCropToBounds, rotatedDimensions } from './operations'
import type { ImageTransformOptions } from '@/types/image'

export interface CanvasExportOptions {
  mimeType: 'image/png' | 'image/jpeg' | 'image/webp'
  quality?: number
  backgroundColor?: string
  signal?: AbortSignal
}

export async function renderImageToBlob(
  source: CanvasImageSource,
  width: number,
  height: number,
  options: CanvasExportOptions,
): Promise<Blob> {
  return renderTransformedImageToBlob(
    source,
    width,
    height,
    {
      width,
      height,
      mimeType: options.mimeType,
      quality: options.quality,
      backgroundColor: options.backgroundColor,
    },
    options.signal,
  )
}

export async function renderTransformedImageToBlob(
  source: CanvasImageSource,
  sourceWidth: number,
  sourceHeight: number,
  options: ImageTransformOptions,
  signal?: AbortSignal,
): Promise<Blob> {
  validateImageDimensions(options.width, options.height)
  if (signal?.aborted) throw new DOMException('Aborted', 'AbortError')

  const canvas = document.createElement('canvas')
  const context = canvas.getContext('2d', { alpha: options.mimeType !== 'image/jpeg' })
  if (!context) throw new ImageProcessingError('canvasUnavailable')

  canvas.width = options.width
  canvas.height = options.height
  let rotatedCanvas: HTMLCanvasElement | null = null

  try {
    if (options.backgroundColor) {
      context.fillStyle = options.backgroundColor
      context.fillRect(0, 0, options.width, options.height)
    }

    const rotation = options.rotation ?? 0
    const rotatedSize = rotatedDimensions(sourceWidth, sourceHeight, rotation)
    let drawable = source

    if (rotation !== 0) {
      rotatedCanvas = document.createElement('canvas')
      rotatedCanvas.width = rotatedSize.width
      rotatedCanvas.height = rotatedSize.height
      const rotatedContext = rotatedCanvas.getContext('2d')
      if (!rotatedContext) throw new ImageProcessingError('canvasUnavailable')

      rotatedContext.translate(rotatedSize.width / 2, rotatedSize.height / 2)
      rotatedContext.rotate((rotation * Math.PI) / 180)
      rotatedContext.drawImage(source, -sourceWidth / 2, -sourceHeight / 2)
      drawable = rotatedCanvas
    }

    const crop = fitCropToBounds(
      options.crop ?? { x: 0, y: 0, width: rotatedSize.width, height: rotatedSize.height },
      rotatedSize.width,
      rotatedSize.height,
    )
    context.drawImage(
      drawable,
      crop.x,
      crop.y,
      crop.width,
      crop.height,
      0,
      0,
      options.width,
      options.height,
    )
    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError')

    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (result) => (result ? resolve(result) : reject(new ImageProcessingError('encodeFailed'))),
        options.mimeType,
        options.quality,
      )
    })
    if (blob.type !== options.mimeType) throw new ImageProcessingError('unsupportedOutput')
    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError')
    return blob
  } finally {
    // 将画布归零可尽快释放浏览器持有的像素缓冲，批量处理时尤其重要。
    canvas.width = 0
    canvas.height = 0
    if (rotatedCanvas) {
      rotatedCanvas.width = 0
      rotatedCanvas.height = 0
    }
  }
}
