<script setup lang="ts">
import { onBeforeUnmount, ref, watchEffect } from 'vue'
import { drawIdPhoto } from '@/services/image/id-photo'
import type { IdPhotoTransform, OutfitTransform } from '@/types/id-photo'

const props = defineProps<{
  source: CanvasImageSource
  sourceWidth: number
  sourceHeight: number
  outputWidth: number
  outputHeight: number
  backgroundColor: string | null
  transform: IdPhotoTransform
  outfitSource?: CanvasImageSource
  outfitWidth?: number
  outfitHeight?: number
  outfitTransform?: OutfitTransform
}>()
const canvas = ref<HTMLCanvasElement | null>(null)

watchEffect(() => {
  const target = canvas.value
  if (!target) return
  const scale = Math.min(1, 520 / Math.max(props.outputWidth, props.outputHeight))
  target.width = Math.max(1, Math.round(props.outputWidth * scale))
  target.height = Math.max(1, Math.round(props.outputHeight * scale))
  const context = target.getContext('2d')
  if (!context) return

  drawIdPhoto(context, props.source, props.sourceWidth, props.sourceHeight, {
    width: target.width,
    height: target.height,
    backgroundColor: props.backgroundColor,
    mimeType: props.backgroundColor ? 'image/jpeg' : 'image/png',
    transform: props.transform,
    outfit:
      props.outfitSource && props.outfitWidth && props.outfitHeight && props.outfitTransform
        ? {
            source: props.outfitSource,
            width: props.outfitWidth,
            height: props.outfitHeight,
            transform: props.outfitTransform,
          }
        : undefined,
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
    class="id-photo-preview-canvas"
    role="img"
    :aria-label="$t('idPhoto.previewLabel')"
  ></canvas>
</template>
