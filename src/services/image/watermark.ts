import { ImageProcessingError } from './errors'

export type WatermarkPosition = 'topLeft' | 'topRight' | 'center' | 'bottomLeft' | 'bottomRight'

export interface WatermarkSettings {
  mode: 'text' | 'image'
  text: string
  color: string
  sizePercent: number
  opacity: number
  rotation: number
  position: WatermarkPosition
  tile: boolean
  imageSource?: CanvasImageSource
  imageWidth?: number
  imageHeight?: number
}

function positionedPoint(
  position: WatermarkPosition,
  canvasWidth: number,
  canvasHeight: number,
  markWidth: number,
  markHeight: number,
  padding: number,
) {
  const points = {
    topLeft: { x: padding + markWidth / 2, y: padding + markHeight / 2 },
    topRight: { x: canvasWidth - padding - markWidth / 2, y: padding + markHeight / 2 },
    center: { x: canvasWidth / 2, y: canvasHeight / 2 },
    bottomLeft: {
      x: padding + markWidth / 2,
      y: canvasHeight - padding - markHeight / 2,
    },
    bottomRight: {
      x: canvasWidth - padding - markWidth / 2,
      y: canvasHeight - padding - markHeight / 2,
    },
  }
  return points[position]
}

function drawSingleMark(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  settings: WatermarkSettings,
) {
  context.save()
  context.translate(x, y)
  context.rotate((settings.rotation * Math.PI) / 180)
  context.globalAlpha = settings.opacity

  if (settings.mode === 'image' && settings.imageSource) {
    context.drawImage(settings.imageSource, -width / 2, -height / 2, width, height)
  } else {
    context.fillStyle = settings.color
    context.textAlign = 'center'
    context.textBaseline = 'middle'
    context.font = `700 ${height}px sans-serif`
    context.fillText(settings.text || 'Image Toolbox', 0, 0)
  }
  context.restore()
}

export function drawWatermark(
  context: CanvasRenderingContext2D,
  source: CanvasImageSource,
  width: number,
  height: number,
  settings: WatermarkSettings,
) {
  context.drawImage(source, 0, 0, width, height)
  const shortEdge = Math.min(width, height)
  const markHeight = Math.max(12, shortEdge * (settings.sizePercent / 100))
  let markWidth: number

  if (
    settings.mode === 'image' &&
    settings.imageSource &&
    settings.imageWidth &&
    settings.imageHeight
  ) {
    markWidth = markHeight * (settings.imageWidth / settings.imageHeight)
  } else {
    context.font = `700 ${markHeight}px sans-serif`
    markWidth = Math.max(markHeight, context.measureText(settings.text || 'Image Toolbox').width)
  }

  if (settings.tile) {
    const horizontalStep = Math.max(markWidth * 1.7, shortEdge * 0.35)
    const verticalStep = Math.max(markHeight * 3.5, shortEdge * 0.2)
    for (let y = verticalStep / 2; y < height + verticalStep; y += verticalStep) {
      for (let x = horizontalStep / 2; x < width + horizontalStep; x += horizontalStep) {
        drawSingleMark(context, x, y, markWidth, markHeight, settings)
      }
    }
    return
  }

  const point = positionedPoint(
    settings.position,
    width,
    height,
    markWidth,
    markHeight,
    shortEdge * 0.04,
  )
  drawSingleMark(context, point.x, point.y, markWidth, markHeight, settings)
}

export async function renderWatermarkBlob(
  source: CanvasImageSource,
  width: number,
  height: number,
  settings: WatermarkSettings,
  mimeType: 'image/png' | 'image/jpeg' | 'image/webp',
  quality = 0.9,
): Promise<Blob> {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d', { alpha: mimeType !== 'image/jpeg' })
  if (!context) throw new ImageProcessingError('canvasUnavailable')

  try {
    if (mimeType === 'image/jpeg') {
      context.fillStyle = '#ffffff'
      context.fillRect(0, 0, width, height)
    }
    drawWatermark(context, source, width, height, settings)
    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (value) => (value ? resolve(value) : reject(new ImageProcessingError('encodeFailed'))),
        mimeType,
        quality,
      )
    })
  } finally {
    canvas.width = 0
    canvas.height = 0
  }
}
