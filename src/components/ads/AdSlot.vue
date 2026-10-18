<script setup lang="ts">
import { computed, nextTick, onMounted, watch } from 'vue'
import { adConsent } from '@/services/ads/consent'

const props = defineProps<{ adSlot: string }>()
const client = import.meta.env.VITE_ADSENSE_CLIENT || ''
const enabled =
  import.meta.env.VITE_ADSENSE_ENABLED === 'true' && Boolean(client) && Boolean(props.adSlot)
const shouldRender = computed(() => enabled && adConsent.value === 'granted')

let scriptPromise: Promise<void> | undefined

function loadScript(): Promise<void> {
  if (scriptPromise) return scriptPromise
  scriptPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>('script[data-image-toolbox-adsense]')
    if (existing) {
      resolve()
      return
    }
    const script = document.createElement('script')
    script.async = true
    script.crossOrigin = 'anonymous'
    script.dataset.imageToolboxAdsense = 'true'
    script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(client)}`
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('adsenseLoadFailed'))
    document.head.append(script)
  })
  return scriptPromise
}

async function requestAd() {
  if (!shouldRender.value) return
  try {
    await loadScript()
    await nextTick()
    window.adsbygoogle = window.adsbygoogle || []
    window.adsbygoogle.push({})
  } catch {
    // 广告加载失败时保持广告位为空，不影响任何工具操作。
  }
}

watch(shouldRender, requestAd)
onMounted(requestAd)
</script>

<template>
  <div v-if="shouldRender" class="ad-slot" aria-label="Advertisement">
    <ins
      class="adsbygoogle"
      style="display: block"
      :data-ad-client="client"
      :data-ad-slot="adSlot"
      data-ad-format="auto"
      data-full-width-responsive="true"
    ></ins>
  </div>
</template>
