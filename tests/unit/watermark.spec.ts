import { describe, expect, it, vi } from 'vitest'
import { drawWatermark } from '@/services/image/watermark'

function createContext() {
  return {
    drawImage: vi.fn(),
    measureText: vi.fn(() => ({ width: 160 })),
    fillText: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
    translate: vi.fn(),
    rotate: vi.fn(),
    globalAlpha: 1,
    fillStyle: '',
    font: '',
    textAlign: 'start',
    textBaseline: 'alphabetic',
  } as unknown as CanvasRenderingContext2D
}

describe('watermark composition', () => {
  it('draws one positioned text watermark', () => {
    const context = createContext()
    drawWatermark(context, {} as ImageBitmap, 1200, 800, {
      mode: 'text',
      text: 'Sample',
      color: '#ffffff',
      sizePercent: 8,
      opacity: 0.6,
      rotation: -20,
      position: 'bottomRight',
      tile: false,
    })
    expect(context.drawImage).toHaveBeenCalledOnce()
    expect(context.fillText).toHaveBeenCalledOnce()
    expect(context.rotate).toHaveBeenCalledWith((-20 * Math.PI) / 180)
  })

  it('repeats text across the image when tiling is enabled', () => {
    const context = createContext()
    drawWatermark(context, {} as ImageBitmap, 1200, 800, {
      mode: 'text',
      text: 'Sample',
      color: '#ffffff',
      sizePercent: 8,
      opacity: 0.5,
      rotation: -25,
      position: 'center',
      tile: true,
    })
    expect(vi.mocked(context.fillText).mock.calls.length).toBeGreaterThan(4)
  })
})
