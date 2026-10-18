<script setup lang="ts">
import { computed, onBeforeUnmount, reactive, ref, shallowRef, watch } from 'vue'
import {
  AlertCircle,
  Archive,
  CheckCircle2,
  Download,
  ImagePlus,
  LoaderCircle,
  Play,
  Trash2,
  X,
} from '@lucide/vue'
import ImageUploader from '@/components/upload/ImageUploader.vue'
import WatermarkPreview from './WatermarkPreview.vue'
import { useImageFiles } from '@/composables/useImageFiles'
import { createOutputName, downloadBlob } from '@/services/export/download'
import { createZipBlob } from '@/services/export/zip'
import { toImageIssue } from '@/services/image/errors'
import { formatFileSize } from '@/services/image/limits'
import {
  formatToExtension,
  formatToMimeType,
  inputFormatToOutput,
} from '@/services/image/operations'
import { prepareImageFile } from '@/services/image/prepare'
import { type WatermarkPosition, type WatermarkSettings } from '@/services/image/watermark'
import { processWatermark } from '@/services/image/watermark-task'
import type { ImageIssue, PreparedImage } from '@/types/image'

interface WatermarkResult {
  state: 'idle' | 'processing' | 'success' | 'error'
  blob?: Blob
  name?: string
  issue?: ImageIssue
}

const { items, failures, pendingCount, isLoading, addFiles, removeFile, dismissFailure, clearAll } =
  useImageFiles()
const mode = ref<'text' | 'image'>('text')
const text = ref('Image Toolbox')
const color = ref('#ffffff')
const sizePercent = ref(7)
const opacity = ref(0.65)
const rotation = ref(-25)
const position = ref<WatermarkPosition>('bottomRight')
const tile = ref(false)
const quality = ref(90)
const watermarkImage = shallowRef<PreparedImage>()
let controller: AbortController | undefined
const watermarkInput = ref<HTMLInputElement | null>(null)
const watermarkIssue = ref<ImageIssue>()
const results = reactive<Record<string, WatermarkResult>>({})
const isProcessing = ref(false)
const zipState = ref<'idle' | 'processing' | 'error'>('idle')
const zipProgress = ref(0)
const positionOptions: WatermarkPosition[] = [
  'topLeft',
  'topRight',
  'center',
  'bottomLeft',
  'bottomRight',
]

const previewItem = computed(() => items.value[0])
const settings = computed<WatermarkSettings>(() => ({
  mode: mode.value,
  text: text.value,
  color: color.value,
  sizePercent: sizePercent.value,
  opacity: opacity.value,
  rotation: rotation.value,
  position: position.value,
  tile: tile.value,
  imageSource: watermarkImage.value?.decoded.source,
  imageWidth: watermarkImage.value?.width,
  imageHeight: watermarkImage.value?.height,
}))
const successfulResults = computed(() =>
  items.value
    .map((item) => ({ item, result: results[item.id] }))
    .filter(
      (
        entry,
      ): entry is { item: PreparedImage; result: WatermarkResult & { blob: Blob; name: string } } =>
        entry.result?.state === 'success' && Boolean(entry.result.blob && entry.result.name),
    ),
)

function issueKey(issue: ImageIssue): string {
  return `phase2.errors.${issue.code}`
}

function stateFor(id: string): WatermarkResult {
  return results[id] ?? { state: 'idle' }
}

function clearResults() {
  Object.keys(results).forEach((id) => delete results[id])
  zipState.value = 'idle'
  zipProgress.value = 0
}

async function chooseWatermarkFile(files: FileList | null) {
  const file = files?.[0]
  if (!file) return
  watermarkImage.value?.decoded.dispose()
  watermarkImage.value = undefined
  watermarkIssue.value = undefined
  try {
    watermarkImage.value = await prepareImageFile(file)
    mode.value = 'image'
  } catch (error) {
    watermarkIssue.value = toImageIssue(error)
  } finally {
    if (watermarkInput.value) watermarkInput.value.value = ''
  }
}

