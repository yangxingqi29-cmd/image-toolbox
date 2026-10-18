import { ImageProcessingError } from '@/services/image/errors'

export function createOutputName(fileName: string, suffix: string, extension: string): string {
  const base = fileName.replace(/\.[^.]+$/, '').trim() || 'image'
  const illegal = '<>:"/\\|?*'
  const safeBase = Array.from(base)
    .map((character) =>
      illegal.includes(character) || character.charCodeAt(0) < 32 ? '-' : character,
    )
    .join('')
    .slice(0, 120)
  return `${safeBase}${suffix}.${extension.replace(/^\./, '')}`
}

export function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = fileName
  anchor.hidden = true

  try {
    document.body.append(anchor)
    anchor.click()
  } catch (error) {
    throw new ImageProcessingError('downloadFailed', undefined, { cause: error })
  } finally {
    anchor.remove()
    // 部分浏览器在 click 后异步读取 Blob，立即 revoke 可能导致空下载。
    window.setTimeout(() => URL.revokeObjectURL(url), 30_000)
  }
}
