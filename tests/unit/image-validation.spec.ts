import { describe, expect, it } from 'vitest'
import { validateImageDimensions } from '@/services/image/dimensions'
import { ImageProcessingError } from '@/services/image/errors'
import { detectImageFormat, inspectImageFile } from '@/services/image/file-format'

const pngHeader = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]

describe('image file validation', () => {
  it('detects supported formats from bytes instead of the extension', () => {
    expect(detectImageFormat(new Uint8Array([0xff, 0xd8, 0xff, 0x00]))).toBe('jpeg')
    expect(detectImageFormat(new Uint8Array(pngHeader))).toBe('png')
    expect(
      detectImageFormat(
        new Uint8Array([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50]),
      ),
    ).toBe('webp')
  })

  it('rejects a renamed non-image file', async () => {
    const file = new File([new Uint8Array([1, 2, 3, 4])], 'fake.png', { type: 'image/png' })
    await expect(inspectImageFile(file)).rejects.toMatchObject({
      issue: { code: 'unsupportedSignature' },
    })
  })

  it('reports MIME and extension mismatches without hiding the real format', async () => {
    const file = new File([new Uint8Array(pngHeader)], 'photo.jpg', { type: 'image/jpeg' })
    const result = await inspectImageFile(file)

    expect(result.format).toBe('png')
    expect(result.warnings.map((warning) => warning.code)).toEqual([
      'mimeMismatch',
      'extensionMismatch',
    ])
  })

  it('blocks unsafe pixel dimensions', () => {
    expect(() => validateImageDimensions(8000, 6000)).toThrowError(ImageProcessingError)
    expect(() => validateImageDimensions(4000, 3000)).not.toThrow()
  })
})
