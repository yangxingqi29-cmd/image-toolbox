<script setup lang="ts">
import { computed, defineAsyncComponent } from 'vue'
import { ArrowLeft, Clock3 } from '@lucide/vue'
import { useRoute } from 'vue-router'
import ToolContent from '@/components/common/ToolContent.vue'
import BatchImageTool from '@/features/shared/BatchImageTool.vue'
import { tools } from '@/data/tools'
import { isAppLocale, type AppLocale } from '@/types/locale'
import { localizedPath } from '@/utils/locale-route'

const props = defineProps<{ toolId: string }>()
const route = useRoute()
const locale = computed<AppLocale>(() =>
  isAppLocale(route.params.locale) ? route.params.locale : 'zh',
)
const tool = computed(() => tools.find((item) => item.id === props.toolId) ?? tools[0])
const activeToolIds = [
  'compressor',
  'converter',
  'resizer',
  'cropper',
  'idPhoto',
  'watermark',
  'imageToPdf',
]
const isActive = computed(() => activeToolIds.includes(tool.value.id))
const batchMode = computed<'compressor' | 'converter' | 'resizer'>(() => {
  if (tool.value.id === 'converter' || tool.value.id === 'resizer') return tool.value.id
  return 'compressor'
})
const CropperTool = defineAsyncComponent(() => import('@/features/cropper/CropperTool.vue'))
const IdPhotoTool = defineAsyncComponent(() => import('@/features/id-photo/IdPhotoTool.vue'))
const WatermarkTool = defineAsyncComponent(() => import('@/features/watermark/WatermarkTool.vue'))
const ImageToPdfTool = defineAsyncComponent(
  () => import('@/features/image-to-pdf/ImageToPdfTool.vue'),
)
</script>

<template>
  <section class="page-hero" :class="{ 'page-hero--compact': isActive }">
    <div class="container narrow-container">
      <span class="eyebrow">
        <component :is="isActive ? tool.icon : Clock3" :size="16" />
        {{ $t(isActive ? 'toolIntro.readyEyebrow' : 'toolIntro.comingEyebrow') }}
      </span>
      <div class="page-icon"><component :is="tool.icon" :size="32" /></div>
      <h1>{{ $t(`tools.${tool.id}.name`) }}</h1>
      <p>{{ $t(`tools.${tool.id}.description`) }}</p>
      <div v-if="!isActive" class="page-actions">
        <RouterLink class="button button--primary" :to="localizedPath(locale)">
          <ArrowLeft :size="18" />{{ $t('common.backHome') }}
        </RouterLink>
      </div>
    </div>
  </section>
  <div v-if="isActive" class="container workbench-container">
    <CropperTool v-if="tool.id === 'cropper'" />
    <IdPhotoTool v-else-if="tool.id === 'idPhoto'" />
    <WatermarkTool v-else-if="tool.id === 'watermark'" />
    <ImageToPdfTool v-else-if="tool.id === 'imageToPdf'" />
    <BatchImageTool v-else :mode="batchMode" />
    <ToolContent :tool-id="tool.id" />
  </div>
</template>
