import { ImageProcessingError } from './errors'
import { IMAGE_LIMITS } from './limits'
import type { ImageIssue, SupportedImageFormat } from '@/types/image'

const formatMime: Record<SupportedImageFormat, string> = {
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
}

const formatExtensions: Record<SupportedImageFormat, readonly string[]> = {
  jpeg: ['jpg', 'jpeg'],
  png: ['png'],
  webp: ['webp'],
}

function matches(bytes: Uint8Array, signature: readonly number[], offset = 0): boolean {
  return signature.every((value, index) => bytes[offset + index] === value)
}

/**
 * 读取文件魔数而非相信扩展名。WebP 需要同时满足 RIFF 容器和 WEBP 标识，
 * 避免把普通 RIFF 音频或视频误判为图片。
 */
export function detectImageFormat(bytes: Uint8Array): SupportedImageFormat | null {
  if (matches(bytes, [0xff, 0xd8, 0xff])) return 'jpeg'
  if (matches(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return 'png'
  if (matches(bytes, [0x52, 0x49, 0x46, 0x46]) && matches(bytes, [0x57, 0x45, 0x42, 0x50], 8)) {
    return 'webp'
  }
  return null
}

export async function inspectImageFile(
  file: File,
): Promise<{ format: SupportedImageFormat; warnings: ImageIssue[] }> {
  if (file.size === 0) throw new ImageProcessingError('emptyFile')
  if (file.size > IMAGE_LIMITS.maxFileBytes) {
    throw new ImageProcessingError('fileTooLarge', {
      max: Math.round(IMAGE_LIMITS.maxFileBytes / (1024 * 1024)),
    })
  }

  const header = new Uint8Array(await file.slice(0, 16).arrayBuffer())
  const format = detectImageFormat(header)
  if (!format) throw new ImageProcessingError('unsupportedSignature')

  const warnings: ImageIssue[] = []
  const mime = file.type.toLocaleLowerCase()
  if (mime && mime !== formatMime[format]) {
    warnings.push({ code: 'mimeMismatch', params: { expected: formatMime[format] } })
  }

  const extension = file.name.includes('.') ? file.name.split('.').pop()?.toLocaleLowerCase() : ''
  if (extension && !formatExtensions[format].includes(extension)) {
    warnings.push({
      code: 'extensionMismatch',
      params: { expected: formatExtensions[format].join(' / ') },
    })
  }

  return { format, warnings }
}
