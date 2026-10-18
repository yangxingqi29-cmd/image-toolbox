<script setup lang="ts">
import { computed } from 'vue'
import { ArrowLeft } from '@lucide/vue'
import { useRoute } from 'vue-router'
import { isAppLocale, type AppLocale } from '@/types/locale'
import { localizedPath } from '@/utils/locale-route'

const route = useRoute()
const allowedPages = ['about', 'privacy', 'terms', 'contact'] as const
const locale = computed<AppLocale>(() =>
  isAppLocale(route.params.locale) ? route.params.locale : 'zh',
)
const page = computed(() => {
  const value = route.params.page
  return typeof value === 'string' && allowedPages.includes(value as (typeof allowedPages)[number])
    ? value
    : 'about'
})
</script>

<template>
  <section class="page-hero">
    <div class="container narrow-container legal-page">
      <span class="eyebrow">Image Toolbox</span>
      <h1>{{ $t(`pages.${page}.title`) }}</h1>
      <p>{{ $t(`pages.${page}.description`) }}</p>
      <div class="legal-sections">
        <section v-for="index in 3" :key="index">
          <h2>{{ $t(`pages.${page}.section${index}Title`) }}</h2>
          <p>{{ $t(`pages.${page}.section${index}Body`) }}</p>
        </section>
      </div>
      <RouterLink class="button button--primary" :to="localizedPath(locale)">
        <ArrowLeft :size="18" />{{ $t('common.backHome') }}
      </RouterLink>
    </div>
  </section>
</template>
