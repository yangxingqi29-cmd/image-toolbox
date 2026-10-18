import { describe, expect, it } from 'vitest'
import {
  calculateResizeDimensions,
  calculateSavings,
  fitCropToBounds,
  formatToExtension,
  rotatedDimensions,
} from '@/services/image/operations'

describe('stage 3 image operations', () => {
  it('keeps the original ratio when resizing by width or height', () => {
    expect(calculateResizeDimensions(4000, 3000, 1000, 900, true, 'width')).toEqual({
      width: 1000,
      height: 750,
    })
    expect(calculateResizeDimensions(4000, 3000, 1000, 600, true, 'height')).toEqual({
      width: 800,
      height: 600,
    })
  })

  it('allows intentional distortion when the ratio is unlocked', () => {
    expect(calculateResizeDimensions(4000, 3000, 640, 640, false)).toEqual({
      width: 640,
      height: 640,
    })
  })

  it('keeps crop rectangles inside the image', () => {
    expect(fitCropToBounds({ x: 900, y: -10, width: 300, height: 500 }, 1000, 800)).toEqual({
      x: 700,
      y: 0,
      width: 300,
      height: 500,
    })
  })

  it('swaps dimensions for quarter-turn rotation', () => {
    expect(rotatedDimensions(1200, 800, 90)).toEqual({ width: 800, height: 1200 })
    expect(rotatedDimensions(1200, 800, 180)).toEqual({ width: 1200, height: 800 })
  })

  it('reports honest file-size changes and output extensions', () => {
    expect(calculateSavings(1000, 700)).toBe(30)
    expect(calculateSavings(1000, 1200)).toBe(-20)
    expect(formatToExtension('jpeg')).toBe('jpg')
  })
})
