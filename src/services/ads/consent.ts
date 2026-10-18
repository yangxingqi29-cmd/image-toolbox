import { ref } from 'vue'

export type AdConsent = 'unknown' | 'granted' | 'denied'

const STORAGE_KEY = 'image-toolbox-ad-consent'
const initial = (() => {
  try {
    const value = localStorage.getItem(STORAGE_KEY)
    return value === 'granted' || value === 'denied' ? value : 'unknown'
  } catch {
    return 'unknown'
  }
})()

export const adConsent = ref<AdConsent>(initial)

export function setAdConsent(value: Exclude<AdConsent, 'unknown'>) {
  adConsent.value = value
  try {
    localStorage.setItem(STORAGE_KEY, value)
  } catch {
    // 隐私模式下存储可能不可用；保留当前标签页内的选择即可。
  }
}
