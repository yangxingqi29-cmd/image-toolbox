export interface PhotoPreset {
  id: 'oneInch' | 'twoInch' | 'smallTwoInch' | 'custom'
  widthMm: number
  heightMm: number
  dpi: number
  widthPx: number
  heightPx: number
}

export interface SegmentedPortrait {
  source: HTMLCanvasElement
  width: number
  height: number
  dispose: () => void
}

export interface IdPhotoTransform {
  zoom: number
  offsetX: number
  offsetY: number
}

export interface OutfitTransform {
  scale: number
  offsetY: number
}

export interface OutfitDefinition {
  id: 'none' | 'navySuit' | 'womenBlazer' | 'whiteShirt' | 'blueShirtTie'
  src?: string
  defaultScale: number
  defaultOffsetY: number
}

export interface AiProgress {
  status: string
  progress?: number
}
