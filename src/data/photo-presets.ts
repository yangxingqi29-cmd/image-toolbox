import type { PhotoPreset } from '@/types/id-photo'

export function millimetersToPixels(millimeters: number, dpi: number): number {
  if (!Number.isFinite(millimeters) || !Number.isFinite(dpi) || millimeters <= 0 || dpi <= 0) {
    return 0
  }
  return Math.round((millimeters / 25.4) * dpi)
}

export const PHOTO_PRESETS: PhotoPreset[] = [
  {
    id: 'oneInch',
    widthMm: 25,
    heightMm: 35,
    dpi: 300,
    widthPx: 295,
    heightPx: 413,
  },
  {
    id: 'twoInch',
    widthMm: 35,
    heightMm: 53,
    dpi: 300,
    widthPx: 413,
    heightPx: 626,
  },
  {
    id: 'smallTwoInch',
    widthMm: 35,
    heightMm: 45,
    dpi: 300,
    widthPx: 413,
    heightPx: 531,
  },
  {
    id: 'custom',
    widthMm: 25,
    heightMm: 35,
    dpi: 300,
    widthPx: 295,
    heightPx: 413,
  },
]