async function processAll() {
  if (!items.value.length || isProcessing.value) return
  clearResults()
  isProcessing.value = true
  controller = new AbortController()
  const signal = controller.signal
  let cursor = 0
  const queue = [...items.value]

  async function consumeQueue() {
    while (cursor < queue.length) {
      if (signal.aborted) break
      const item = queue[cursor++]
      results[item.id] = { state: 'processing' }
      try {
        const format = inputFormatToOutput(item.format)
        const blob = await processWatermark(
          item,
          settings.value,
          formatToMimeType(format),
          quality.value / 100,
          signal,
          watermarkImage.value?.file,
        )
        results[item.id] = {
          state: 'success',
          blob,
          name: createOutputName(item.file.name, '-watermarked', formatToExtension(format)),
        }
      } catch (error) {
        results[item.id] = signal.aborted
          ? { state: 'idle' }
          : { state: 'error', issue: toImageIssue(error) }
      }
    }
  }

  try {
    await Promise.all(Array.from({ length: Math.min(2, queue.length) }, () => consumeQueue()))
  } finally {
    isProcessing.value = false
    controller = undefined
  }
}

function downloadResult(item: PreparedImage) {
  const result = stateFor(item.id)
  if (result.blob && result.name) downloadBlob(result.blob, result.name)
}

async function downloadZip() {
  if (!successfulResults.value.length || zipState.value === 'processing') return
  zipState.value = 'processing'
  try {
    const blob = await createZipBlob(
      successfulResults.value.map(({ result }) => ({ name: result.name, data: result.blob })),
      (progress) => (zipProgress.value = progress),
    )
    downloadBlob(blob, 'watermarked-images.zip')
    zipState.value = 'idle'
  } catch {
    zipState.value = 'error'
  }
}

function remove(item: PreparedImage) {
  delete results[item.id]
  removeFile(item.id)
}

function resetAll() {
  controller?.abort()
  clearResults()
  clearAll()
}

watch([mode, text, color, sizePercent, opacity, rotation, position, tile, quality], () => {
  if (!isProcessing.value) clearResults()
})

function cancelProcessing() {
  controller?.abort()
}
onBeforeUnmount(() => {
  controller?.abort()
  watermarkImage.value?.decoded.dispose()
})
</script>

