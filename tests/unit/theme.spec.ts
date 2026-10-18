import { describe, expect, it, vi } from 'vitest'
import { useTheme } from '@/composables/useTheme'

describe('theme preference', () => {
  it('toggles the document theme and persists the choice', () => {
    vi.stubGlobal(
      'matchMedia',
      vi.fn(() => ({ matches: false })),
    )
    const { initializeTheme, toggleTheme } = useTheme()

    initializeTheme()
    toggleTheme()

    expect(document.documentElement.dataset.theme).toBe('dark')
    expect(localStorage.getItem('image-toolbox-theme')).toBe('dark')
  })
})
