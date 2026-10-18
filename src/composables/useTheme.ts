import { computed, ref } from 'vue'

export type ThemePreference = 'light' | 'dark'

const STORAGE_KEY = 'image-toolbox-theme'
const theme = ref<ThemePreference>('light')
let initialized = false

function applyTheme(value: ThemePreference) {
  document.documentElement.dataset.theme = value
  document.documentElement.style.colorScheme = value
}

export function useTheme() {
  function initializeTheme() {
    if (initialized) return

    const saved = localStorage.getItem(STORAGE_KEY)
    const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches
    theme.value = saved === 'dark' || saved === 'light' ? saved : prefersDark ? 'dark' : 'light'
    applyTheme(theme.value)
    initialized = true
  }

  function toggleTheme() {
    theme.value = theme.value === 'dark' ? 'light' : 'dark'
    localStorage.setItem(STORAGE_KEY, theme.value)
    applyTheme(theme.value)
  }

  return {
    theme: computed(() => theme.value),
    isDark: computed(() => theme.value === 'dark'),
    initializeTheme,
    toggleTheme,
  }
}
