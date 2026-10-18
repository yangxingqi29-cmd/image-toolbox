import { renderTransformedImageToBlob } from './canvas'
import { ImageProcessingError } from './errors'
import { validateImageDimensions } from './dimensions'
import type { ImageTransformOptions, PreparedImage } from '@/types/image'

interface WorkerResponse {
  id: string
  blob?: Blob
  error?: string
}

function workerError(code?: string): ImageProcessingError {
  if (code === 'canvasUnavailable') return new ImageProcessingError('canvasUnavailable')
  if (code === 'unsupportedOutput') return new ImageProcessingError('unsupportedOutput')
  return new ImageProcessingError('workerFailed')
}

export async function processPreparedImage(
  image: PreparedImage,
  options: ImageTransformOptions,
  signal?: AbortSignal,
): Promise<Blob> {
  validateImageDimensions(options.width, options.height)
  if (signal?.aborted) throw new DOMException('Aborted', 'AbortError')

  if (typeof Worker !== 'undefined' && typeof OffscreenCanvas !== 'undefined') {
    let worker: Worker | undefined

    try {
      worker = new Worker(new URL('../../workers/image.worker.ts', import.meta.url), {
        type: 'module',
      })
      const activeWorker = worker
      const result = await new Promise<Blob>((resolve, reject) => {
        const requestId = image.id
        const abort = () => {
          activeWorker.terminate()
          reject(new DOMException('Aborted', 'AbortError'))
        }
        signal?.addEventListener('abort', abort, { once: true })

        activeWorker.onmessage = (event: MessageEvent<WorkerResponse>) => {
          if (event.data.id !== requestId) return
          signal?.removeEventListener('abort', abort)
          if (event.data.blob) resolve(event.data.blob)
          else reject(workerError(event.data.error))
        }
        activeWorker.onerror = () => {
          signal?.removeEventListener('abort', abort)
          reject(new ImageProcessingError('workerFailed'))
        }
        activeWorker.postMessage({ id: requestId, file: image.file, options })
      })
      return result
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') throw error
      if (error instanceof ImageProcessingError && error.issue.code === 'unsupportedOutput') {
        throw error
      }
      // Worker 初始化或运行失败时回退到普通 Canvas，避免把兼容性问题变成不可用功能。
    } finally {
      worker?.terminate()
    }
  }

  // 不支持 OffscreenCanvas 的浏览器回退到主线程，同时继续沿用同一套参数校验。
  return renderTransformedImageToBlob(
    image.decoded.source,
    image.width,
    image.height,
    options,
    signal,
  )
}
