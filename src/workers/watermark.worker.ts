/// <reference lib="webworker" />
import { drawWatermark, type WatermarkSettings } from '@/services/image/watermark'

const scope = self as unknown as DedicatedWorkerGlobalScope
scope.onmessage = async (
  event: MessageEvent<{
    file: File
    logo?: File
    settings: WatermarkSettings
    mimeType: string
    quality: number
  }>,
) => {
  let source: ImageBitmap | undefined
  let logo: ImageBitmap | undefined
  try {
    const request = event.data
    source = await createImageBitmap(request.file, { imageOrientation: 'from-image' })
    if (request.logo) logo = await createImageBitmap(request.logo)
    const canvas = new OffscreenCanvas(source.width, source.height)
    const context = canvas.getContext('2d')!
    if (request.mimeType === 'image/jpeg') {
      context.fillStyle = '#ffffff'
      context.fillRect(0, 0, canvas.width, canvas.height)
    }
    drawWatermark(
      context as unknown as CanvasRenderingContext2D,
      source,
      canvas.width,
      canvas.height,
      {
        ...request.settings,
        imageSource: logo,
        imageWidth: logo?.width,
        imageHeight: logo?.height,
      },
    )
    const blob = await canvas.convertToBlob({ type: request.mimeType, quality: request.quality })
    if (blob.type !== request.mimeType) throw new Error('unsupportedOutput')
    scope.postMessage({ blob })
    canvas.width = canvas.height = 0
  } catch {
    scope.postMessage({ error: true })
  } finally {
    source?.close()
    logo?.close()
  }
}
