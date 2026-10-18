export type SupportedImageFormat = 'jpeg' | 'png' | 'webp'
export type OutputImageFormat = 'jpeg' | 'png' | 'webp'

export interface CropRect {
  x: number
  y: number
  width: number
  height: number
}

export interface ImageTransformOptions {
  width: number
  height: number
  mimeType: 'image/png' | 'image/jpeg' | 'image/webp'
  quality?: number
  backgroundColor?: string
  crop?: CropRect
  rotation?: 0 | 90 | 180 | 270
}

export type ImageIssueCode =
  | 'emptyFile'
  | 'tooManyFiles'
  | 'fileTooLarge'
  | 'unsupportedSignature'
  | 'mimeMismatch'
  | 'extensionMismatch'
  | 'decodeFailed'
  | 'invalidDimensions'
  | 'edgeTooLarge'
  | 'pixelCountTooLarge'
  | 'memoryRisk'
  | 'cancelled'
  | 'canvasUnavailable'
  | 'encodeFailed'
  | 'unsupportedOutput'
  | 'invalidCrop'
  | 'workerFailed'
  | 'downloadFailed'

export interface ImageIssue {
  code: ImageIssueCode
  params?: Record<string, number | string>
}

export interface DecodedImage {
  source: ImageBitmap | HTMLImageElement
  width: number
  height: number
  dispose: () => void
}

export interface PreparedImage {
  id: string
  file: File
  format: SupportedImageFormat
  width: number
  height: number
  decoded: DecodedImage
  warnings: ImageIssue[]
}

export interface UploadFailure {
  id: string
  fileName: string
  issue: ImageIssue
}
