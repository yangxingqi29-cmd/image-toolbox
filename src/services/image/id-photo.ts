import { ImageProcessingError } from './errors'
import { validateImageDimensions } from './dimensions'
import type { IdPhotoTransform, OutfitTransform } from '@/types/id-photo'

export interface IdPhotoRenderOptions {
  width: number
  height: number
  backgroundColor: string | null
  mimeType: 'image/png' | 'image/jpeg'
  quality?: number
  transform: IdPhotoTransform
  outfit?: {
    source: CanvasImageSource
    width: number
    height: number
    transform: OutfitTransform
  }
}

export function drawIdPhoto(
  context: CanvasRenderingContext2D,
  source: CanvasImageSource,
  sourceWidth: number,
  sourceHeight: number,
  options: IdPhotoRenderOptions,
) {
  if (options.backgroundColor) {
    context.fillStyle = options.backgroundColor
    context.fillRect(0, 0, options.width, options.height)
  } else {
    context.clearRect(0, 0, options.width, options.height)
  }

  const coverScale = Math.max(options.width / sourceWidth, options.height / sourceHeight)
  const scale = coverScale * options.transform.zoom
  const drawWidth = sourceWidth * scale
  const drawHeight = sourceHeight * scale
  const x = (options.width - drawWidth) / 2 + options.transform.offsetX * options.width
  const y = (options.height - drawHeight) / 2 + options.transform.offsetY * options.height
  context.drawImage(source, x, y, drawWidth, drawHeight)

  if (options.outfit) {
    const outfitWidth = options.width * options.outfit.transform.scale * options.transform.zoom
    const outfitHeight = outfitWidth * (options.outfit.height / options.outfit.width)
    const outfitX = (options.width - outfitWidth) / 2 + options.transform.offsetX * options.width
    const outfitY =
      options.height * options.outfit.transform.offsetY + options.transform.offsetY * options.height
    context.drawImage(options.outfit.source, outfitX, outfitY, outfitWidth, outfitHeight)

    // 服装需要覆盖原上衣，但领口必须位于脸和颈部后方；重新绘制上半部分人物可避免后领遮住下巴。
    context.save()
    context.beginPath()
    context.rect(0, 0, options.width, options.height * 0.7)
    context.clip()
    context.drawImage(source, x, y, drawWidth, drawHeight)
    context.restore()
  }
}

export async function renderIdPhotoBlob(
  source: CanvasImageSource,
  sourceWidth: number,
  sourceHeight: number,
  options: IdPhotoRenderOptions,
): Promise<Blob> {
  validateImageDimensions(options.width, options.height)
  const canvas = document.createElement('canvas')
  canvas.width = options.width
  canvas.height = options.height
  const context = canvas.getContext('2d', { alpha: options.mimeType === 'image/png' })
  if (!context) throw new ImageProcessingError('canvasUnavailable')

  try {
    drawIdPhoto(context, source, sourceWidth, sourceHeight, options)
    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (value) => (value ? resolve(value) : reject(new ImageProcessingError('encodeFailed'))),
        options.mimeType,
        options.quality,
      )
    })
    return blob
  } finally {
    canvas.width = 0
    canvas.height = 0
  }
}
