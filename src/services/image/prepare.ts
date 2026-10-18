import { validateImageDimensions } from './dimensions'
import { decodeImageFile } from './decode'
import { inspectImageFile } from './file-format'
import type { PreparedImage } from '@/types/image'

function createId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

export async function prepareImageFile(file: File, signal?: AbortSignal): Promise<PreparedImage> {
  const inspection = await inspectImageFile(file)
  if (signal?.aborted) throw new DOMException('Aborted', 'AbortError')

  const decoded = await decodeImageFile(file, signal)
  try {
    validateImageDimensions(decoded.width, decoded.height)
  } catch (error) {
    decoded.dispose()
    throw error
  }

  return {
    id: createId(),
    file,
    format: inspection.format,
    width: decoded.width,
    height: decoded.height,
    decoded,
    warnings: inspection.warnings,
  }
}
