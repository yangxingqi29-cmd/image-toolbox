<script setup lang="ts">
import { computed } from 'vue'
import { Cookie } from '@lucide/vue'
import { adConsent, setAdConsent } from '@/services/ads/consent'

const adsConfigured =
  import.meta.env.VITE_ADSENSE_ENABLED === 'true' && Boolean(import.meta.env.VITE_ADSENSE_CLIENT)
const visible = computed(() => adsConfigured && adConsent.value === 'unknown')
</script>

<template>
  <aside v-if="visible" class="consent-banner" :aria-label="$t('ads.consentTitle')">
    <Cookie :size="22" aria-hidden="true" />
    <div>
      <strong>{{ $t('ads.consentTitle') }}</strong>
      <p>{{ $t('ads.consentDescription') }}</p>
    </div>
    <div class="consent-actions">
      <button class="button button--secondary" type="button" @click="setAdConsent('denied')">
        {{ $t('ads.essentialOnly') }}
      </button>
      <button class="button button--primary" type="button" @click="setAdConsent('granted')">
        {{ $t('ads.allow') }}
      </button>
    </div>
  </aside>
</template>
