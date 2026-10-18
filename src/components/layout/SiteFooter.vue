<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import BrandLogo from '@/components/common/BrandLogo.vue'
import { isAppLocale, type AppLocale } from '@/types/locale'
import { localizedPath } from '@/utils/locale-route'

const route = useRoute()
const year = new Date().getFullYear()
const locale = computed<AppLocale>(() =>
  isAppLocale(route.params.locale) ? route.params.locale : 'zh',
)

function pagePath(page: string) {
  return `${localizedPath(locale.value)}${page}/`
}
</script>

<template>
  <footer class="site-footer">
    <div class="container footer-grid">
      <div class="footer-brand">
        <RouterLink class="brand" :to="localizedPath(locale)">
          <BrandLogo />
        </RouterLink>
        <p>{{ $t('footer.description') }}</p>
      </div>

      <div class="footer-column">
        <strong>{{ $t('footer.product') }}</strong>
        <RouterLink :to="localizedPath(locale, 'image-compressor')">
          {{ $t('tools.compressor.name') }}
        </RouterLink>
        <RouterLink :to="localizedPath(locale, 'id-photo')">
          {{ $t('tools.idPhoto.name') }}
        </RouterLink>
      </div>

      <div class="footer-column">
        <strong>{{ $t('footer.company') }}</strong>
        <RouterLink :to="pagePath('about')">{{ $t('footer.about') }}</RouterLink>
        <RouterLink :to="pagePath('privacy')">{{ $t('footer.privacy') }}</RouterLink>
        <RouterLink :to="pagePath('terms')">{{ $t('footer.terms') }}</RouterLink>
        <RouterLink :to="pagePath('contact')">{{ $t('footer.contact') }}</RouterLink>
      </div>
    </div>
    <div class="container footer-bottom">
      <span>{{ $t('footer.copyright', { year }) }}</span>
      <span>{{ $t('footer.motto') }}</span>
    </div>
  </footer>
</template>
