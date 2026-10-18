import type { ImageIssue, ImageIssueCode } from '@/types/image'

export class ImageProcessingError extends Error {
  readonly issue: ImageIssue

  constructor(code: ImageIssueCode, params?: ImageIssue['params'], options?: ErrorOptions) {
    super(code, options)
    this.name = 'ImageProcessingError'
    this.issue = { code, params }
  }
}

export function toImageIssue(error: unknown): ImageIssue {
  if (error instanceof ImageProcessingError) return error.issue
  if (error instanceof DOMException && error.name === 'AbortError') return { code: 'cancelled' }
  return { code: 'decodeFailed' }
}
