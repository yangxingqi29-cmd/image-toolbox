<script setup lang="ts">
import { onMounted } from 'vue'
import CookieConsent from '@/components/ads/CookieConsent.vue'
import SiteFooter from '@/components/layout/SiteFooter.vue'
import SiteHeader from '@/components/layout/SiteHeader.vue'
import { useTheme } from '@/composables/useTheme'

const { initializeTheme } = useTheme()

onMounted(initializeTheme)
</script>

<template>
  <div class="app-shell">
    <a class="skip-link" href="#main-content">{{ $t('common.skipToContent') }}</a>
    <SiteHeader />
    <main id="main-content">
      <RouterView />
    </main>
    <SiteFooter />
    <CookieConsent />
  </div>
</template>
