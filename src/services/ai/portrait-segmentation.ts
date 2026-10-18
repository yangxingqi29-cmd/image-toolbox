import type { AiProgress, SegmentedPortrait } from '@/types/id-photo'

interface SegmentResultMessage {
  type: 'result'
  width: number
  height: number
  pixels: ArrayBuffer
}

interface SegmentProgressMessage {
  type: 'progress'
  status: string
  progress?: number
}

interface SegmentErrorMessage {
  type: 'error'
  message: string
}

type SegmentWorkerMessage = SegmentResultMessage | SegmentProgressMessage | SegmentErrorMessage

export async function segmentPortrait(
  file: Blob,
  onProgress: (progress: AiProgress) => void,
  signal?: AbortSignal,
): Promise<SegmentedPortrait> {
  if (typeof Worker === 'undefined') throw new Error('workerUnavailable')
  if (signal?.aborted) throw new DOMException('Aborted', 'AbortError')

  const worker = new Worker(
    new URL('../../workers/portrait-segmentation.worker.ts', import.meta.url),
    {
      type: 'module',
    },
  )

  try {
    const result = await new Promise<SegmentResultMessage>((resolve, reject) => {
      const abort = () => reject(new DOMException('Aborted', 'AbortError'))
      signal?.addEventListener('abort', abort, { once: true })

      worker.onmessage = (event: MessageEvent<SegmentWorkerMessage>) => {
        if (event.data.type === 'progress') {
          onProgress({ status: event.data.status, progress: event.data.progress })
          return
        }
        signal?.removeEventListener('abort', abort)
        if (event.data.type === 'result') resolve(event.data)
        else reject(new Error(event.data.message))
      }
      worker.onerror = () => {
        signal?.removeEventListener('abort', abort)
        reject(new Error('workerFailed'))
      }
      worker.postMessage({ type: 'segment', file })
    })

    const canvas = document.createElement('canvas')
    canvas.width = result.width
    canvas.height = result.height
    const context = canvas.getContext('2d')
    if (!context) throw new Error('canvasUnavailable')
    const pixels = new Uint8ClampedArray(result.pixels)
    context.putImageData(new ImageData(pixels, result.width, result.height), 0, 0)

    return {
      source: canvas,
      width: result.width,
      height: result.height,
      dispose: () => {
        canvas.width = 0
        canvas.height = 0
      },
    }
  } finally {
    worker.terminate()
  }
}
