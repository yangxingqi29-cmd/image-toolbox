import { renderWatermarkBlob, type WatermarkSettings } from './watermark'
import type { PreparedImage } from '@/types/image'

export async function processWatermark(
  item: PreparedImage,
  settings: WatermarkSettings,
  mimeType: 'image/png' | 'image/jpeg' | 'image/webp',
  quality: number,
  signal: AbortSignal,
  logo?: File,
): Promise<Blob> {
  if (signal.aborted) throw new DOMException('Aborted', 'AbortError')
  if (typeof Worker !== 'undefined' && typeof OffscreenCanvas !== 'undefined') {
    let worker: Worker | undefined
    try {
      worker = new Worker(new URL('../../workers/watermark.worker.ts', import.meta.url), {
        type: 'module',
      })
      const active = worker
      return await new Promise<Blob>((resolve, reject) => {
        const abort = () => reject(new DOMException('Aborted', 'AbortError'))
        signal.addEventListener('abort', abort, { once: true })
        active.onmessage = (event: MessageEvent<{ blob?: Blob }>) => {
          signal.removeEventListener('abort', abort)
          if (event.data.blob) resolve(event.data.blob)
          else reject(new Error('workerFailed'))
        }
        active.onerror = () => {
          signal.removeEventListener('abort', abort)
          reject(new Error('workerFailed'))
        }
        // CanvasImageSource 不能统一结构化克隆；水印文件由 Worker 独立解码。
        const { imageSource: _source, ...serializable } = settings
        void _source
        active.postMessage({ file: item.file, logo, settings: serializable, mimeType, quality })
      })
    } catch (error) {
      if (signal.aborted) throw error
    } finally {
      worker?.terminate()
    }
  }
  const blob = await renderWatermarkBlob(
    item.decoded.source,
    item.width,
    item.height,
    settings,
    mimeType,
    quality,
  )
  if (signal.aborted) throw new DOMException('Aborted', 'AbortError')
  return blob
}
