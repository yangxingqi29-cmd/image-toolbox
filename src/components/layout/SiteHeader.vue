<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { Languages, Menu, ShieldCheck, X } from '@lucide/vue'
import { useRoute } from 'vue-router'
import BrandLogo from '@/components/common/BrandLogo.vue'
import ThemeToggle from '@/components/common/ThemeToggle.vue'
import { isAppLocale, type AppLocale } from '@/types/locale'
import { localizedPath, switchLocalePath } from '@/utils/locale-route'

const route = useRoute()
const menuOpen = ref(false)

const locale = computed<AppLocale>(() =>
  isAppLocale(route.params.locale) ? route.params.locale : 'zh',
)
const alternateLocale = computed<AppLocale>(() => (locale.value === 'zh' ? 'en' : 'zh'))
const alternatePath = computed(() => switchLocalePath(route.fullPath, alternateLocale.value))

watch(
  () => route.fullPath,
  () => {
    menuOpen.value = false
  },
)
</script>

<template>
  <header class="site-header">
    <div class="container header-inner">
      <RouterLink class="brand" :to="localizedPath(locale)" :aria-label="$t('brand.name')">
        <BrandLogo />
      </RouterLink>

      <nav class="desktop-nav" :aria-label="$t('common.menu')">
        <RouterLink :to="localizedPath(locale)">{{ $t('nav.home') }}</RouterLink>
        <RouterLink :to="`${localizedPath(locale)}privacy/`">
          <ShieldCheck :size="17" aria-hidden="true" />
          {{ $t('nav.privacy') }}
        </RouterLink>
      </nav>

      <div class="header-actions">
        <RouterLink
          class="language-button"
          :to="alternatePath"
          :aria-label="$t('common.switchLanguage')"
        >
          <Languages :size="18" aria-hidden="true" />
          <span>{{ $t('common.language') }}</span>
        </RouterLink>
        <ThemeToggle />
        <button
          class="icon-button mobile-menu-button"
          type="button"
          :aria-label="menuOpen ? $t('common.closeMenu') : $t('common.menu')"
          :aria-expanded="menuOpen"
          @click="menuOpen = !menuOpen"
        >
          <X v-if="menuOpen" :size="20" aria-hidden="true" />
          <Menu v-else :size="20" aria-hidden="true" />
        </button>
      </div>
    </div>

    <nav v-if="menuOpen" class="mobile-nav container" :aria-label="$t('common.menu')">
      <RouterLink :to="localizedPath(locale)">{{ $t('nav.home') }}</RouterLink>
      <RouterLink :to="`${localizedPath(locale)}privacy/`">{{ $t('nav.privacy') }}</RouterLink>
      <RouterLink :to="`${localizedPath(locale)}about/`">{{ $t('nav.about') }}</RouterLink>
    </nav>
  </header>
</template>
