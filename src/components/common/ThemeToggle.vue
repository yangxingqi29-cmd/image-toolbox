<script setup lang="ts">
import { Moon, Sun } from '@lucide/vue'
import { useTheme } from '@/composables/useTheme'

const { isDark, toggleTheme } = useTheme()
</script>

<template>
  <button
    class="icon-button"
    type="button"
    :aria-label="isDark ? $t('common.lightMode') : $t('common.darkMode')"
    :title="isDark ? $t('common.lightMode') : $t('common.darkMode')"
    @click="toggleTheme"
  >
    <Sun v-if="isDark" :size="19" aria-hidden="true" />
    <Moon v-else :size="19" aria-hidden="true" />
  </button>
</template>
