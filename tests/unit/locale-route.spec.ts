import { describe, expect, it } from 'vitest'
import { localizedPath, switchLocalePath } from '@/utils/locale-route'

describe('localized route helpers', () => {
  it('builds language-prefixed routes with trailing slashes', () => {
    expect(localizedPath('zh')).toBe('/zh/')
    expect(localizedPath('en', 'image-compressor')).toBe('/en/image-compressor/')
  })

  it('switches only the locale and preserves page state in the URL', () => {
    expect(switchLocalePath('/zh/image-resizer/?width=640#preview', 'en')).toBe(
      '/en/image-resizer/?width=640#preview',
    )
  })

  it('falls back to the target locale home for an unknown path', () => {
    expect(switchLocalePath('/legacy-tool/', 'zh')).toBe('/zh/')
  })
})
