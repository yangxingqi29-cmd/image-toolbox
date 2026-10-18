export const IMAGE_LIMITS = {
  maxFileBytes: 25 * 1024 * 1024,
  maxEdge: 16_384,
  maxPixels: 40_000_000,
  maxDecodedBytes: 192 * 1024 * 1024,
  maxBatchFiles: 20,
  batchConcurrency: 2,
} as const

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
