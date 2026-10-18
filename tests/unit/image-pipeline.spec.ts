import { afterEach, describe, expect, it, vi } from 'vitest'
import { createOutputName } from '@/services/export/download'
import { renderImageToBlob } from '@/services/image/canvas'
import { prepareImageFile } from '@/services/image/prepare'
import { processPreparedImage } from '@/services/image/processor'

const pngHeader = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('shared image pipeline', () => {
  it('prepares, renders, and names a real Blob output', async () => {
    const close = vi.fn()
    const bitmap = { width: 640, height: 480, close } as unknown as ImageBitmap
    vi.stubGlobal(
      'createImageBitmap',
      vi.fn(async () => bitmap),
    )

    const drawImage = vi.fn()
    const output = new Blob([new Uint8Array([9, 8, 7])], { type: 'image/png' })
    const fakeCanvas = {
      width: 0,
      height: 0,
      getContext: vi.fn(() => ({ drawImage, fillRect: vi.fn(), fillStyle: '' })),
      toBlob: vi.fn((callback: BlobCallback) => callback(output)),
    } as unknown as HTMLCanvasElement
    vi.spyOn(document, 'createElement').mockReturnValue(fakeCanvas)

    const file = new File([pngHeader], 'portrait.png', { type: 'image/png' })
    const prepared = await prepareImageFile(file)
    const blob = await renderImageToBlob(prepared.decoded.source, prepared.width, prepared.height, {
      mimeType: 'image/png',
    })

    expect(prepared).toMatchObject({ format: 'png', width: 640, height: 480 })
    expect(drawImage).toHaveBeenCalledWith(bitmap, 0, 0, 640, 480, 0, 0, 640, 480)
    expect(blob.type).toBe('image/png')
    expect(blob.size).toBe(3)
    expect(createOutputName(file.name, '-browser-copy', 'png')).toBe('portrait-browser-copy.png')
    expect(fakeCanvas.width).toBe(0)
    expect(fakeCanvas.height).toBe(0)

    prepared.decoded.dispose()
    expect(close).toHaveBeenCalledOnce()
  })

  it('sanitizes output file names', () => {
    expect(createOutputName('bad:name?.jpg', '-result', '.png')).toBe('bad-name--result.png')
  })

  it('falls back to Canvas when a worker cannot be initialized', async () => {
    vi.stubGlobal(
      'Worker',
      class {
        constructor() {
          throw new Error('worker unavailable')
        }
      },
    )
    vi.stubGlobal('OffscreenCanvas', class {})

    const drawImage = vi.fn()
    const output = new Blob([new Uint8Array([1, 2])], { type: 'image/jpeg' })
    const fakeCanvas = {
      width: 0,
      height: 0,
      getContext: vi.fn(() => ({ drawImage, fillRect: vi.fn(), fillStyle: '' })),
      toBlob: vi.fn((callback: BlobCallback) => callback(output)),
    } as unknown as HTMLCanvasElement
    vi.spyOn(document, 'createElement').mockReturnValue(fakeCanvas)

    const prepared = {
      id: 'fallback',
      file: new File([pngHeader], 'fallback.png', { type: 'image/png' }),
      format: 'png' as const,
      width: 100,
      height: 80,
      decoded: {
        source: {} as ImageBitmap,
        width: 100,
        height: 80,
        dispose: vi.fn(),
      },
      warnings: [],
    }
    const blob = await processPreparedImage(prepared, {
      width: 50,
      height: 40,
      mimeType: 'image/jpeg',
      quality: 0.8,
    })

    expect(blob).toBe(output)
    expect(drawImage).toHaveBeenCalled()
  })
})
