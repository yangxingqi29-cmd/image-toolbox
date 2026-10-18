<script setup lang="ts">
import { computed, onBeforeUnmount, reactive, ref, watch } from 'vue'
import {
  AlertCircle,
  CheckCircle2,
  Download,
  LoaderCircle,
  RotateCw,
  Scissors,
  Trash2,
  X,
} from '@lucide/vue'
import ImageUploader from '@/components/upload/ImageUploader.vue'
import InteractiveCropper from './InteractiveCropper.vue'
import { useImageFiles } from '@/composables/useImageFiles'
import { createOutputName, downloadBlob } from '@/services/export/download'
import { toImageIssue } from '@/services/image/errors'
import { formatFileSize } from '@/services/image/limits'
import { formatToExtension, formatToMimeType } from '@/services/image/operations'
import { processPreparedImage } from '@/services/image/processor'
import type { CropRect, ImageIssue, OutputImageFormat } from '@/types/image'

const { items, failures, pendingCount, isLoading, addFiles, dismissFailure, clearAll } =
  useImageFiles()
const ratioPreset = ref('free')
const customRatioWidth = ref(5)
const customRatioHeight = ref(4)
const zoom = ref(1)
const rotation = ref<0 | 90 | 180 | 270>(0)
const outputFormat = ref<OutputImageFormat>('jpeg')
const quality = ref(92)
const backgroundColor = ref('#ffffff')
const crop = ref<CropRect>({ x: 0, y: 0, width: 1, height: 1 })
const status = reactive<{
  state: 'idle' | 'processing' | 'success' | 'error'
  blob?: Blob
  outputName?: string
  issue?: ImageIssue
}>({ state: 'idle' })
let controller: AbortController | undefined

const item = computed(() => items.value[0])
const ratio = computed<number | null>(() => {
  if (ratioPreset.value === 'free') return null
  if (ratioPreset.value === 'custom') {
    return Math.max(1, customRatioWidth.value) / Math.max(1, customRatioHeight.value)
  }
  const [width, height] = ratioPreset.value.split(':').map(Number)
  return width / height
})

function issueKey(issue: ImageIssue): string {
  return `phase2.errors.${issue.code}`
}

async function receiveFiles(files: File[]) {
  clearResult()
  clearAll()
  await addFiles(files.slice(0, 1))
  zoom.value = 1
  rotation.value = 0
}

function clearResult() {
  controller?.abort()
  controller = undefined
  status.state = 'idle'
  delete status.blob
  delete status.outputName
  delete status.issue
}

function clearWorkbench() {
  clearResult()
  clearAll()
}

function rotate() {
  rotation.value = ((rotation.value + 90) % 360) as 0 | 90 | 180 | 270
}

function cancelExport() {
  controller?.abort()
}

function updateCrop(nextCrop: CropRect) {
  crop.value = nextCrop
  if (status.state === 'success' || status.state === 'error') clearResult()
}

async function exportCrop() {
  if (!item.value || status.state === 'processing') return
  clearResult()
  controller = new AbortController()
  status.state = 'processing'

  try {
    const mimeType = formatToMimeType(outputFormat.value)
    const width = Math.max(1, Math.round(crop.value.width))
    const height = Math.max(1, Math.round(crop.value.height))
    const blob = await processPreparedImage(
      item.value,
      {
        width,
        height,
        mimeType,
        quality: outputFormat.value === 'png' ? undefined : quality.value / 100,
        backgroundColor: outputFormat.value === 'jpeg' ? backgroundColor.value : undefined,
        crop: crop.value,
        rotation: rotation.value,
      },
      controller.signal,
    )
    status.state = 'success'
    status.blob = blob
    status.outputName = createOutputName(
      item.value.file.name,
      '-cropped',
      formatToExtension(outputFormat.value),
    )
  } catch (error) {
    const issue = toImageIssue(error)
    status.state = issue.code === 'cancelled' ? 'idle' : 'error'
    status.issue = issue
  } finally {
    controller = undefined
  }
}

function download() {
  if (status.blob && status.outputName) downloadBlob(status.blob, status.outputName)
}

watch(
  [
    ratioPreset,
    customRatioWidth,
    customRatioHeight,
    zoom,
    rotation,
    outputFormat,
    quality,
    backgroundColor,
  ],
  clearResult,
)

onBeforeUnmount(clearResult)
</script>

