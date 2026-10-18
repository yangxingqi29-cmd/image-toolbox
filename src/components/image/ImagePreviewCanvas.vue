<script setup lang="ts">
import { onBeforeUnmount, ref, watchEffect } from 'vue'

const props = defineProps<{
  source: CanvasImageSource
  width: number
  height: number
  alt: string
}>()

const canvas = ref<HTMLCanvasElement | null>(null)

watchEffect(() => {
  const target = canvas.value
  if (!target) return

  const maxPreviewEdge = 720
  const scale = Math.min(1, maxPreviewEdge / Math.max(props.width, props.height))
  target.width = Math.max(1, Math.round(props.width * scale))
  target.height = Math.max(1, Math.round(props.height * scale))
  target.getContext('2d')?.drawImage(props.source, 0, 0, target.width, target.height)
})

onBeforeUnmount(() => {
  if (!canvas.value) return
  canvas.value.width = 0
  canvas.value.height = 0
})
</script>

<template>
  <canvas ref="canvas" class="prepared-image-preview" role="img" :aria-label="alt"></canvas>
</template>
