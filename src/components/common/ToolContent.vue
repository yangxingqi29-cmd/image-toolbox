<script setup lang="ts">
import { computed } from 'vue'
import { ArrowRight, CircleHelp, ListChecks } from '@lucide/vue'
import { useRoute } from 'vue-router'
import AdSlot from '@/components/ads/AdSlot.vue'
import { tools } from '@/data/tools'
import { isAppLocale, type AppLocale } from '@/types/locale'
import { localizedPath } from '@/utils/locale-route'

const props = defineProps<{ toolId: string }>()
const route = useRoute()
const locale = computed<AppLocale>(() =>
  isAppLocale(route.params.locale) ? route.params.locale : 'zh',
)
const related = computed(() => tools.filter((tool) => tool.id !== props.toolId).slice(0, 3))
const contentKey = computed(() => `seo.tools.${props.toolId}`)
const contentAdSlot = import.meta.env.VITE_ADSENSE_SLOT_CONTENT || ''
</script>

<template>
  <section class="tool-content-section" :aria-labelledby="`${toolId}-guide-title`">
    <div class="tool-guide-grid">
      <div>
        <span class="eyebrow"><ListChecks :size="16" />{{ $t('seo.guideEyebrow') }}</span>
        <h2 :id="`${toolId}-guide-title`">{{ $t(`${contentKey}.guideTitle`) }}</h2>
        <p>{{ $t(`${contentKey}.intro`) }}</p>
        <dl class="format-details">
          <div>
            <dt>{{ $t('seo.input') }}</dt>
            <dd>{{ $t(`${contentKey}.input`) }}</dd>
          </div>
          <div>
            <dt>{{ $t('seo.output') }}</dt>
            <dd>{{ $t(`${contentKey}.output`) }}</dd>
          </div>
          <div>
            <dt>{{ $t('seo.limitations') }}</dt>
            <dd>{{ $t(`${contentKey}.limitations`) }}</dd>
          </div>
        </dl>
      </div>
      <ol class="tool-steps">
        <li v-for="step in 3" :key="step">
          <span>{{ step }}</span>
          <p>{{ $t(`${contentKey}.step${step}`) }}</p>
        </li>
      </ol>
    </div>

    <AdSlot :ad-slot="contentAdSlot" />

    <div class="tool-faq-block">
      <span class="eyebrow"><CircleHelp :size="16" />{{ $t('seo.faqEyebrow') }}</span>
      <h2>{{ $t('seo.faqTitle') }}</h2>
      <div class="faq-list">
        <details v-for="faq in 2" :key="faq" :open="faq === 1">
          <summary>{{ $t(`${contentKey}.faq${faq}Question`) }}</summary>
          <p>{{ $t(`${contentKey}.faq${faq}Answer`) }}</p>
        </details>
      </div>
    </div>

    <div class="related-tools">
      <h2>{{ $t('seo.relatedTitle') }}</h2>
      <div>
        <RouterLink v-for="tool in related" :key="tool.id" :to="localizedPath(locale, tool.slug)">
          <component :is="tool.icon" :size="20" />
          <span
            ><strong>{{ $t(`tools.${tool.id}.name`) }}</strong
            ><small>{{ $t(`tools.${tool.id}.description`) }}</small></span
          >
          <ArrowRight :size="18" />
        </RouterLink>
      </div>
    </div>
  </section>
</template>