<template>
  <section class="tool-workbench" aria-labelledby="cropper-workbench-title">
    <header class="workbench-title-row">
      <div>
        <span class="eyebrow">{{ $t('phase3.cropper.eyebrow') }}</span>
        <h2 id="cropper-workbench-title">{{ $t('phase3.cropper.title') }}</h2>
        <p>{{ $t('phase3.cropper.description') }}</p>
      </div>
      <button v-if="item" class="button button--secondary" type="button" @click="clearWorkbench">
        <Trash2 :size="17" />{{ $t('phase3.actions.clear') }}
      </button>
    </header>

    <div class="feature-strip" aria-label="features">
      <span><CheckCircle2 :size="16" />{{ $t('phase3.cropper.feature1') }}</span>
      <span><CheckCircle2 :size="16" />{{ $t('phase3.cropper.feature2') }}</span>
      <span><CheckCircle2 :size="16" />{{ $t('phase3.cropper.feature3') }}</span>
    </div>

    <ImageUploader v-if="!item" :multiple="false" @files="receiveFiles" />
    <div v-if="isLoading" class="processing-banner" role="status">
      <LoaderCircle class="spin" :size="19" />{{
        $t('phase3.status.preparing', { count: pendingCount })
      }}
    </div>
    <div v-if="failures.length" class="upload-failures">
      <article v-for="failure in failures" :key="failure.id" class="upload-failure">
        <AlertCircle :size="19" />
        <span
          ><strong>{{ failure.fileName }}</strong
          >{{ $t(issueKey(failure.issue), failure.issue.params ?? {}) }}</span
        >
        <button type="button" @click="dismissFailure(failure.id)"><X :size="17" /></button>
      </article>
    </div>

    <div v-if="item" class="cropper-layout">
      <div class="cropper-stage">
        <InteractiveCropper
          :source="item.decoded.source"
          :image-width="item.width"
          :image-height="item.height"
          :rotation="rotation"
          :ratio="ratio"
          :zoom="zoom"
          @update:crop="updateCrop"
        />
        <div class="crop-file-meta">
          <strong>{{ item.file.name }}</strong>
          <span>{{ item.width }} × {{ item.height }} · {{ formatFileSize(item.file.size) }}</span>
        </div>
      </div>

      <aside class="cropper-sidebar">
        <div class="control-group">
          <label>{{ $t('phase3.cropper.ratio') }}</label>
          <select v-model="ratioPreset">
            <option value="free">{{ $t('phase3.cropper.free') }}</option>
            <option value="1:1">1:1</option>
            <option value="4:3">4:3</option>
            <option value="3:4">3:4</option>
            <option value="16:9">16:9</option>
            <option value="custom">{{ $t('phase3.cropper.custom') }}</option>
          </select>
        </div>
        <div v-if="ratioPreset === 'custom'" class="ratio-inputs">
          <input v-model.number="customRatioWidth" type="number" min="1" />
          <span>:</span>
          <input v-model.number="customRatioHeight" type="number" min="1" />
        </div>
        <label class="range-control">
          <span
            >{{ $t('phase3.cropper.zoom') }} <strong>{{ zoom.toFixed(1) }}×</strong></span
          >
          <input v-model.number="zoom" type="range" min="1" max="4" step="0.1" />
        </label>
        <button class="button button--secondary full-width" type="button" @click="rotate">
          <RotateCw :size="17" />{{ $t('phase3.cropper.rotate') }} · {{ rotation }}°
        </button>
        <div class="control-group">
          <label>{{ $t('phase3.controls.outputFormat') }}</label>
          <div class="segmented-control segmented-control--three">
            <label v-for="format in ['jpeg', 'png', 'webp'] as OutputImageFormat[]" :key="format">
              <input v-model="outputFormat" type="radio" :value="format" />
              <span>{{ format === 'jpeg' ? 'JPG' : format.toUpperCase() }}</span>
            </label>
          </div>
        </div>
        <label class="range-control">
          <span
            >{{ $t('phase3.controls.quality') }} <strong>{{ quality }}%</strong></span
          >
          <input v-model.number="quality" type="range" min="10" max="100" />
        </label>
        <label v-if="outputFormat === 'jpeg'" class="color-control">
          <span>{{ $t('phase3.controls.background') }}</span>
          <input v-model="backgroundColor" type="color" />
          <code>{{ backgroundColor.toUpperCase() }}</code>
        </label>
        <button
          v-if="status.state !== 'processing'"
          class="button button--primary full-width"
          type="button"
          @click="exportCrop"
        >
          <Scissors :size="18" />{{ $t('phase3.cropper.action') }}
        </button>
        <button
          v-else
          class="button button--secondary full-width"
          type="button"
          @click="cancelExport"
        >
          <LoaderCircle class="spin" :size="18" />{{ $t('phase3.actions.cancel') }}
        </button>
        <div class="crop-result" aria-live="polite">
          <template v-if="status.state === 'success'">
            <span class="success-text"
              ><CheckCircle2 :size="17" />{{ $t('phase3.status.done') }}</span
            >
            <strong
              >{{ Math.round(crop.width) }} × {{ Math.round(crop.height) }} ·
              {{ formatFileSize(status.blob?.size ?? 0) }}</strong
            >
            <button class="button button--primary full-width" type="button" @click="download">
              <Download :size="17" />{{ $t('phase3.actions.download') }}
            </button>
          </template>
          <span v-else-if="status.state === 'error'" class="error-text"
            ><AlertCircle :size="17" />{{
              $t(issueKey(status.issue!), status.issue?.params ?? {})
            }}</span
          >
        </div>
      </aside>
    </div>
  </section>
</template>
