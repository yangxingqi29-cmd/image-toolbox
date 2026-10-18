<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { fitCropToBounds, rotatedDimensions } from '@/services/image/operations'
import type { CropRect } from '@/types/image'

const props = defineProps<{
  source: CanvasImageSource
  imageWidth: number
  imageHeight: number
  rotation: 0 | 90 | 180 | 270
  ratio: number | null
  zoom: number
}>()
const emit = defineEmits<{ 'update:crop': [crop: CropRect] }>()
const canvas = ref<HTMLCanvasElement | null>(null)
const crop = ref<CropRect>({ x: 0, y: 0, width: 1, height: 1 })
const drag = ref<
  { mode: 'move' | 'resize'; startX: number; startY: number; initial: CropRect } | undefined
>()

const rotatedSize = computed(() =>
  rotatedDimensions(props.imageWidth, props.imageHeight, props.rotation),
)

function initialCrop(): CropRect {
  const { width, height } = rotatedSize.value
  const safeZoom = Math.min(4, Math.max(1, props.zoom))
  let cropWidth = width / safeZoom
  let cropHeight = height / safeZoom

  if (props.ratio) {
    if (cropWidth / cropHeight > props.ratio) cropWidth = cropHeight * props.ratio
    else cropHeight = cropWidth / props.ratio
  }

  return fitCropToBounds(
    {
      x: (width - cropWidth) / 2,
      y: (height - cropHeight) / 2,
      width: cropWidth,
      height: cropHeight,
    },
    width,
    height,
  )
}

function scaleForCanvas(): number {
  const { width, height } = rotatedSize.value
  return Math.min(1, 760 / width, 520 / height)
}

function draw() {
  const target = canvas.value
  if (!target) return
  const scale = scaleForCanvas()
  const { width, height } = rotatedSize.value
  target.width = Math.max(1, Math.round(width * scale))
  target.height = Math.max(1, Math.round(height * scale))
  const context = target.getContext('2d')
  if (!context) return

  context.save()
  context.translate(target.width / 2, target.height / 2)
  context.rotate((props.rotation * Math.PI) / 180)
  context.drawImage(
    props.source,
    (-props.imageWidth * scale) / 2,
    (-props.imageHeight * scale) / 2,
    props.imageWidth * scale,
    props.imageHeight * scale,
  )
  context.restore()

  const displayCrop = {
    x: crop.value.x * scale,
    y: crop.value.y * scale,
    width: crop.value.width * scale,
    height: crop.value.height * scale,
  }
  context.fillStyle = 'rgba(9, 17, 14, 0.56)'
  context.fillRect(0, 0, target.width, displayCrop.y)
  context.fillRect(0, displayCrop.y, displayCrop.x, displayCrop.height)
  context.fillRect(
    displayCrop.x + displayCrop.width,
    displayCrop.y,
    target.width - displayCrop.x - displayCrop.width,
    displayCrop.height,
  )
  context.fillRect(
    0,
    displayCrop.y + displayCrop.height,
    target.width,
    target.height - displayCrop.y - displayCrop.height,
  )
  context.strokeStyle = '#ffffff'
  context.lineWidth = 2
  context.strokeRect(
    displayCrop.x + 1,
    displayCrop.y + 1,
    displayCrop.width - 2,
    displayCrop.height - 2,
  )

  const handleSize = 14
  context.fillStyle = '#ffffff'
  context.fillRect(
    displayCrop.x + displayCrop.width - handleSize,
    displayCrop.y + displayCrop.height - handleSize,
    handleSize,
    handleSize,
  )
}

function updateCrop(next: CropRect) {
  crop.value = fitCropToBounds(next, rotatedSize.value.width, rotatedSize.value.height)
  emit('update:crop', crop.value)
  draw()
}

function resetCrop() {
  updateCrop(initialCrop())
}

function pointFromEvent(event: PointerEvent): { x: number; y: number } {
  const target = canvas.value!
  const bounds = target.getBoundingClientRect()
  const scaleX = target.width / bounds.width
  const scaleY = target.height / bounds.height
  const scale = scaleForCanvas()
  return {
    x: ((event.clientX - bounds.left) * scaleX) / scale,
    y: ((event.clientY - bounds.top) * scaleY) / scale,
  }
}

function pointerDown(event: PointerEvent) {
  const target = canvas.value
  if (!target) return
  const point = pointFromEvent(event)
  const handleRange = 28 / scaleForCanvas()
  const right = crop.value.x + crop.value.width
  const bottom = crop.value.y + crop.value.height
  const nearHandle =
    Math.abs(point.x - right) <= handleRange && Math.abs(point.y - bottom) <= handleRange
  const inside =
    point.x >= crop.value.x && point.x <= right && point.y >= crop.value.y && point.y <= bottom

  if (!inside && !nearHandle) return
  drag.value = {
    mode: nearHandle ? 'resize' : 'move',
    startX: point.x,
    startY: point.y,
    initial: { ...crop.value },
  }
  target.setPointerCapture(event.pointerId)
}

function pointerMove(event: PointerEvent) {
  if (!drag.value) return
  const point = pointFromEvent(event)
  const dx = point.x - drag.value.startX
  const dy = point.y - drag.value.startY
  const initial = drag.value.initial

  if (drag.value.mode === 'move') {
    updateCrop({ ...initial, x: initial.x + dx, y: initial.y + dy })
    return
  }

  let width = Math.max(24, initial.width + dx)
  let height = Math.max(24, initial.height + dy)
  width = Math.min(width, rotatedSize.value.width - initial.x)
  height = Math.min(height, rotatedSize.value.height - initial.y)
  if (props.ratio) {
    height = width / props.ratio
    if (initial.y + height > rotatedSize.value.height) {
      height = rotatedSize.value.height - initial.y
      width = height * props.ratio
    }
  }
  updateCrop({ ...initial, width, height })
}

function pointerUp(event: PointerEvent) {
  canvas.value?.releasePointerCapture(event.pointerId)
  drag.value = undefined
}

watch(
  () => [props.source, props.rotation, props.ratio, props.zoom],
  async () => {
    await nextTick()
    resetCrop()
  },
  { immediate: true },
)

onBeforeUnmount(() => {
  if (!canvas.value) return
  canvas.value.width = 0
  canvas.value.height = 0
})

defineExpose({ resetCrop })
</script>

<template>
  <div class="interactive-cropper">
    <canvas
      ref="canvas"
      role="img"
      :aria-label="$t('phase3.cropper.canvasLabel')"
      @pointerdown="pointerDown"
      @pointermove="pointerMove"
      @pointerup="pointerUp"
      @pointercancel="pointerUp"
    ></canvas>
    <p>{{ $t('phase3.cropper.dragHint') }}</p>
  </div>
</template>
