<script setup lang="ts">
import { onBeforeUnmount, ref, watchEffect } from 'vue'
import { drawWatermark, type WatermarkSettings } from '@/services/image/watermark'

const props = defineProps<{
  source: CanvasImageSource
  width: number
  height: number
  settings: WatermarkSettings
}>()
const canvas = ref<HTMLCanvasElement | null>(null)

watchEffect(() => {
  const target = canvas.value
  if (!target) return
  const scale = Math.min(1, 720 / Math.max(props.width, props.height))
  target.width = Math.max(1, Math.round(props.width * scale))
  target.height = Math.max(1, Math.round(props.height * scale))
  const context = target.getContext('2d')
  if (!context) return
  drawWatermark(context, props.source, target.width, target.height, {
    ...props.settings,
    imageWidth: props.settings.imageWidth
      ? props.settings.imageWidth * scale
      : props.settings.imageWidth,
    imageHeight: props.settings.imageHeight
      ? props.settings.imageHeight * scale
      : props.settings.imageHeight,
  })
})

onBeforeUnmount(() => {
  if (!canvas.value) return
  canvas.value.width = 0
  canvas.value.height = 0
})
</script>

<template>
  <canvas
    ref="canvas"
    class="watermark-preview-canvas"
    role="img"
    :aria-label="$t('watermark.previewLabel')"
  ></canvas>
</template>
