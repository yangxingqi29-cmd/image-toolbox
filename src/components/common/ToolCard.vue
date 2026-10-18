<script setup lang="ts">
import { ArrowUpRight } from '@lucide/vue'
import type { ToolDefinition } from '@/types/tool'
import type { AppLocale } from '@/types/locale'
import { localizedPath } from '@/utils/locale-route'

const props = defineProps<{
  tool: ToolDefinition
  locale: AppLocale
}>()
</script>

<template>
  <RouterLink class="tool-card" :to="localizedPath(props.locale, props.tool.slug)">
    <span class="tool-card__icon">
      <component :is="props.tool.icon" :size="24" :stroke-width="1.8" aria-hidden="true" />
    </span>
    <span class="tool-card__body">
      <span class="tool-card__meta">
        {{ $t(`categories.${props.tool.category}.name`) }}
        <span>·</span>
        {{ $t('common.available') }}
      </span>
      <strong>{{ $t(`tools.${props.tool.id}.name`) }}</strong>
      <span class="tool-card__description">{{ $t(`tools.${props.tool.id}.description`) }}</span>
    </span>
    <ArrowUpRight class="tool-card__arrow" :size="20" aria-hidden="true" />
  </RouterLink>
</template>
