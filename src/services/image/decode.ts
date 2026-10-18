import { ImageProcessingError } from './errors'
import type { DecodedImage } from '@/types/image'

function throwIfAborted(signal?: AbortSignal) {
  if (signal?.aborted) throw new DOMException('Aborted', 'AbortError')
}

async function decodeWithImageElement(file: File, signal?: AbortSignal): Promise<DecodedImage> {
  const objectUrl = URL.createObjectURL(file)
  const image = new Image()
  image.decoding = 'async'

  try {
    await new Promise<void>((resolve, reject) => {
      const onAbort = () => reject(new DOMException('Aborted', 'AbortError'))
      signal?.addEventListener('abort', onAbort, { once: true })
      image.onload = () => {
        signal?.removeEventListener('abort', onAbort)
        resolve()
      }
      image.onerror = () => {
        signal?.removeEventListener('abort', onAbort)
        reject(new ImageProcessingError('decodeFailed'))
      }
      image.src = objectUrl
    })
    throwIfAborted(signal)

    // 图片元素完成解码后即可撤销 URL；像素仍由元素持有，移除文件地址可以减少泄漏窗口。
    URL.revokeObjectURL(objectUrl)
    return {
      source: image,
      width: image.naturalWidth,
      height: image.naturalHeight,
      dispose: () => {
        image.src = ''
      },
    }
  } catch (error) {
    URL.revokeObjectURL(objectUrl)
    image.src = ''
    throw error
  }
}

export async function decodeImageFile(file: File, signal?: AbortSignal): Promise<DecodedImage> {
  throwIfAborted(signal)

  if (typeof createImageBitmap !== 'function') return decodeWithImageElement(file, signal)

  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
    if (signal?.aborted) {
      bitmap.close()
      throw new DOMException('Aborted', 'AbortError')
    }
    return {
      source: bitmap,
      width: bitmap.width,
      height: bitmap.height,
      dispose: () => bitmap.close(),
    }
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error
    throw new ImageProcessingError('decodeFailed', undefined, { cause: error })
  }
}
