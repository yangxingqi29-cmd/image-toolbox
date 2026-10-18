/// <reference lib="webworker" />

import type { ImageTransformOptions } from '@/types/image'

interface WorkerRequest {
  id: string
  file: File
  options: ImageTransformOptions
}

interface WorkerResponse {
  id: string
  blob?: Blob
  error?: string
}

const workerScope = self as unknown as DedicatedWorkerGlobalScope

function clampCrop(
  crop: ImageTransformOptions['crop'],
  width: number,
  height: number,
): { x: number; y: number; width: number; height: number } {
  const requested = crop ?? { x: 0, y: 0, width, height }
  const cropWidth = Math.min(width, Math.max(1, Math.round(requested.width)))
  const cropHeight = Math.min(height, Math.max(1, Math.round(requested.height)))
  return {
    x: Math.min(width - cropWidth, Math.max(0, Math.round(requested.x))),
    y: Math.min(height - cropHeight, Math.max(0, Math.round(requested.y))),
    width: cropWidth,
    height: cropHeight,
  }
}

workerScope.onmessage = async (event: MessageEvent<WorkerRequest>) => {
  const { id, file, options } = event.data
  let bitmap: ImageBitmap | null = null
  let rotatedCanvas: OffscreenCanvas | null = null
  let outputCanvas: OffscreenCanvas | null = null

  try {
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
    const rotation = options.rotation ?? 0
    const swapSides = rotation === 90 || rotation === 270
    const rotatedWidth = swapSides ? bitmap.height : bitmap.width
    const rotatedHeight = swapSides ? bitmap.width : bitmap.height
    let source: CanvasImageSource = bitmap

    if (rotation !== 0) {
      rotatedCanvas = new OffscreenCanvas(rotatedWidth, rotatedHeight)
      const rotatedContext = rotatedCanvas.getContext('2d')
      if (!rotatedContext) throw new Error('canvasUnavailable')
      rotatedContext.translate(rotatedWidth / 2, rotatedHeight / 2)
      rotatedContext.rotate((rotation * Math.PI) / 180)
      rotatedContext.drawImage(bitmap, -bitmap.width / 2, -bitmap.height / 2)
      source = rotatedCanvas
    }

    outputCanvas = new OffscreenCanvas(options.width, options.height)
    const context = outputCanvas.getContext('2d', { alpha: options.mimeType !== 'image/jpeg' })
    if (!context) throw new Error('canvasUnavailable')
    if (options.backgroundColor) {
      context.fillStyle = options.backgroundColor
      context.fillRect(0, 0, options.width, options.height)
    }

    const crop = clampCrop(options.crop, rotatedWidth, rotatedHeight)
    context.drawImage(
      source,
      crop.x,
      crop.y,
      crop.width,
      crop.height,
      0,
      0,
      options.width,
      options.height,
    )
    const blob = await outputCanvas.convertToBlob({
      type: options.mimeType,
      quality: options.quality,
    })
    if (blob.type !== options.mimeType) throw new Error('unsupportedOutput')
    workerScope.postMessage({ id, blob } satisfies WorkerResponse)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'workerFailed'
    workerScope.postMessage({ id, error: message } satisfies WorkerResponse)
  } finally {
    bitmap?.close()
    rotatedCanvas = null
    outputCanvas = null
  }
}

export {}