<template>
  <section class="tool-workbench" aria-labelledby="watermark-title">
    <header class="workbench-title-row">
      <div>
        <span class="eyebrow">{{ $t('watermark.eyebrow') }}</span>
        <h2 id="watermark-title">{{ $t('watermark.title') }}</h2>
        <p>{{ $t('watermark.description') }}</p>
      </div>
      <button v-if="items.length" class="button button--secondary" type="button" @click="resetAll">
        <Trash2 :size="17" />{{ $t('phase3.actions.clear') }}
      </button>
    </header>

    <div class="feature-strip">
      <span><CheckCircle2 :size="16" />{{ $t('watermark.feature1') }}</span>
      <span><CheckCircle2 :size="16" />{{ $t('watermark.feature2') }}</span>
      <span><CheckCircle2 :size="16" />{{ $t('watermark.feature3') }}</span>
    </div>

    <div class="tool-controls watermark-controls">
      <div class="control-group">
        <label>{{ $t('watermark.type') }}</label>
        <div class="segmented-control">
          <label
            ><input v-model="mode" type="radio" value="text" /><span>{{
              $t('watermark.textMode')
            }}</span></label
          >
          <label
            ><input v-model="mode" type="radio" value="image" /><span>{{
              $t('watermark.imageMode')
            }}</span></label
          >
        </div>
      </div>
      <label v-if="mode === 'text'" class="text-control"
        ><span>{{ $t('watermark.text') }}</span
        ><input v-model="text" type="text" maxlength="80"
      /></label>
      <div v-else class="control-group">
        <label>{{ $t('watermark.image') }}</label>
        <input
          ref="watermarkInput"
          class="sr-only"
          type="file"
          accept="image/png,image/jpeg,image/webp"
          @change="chooseWatermarkFile(($event.target as HTMLInputElement).files)"
        />
        <button class="button button--secondary" type="button" @click="watermarkInput?.click()">
          <ImagePlus :size="17" />{{ watermarkImage?.file.name || $t('watermark.chooseImage') }}
        </button>
        <small v-if="watermarkIssue" class="error-text">{{
          $t(issueKey(watermarkIssue), watermarkIssue.params ?? {})
        }}</small>
      </div>
      <label class="range-control"
        ><span
          >{{ $t('watermark.size') }} <strong>{{ sizePercent }}%</strong></span
        ><input v-model.number="sizePercent" type="range" min="2" max="25"
      /></label>
      <label class="range-control"
        ><span
          >{{ $t('watermark.opacity') }} <strong>{{ Math.round(opacity * 100) }}%</strong></span
        ><input v-model.number="opacity" type="range" min="0.1" max="1" step="0.05"
      /></label>
      <label class="range-control"
        ><span
          >{{ $t('watermark.rotation') }} <strong>{{ rotation }}°</strong></span
        ><input v-model.number="rotation" type="range" min="-180" max="180"
      /></label>
      <label v-if="mode === 'text'" class="color-control"
        ><span>{{ $t('watermark.color') }}</span
        ><input v-model="color" type="color" /><code>{{ color.toUpperCase() }}</code></label
      >
      <div class="control-group">
        <label>{{ $t('watermark.position') }}</label
        ><select v-model="position">
          <option v-for="value in positionOptions" :key="value" :value="value">
            {{ $t(`watermark.positions.${value}`) }}
          </option>
        </select>
      </div>
      <label class="check-control"
        ><input v-model="tile" type="checkbox" /><span>{{ $t('watermark.tile') }}</span></label
      >
    </div>

    <ImageUploader :disabled="items.length >= 20 || isProcessing" @files="addFiles" />
    <div v-if="isLoading" class="processing-banner">
      <LoaderCircle class="spin" :size="18" />{{
        $t('phase3.status.preparing', { count: pendingCount })
      }}
    </div>
    <div v-if="failures.length" class="upload-failures">
      <article v-for="failure in failures" :key="failure.id" class="upload-failure">
        <AlertCircle :size="19" /><span
          ><strong>{{ failure.fileName }}</strong
          >{{ $t(issueKey(failure.issue), failure.issue.params ?? {}) }}</span
        ><button type="button" @click="dismissFailure(failure.id)"><X :size="17" /></button>
      </article>
    </div>

    <div v-if="previewItem" class="watermark-preview-panel">
      <WatermarkPreview
        :source="previewItem.decoded.source"
        :width="previewItem.width"
        :height="previewItem.height"
        :settings="settings"
      />
      <span>{{ $t('watermark.previewUsing', { name: previewItem.file.name }) }}</span>
    </div>

    <div v-if="items.length" class="process-action-row">
      <div>
        <strong>{{ $t('phase3.status.selected', { count: items.length }) }}</strong
        ><span>{{ $t('watermark.hint') }}</span>
      </div>
      <button
        class="button button--primary"
        type="button"
        :disabled="isProcessing || (mode === 'image' && !watermarkImage)"
        @click="processAll"
      >
        <LoaderCircle v-if="isProcessing" class="spin" :size="18" /><Play v-else :size="18" />{{
          $t('watermark.action')
        }}
      </button>
      <button
        v-if="isProcessing"
        class="button button--secondary"
        type="button"
        @click="cancelProcessing"
      >
        {{ $t('phase3.actions.cancel') }}
      </button>
    </div>

    <div v-if="items.length" class="compact-result-list">
      <article v-for="item in items" :key="item.id">
        <div>
          <strong>{{ item.file.name }}</strong
          ><span>{{ formatFileSize(item.file.size) }}</span>
        </div>
        <span v-if="stateFor(item.id).state === 'processing'"
          ><LoaderCircle class="spin" :size="16" />{{ $t('phase3.status.processing') }}</span
        >
        <span v-else-if="stateFor(item.id).state === 'error'" class="error-text"
          ><AlertCircle :size="16" />{{
            $t(issueKey(stateFor(item.id).issue!), stateFor(item.id).issue?.params ?? {})
          }}</span
        >
        <span v-else-if="stateFor(item.id).state === 'success'" class="success-text"
          ><CheckCircle2 :size="16" />{{ formatFileSize(stateFor(item.id).blob?.size ?? 0) }}</span
        >
        <div class="inline-actions">
          <button
            v-if="stateFor(item.id).state === 'success'"
            class="button button--secondary"
            type="button"
            @click="downloadResult(item)"
          >
            <Download :size="16" />{{ $t('phase3.actions.download') }}</button
          ><button class="icon-button" type="button" @click="remove(item)">
            <Trash2 :size="16" />
          </button>
        </div>
      </article>
    </div>

    <button
      v-if="successfulResults.length > 1"
      class="button button--primary zip-button"
      type="button"
      :disabled="zipState === 'processing'"
      @click="downloadZip"
    >
      <LoaderCircle v-if="zipState === 'processing'" class="spin" :size="17" /><Archive
        v-else
        :size="17"
      />{{
        zipState === 'processing'
          ? $t('watermark.zipping', { progress: zipProgress })
          : $t('watermark.downloadZip')
      }}
    </button>
    <p v-if="zipState === 'error'" class="error-text">{{ $t('watermark.zipError') }}</p>
  </section>
</template>
