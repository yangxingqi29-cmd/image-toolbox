import { describe, expect, it, vi } from 'vitest'
import { millimetersToPixels, PHOTO_PRESETS } from '@/data/photo-presets'
import { drawIdPhoto } from '@/services/image/id-photo'

describe('ID photo sizing and composition', () => {
  it('converts millimeters to the documented 300 DPI pixel sizes', () => {
    expect(millimetersToPixels(25, 300)).toBe(295)
    expect(millimetersToPixels(35, 300)).toBe(413)
    expect(millimetersToPixels(45, 300)).toBe(531)
    expect(PHOTO_PRESETS.find((preset) => preset.id === 'twoInch')).toMatchObject({
      widthPx: 413,
      heightPx: 626,
    })
  })

  it('draws the selected background and applies subject transforms', () => {
    const context = {
      fillStyle: '',
      fillRect: vi.fn(),
      clearRect: vi.fn(),
      drawImage: vi.fn(),
      save: vi.fn(),
      beginPath: vi.fn(),
      rect: vi.fn(),
      clip: vi.fn(),
      restore: vi.fn(),
    } as unknown as CanvasRenderingContext2D
    const source = {} as ImageBitmap

    drawIdPhoto(context, source, 400, 600, {
      width: 300,
      height: 400,
      backgroundColor: '#ffffff',
      mimeType: 'image/jpeg',
      transform: { zoom: 1.2, offsetX: 0.1, offsetY: -0.1 },
    })

    expect(context.fillRect).toHaveBeenCalledWith(0, 0, 300, 400)
    expect(context.drawImage).toHaveBeenCalledOnce()
    const call = vi.mocked(context.drawImage).mock.calls[0]
    expect(call[3]).toBeGreaterThan(300)
    expect(call[4]).toBeGreaterThan(400)
  })

  it('composites the selected outfit over the positioned subject', () => {
    const context = {
      fillStyle: '',
      fillRect: vi.fn(),
      clearRect: vi.fn(),
      drawImage: vi.fn(),
      save: vi.fn(),
      beginPath: vi.fn(),
      rect: vi.fn(),
      clip: vi.fn(),
      restore: vi.fn(),
    } as unknown as CanvasRenderingContext2D

    drawIdPhoto(context, {} as ImageBitmap, 400, 600, {
      width: 300,
      height: 400,
      backgroundColor: '#438edb',
      mimeType: 'image/png',
      transform: { zoom: 1, offsetX: 0, offsetY: 0 },
      outfit: {
        source: {} as ImageBitmap,
        width: 1000,
        height: 1000,
        transform: { scale: 1.3, offsetY: 0.38 },
      },
    })

    expect(context.drawImage).toHaveBeenCalledTimes(3)
    const outfitCall = vi.mocked(context.drawImage).mock.calls[1]
    expect(outfitCall[1]).toBeLessThan(0)
    expect(outfitCall[2]).toBe(152)
    expect(outfitCall[3]).toBe(390)
    expect(context.rect).toHaveBeenCalledWith(0, 0, 300, 280)
  })
})
