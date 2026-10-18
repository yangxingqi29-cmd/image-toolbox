<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import {
  AlertCircle,
  Archive,
  CheckCircle2,
  Download,
  LoaderCircle,
  Lock,
  Play,
  Trash2,
  X,
} from '@lucide/vue'
import ImagePreviewCanvas from '@/components/image/ImagePreviewCanvas.vue'
import ImageUploader from '@/components/upload/ImageUploader.vue'
import { useImageFiles } from '@/composables/useImageFiles'
import { createOutputName, downloadBlob } from '@/services/export/download'
import { createZipBlob } from '@/services/export/zip'
import { toImageIssue } from '@/services/image/errors'
import { formatFileSize } from '@/services/image/limits'
import {
  calculateResizeDimensions,
  calculateSavings,
  formatToExtension,
  formatToMimeType,
  inputFormatToOutput,
  OUTPUT_FORMATS,
  supportsOutputMimeType,
} from '@/services/image/operations'
import { processPreparedImage } from '@/services/image/processor'
import type { ImageIssue, OutputImageFormat, PreparedImage } from '@/types/image'

type BatchToolMode = 'compressor' | 'converter' | 'resizer'

interface ResultState {
  status: 'idle' | 'processing' | 'success' | 'error'
  blob?: Blob
  outputName?: string
  outputWidth?: number
  outputHeight?: number
  keptOriginal?: boolean
  issue?: ImageIssue
}

const props = defineProps<{ mode: BatchToolMode }>()
const { items, failures, pendingCount, isLoading, addFiles, removeFile, dismissFailure, clearAll } =
  useImageFiles()
const quality = ref(82)
const outputFormat = ref<OutputImageFormat>('webp')
const backgroundColor = ref('#ffffff')
const keepSmaller = ref(true)
const resizeUnit = ref<'pixels' | 'percent'>('pixels')
const resizePercent = ref(50)
const targetWidth = ref(1200)
const targetHeight = ref(800)
const lockRatio = ref(true)
const changedSide = ref<'width' | 'height'>('width')
const results = reactive<Record<string, ResultState>>({})
const controllers = new Map<string, AbortController>()
let batchCancelled = false
let batchGeneration = 0
const outputSupport = reactive<Record<OutputImageFormat, boolean>>({
  jpeg: true,
  png: true,
  webp: true,
})
const zipState = ref<'idle' | 'processing' | 'error'>('idle')
const zipProgress = ref(0)

const isProcessing = computed(() =>
  Object.values(results).some((state) => state.status === 'processing'),
)
const completedCount = computed(
  () =>
    Object.values(results).filter((state) => state.status === 'success' || state.status === 'error')
      .length,
)
const successfulResults = computed(() =>
  items.value
    .map((item) => ({ item, result: results[item.id] }))
    .filter(
      (
        entry,
      ): entry is {
        item: PreparedImage
        result: ResultState & { blob: Blob; outputName: string }
      } =>
        entry.result?.status === 'success' && Boolean(entry.result.blob && entry.result.outputName),
    ),
)

function stateFor(id: string): ResultState {
  return results[id] ?? { status: 'idle' }
}

function issueKey(issue: ImageIssue): string {
  return `phase2.errors.${issue.code}`
}

function clearResults() {
  batchCancelled = true
  batchGeneration += 1
  controllers.forEach((controller) => controller.abort())
  controllers.clear()
  Object.keys(results).forEach((id) => delete results[id])
  zipState.value = 'idle'
  zipProgress.value = 0
}

async function receiveFiles(files: File[]) {
  const wasEmpty = items.value.length === 0
  await addFiles(files)
  if (props.mode === 'resizer' && wasEmpty && items.value[0]) {
    targetWidth.value = items.value[0].width
    targetHeight.value = items.value[0].height
  }
}

function dimensionsFor(item: PreparedImage): { width: number; height: number } {
  if (props.mode !== 'resizer') return { width: item.width, height: item.height }

  if (resizeUnit.value === 'percent') {
    const ratio = Math.min(400, Math.max(1, resizePercent.value)) / 100
    return calculateResizeDimensions(
      item.width,
      item.height,
      item.width * ratio,
      item.height * ratio,
      true,
    )
  }

  return calculateResizeDimensions(
    item.width,
    item.height,
    targetWidth.value,
    targetHeight.value,
    lockRatio.value,
    changedSide.value,
  )
}

async function processItem(item: PreparedImage) {
  const controller = new AbortController()
  controllers.set(item.id, controller)
  results[item.id] = { status: 'processing' }

  try {
    const format =
      props.mode === 'converter' ? outputFormat.value : inputFormatToOutput(item.format)
    const size = dimensionsFor(item)
    const mimeType = formatToMimeType(format)
    const encoded = await processPreparedImage(
      item,
      {
        width: size.width,
        height: size.height,
        mimeType,
        quality: format === 'png' ? undefined : quality.value / 100,
        backgroundColor: format === 'jpeg' ? backgroundColor.value : undefined,
      },
      controller.signal,
    )

    const shouldKeepOriginal =
      props.mode === 'compressor' && keepSmaller.value && encoded.size >= item.file.size
    const blob = shouldKeepOriginal ? item.file : encoded
    const suffix =
      props.mode === 'compressor'
        ? '-compressed'
        : props.mode === 'converter'
          ? '-converted'
          : '-resized'
    results[item.id] = {
      status: 'success',
      blob,
      outputName: createOutputName(item.file.name, suffix, formatToExtension(format)),
      outputWidth: size.width,
      outputHeight: size.height,
      keptOriginal: shouldKeepOriginal,
    }
  } catch (error) {
    const issue = toImageIssue(error)
    results[item.id] = issue.code === 'cancelled' ? { status: 'idle' } : { status: 'error', issue }
  } finally {
    controllers.delete(item.id)
  }
}

async function processAll() {
  if (!items.value.length || isProcessing.value) return
  clearResults()
  batchCancelled = false
  const generation = batchGeneration
  let cursor = 0
  const queue = [...items.value]

  async function consumeQueue() {
    while (cursor < queue.length) {
      if (batchCancelled || generation !== batchGeneration) break
      const item = queue[cursor++]
      await processItem(item)
    }
  }

  // 同时处理两张图片，兼顾批量速度与手机端内存占用。
  await Promise.all(Array.from({ length: Math.min(2, queue.length) }, () => consumeQueue()))
}

function cancelAll() {
  batchCancelled = true
  controllers.forEach((controller) => controller.abort())
}

function remove(item: PreparedImage) {
  controllers.get(item.id)?.abort()
  controllers.delete(item.id)
  delete results[item.id]
  removeFile(item.id)
}

function clearWorkbench() {
  clearResults()
  clearAll()
}

function downloadResult(item: PreparedImage) {
  const result = stateFor(item.id)
  if (!result.blob || !result.outputName) return
  downloadBlob(result.blob, result.outputName)
}

async function downloadAllZip() {
  if (successfulResults.value.length < 2 || zipState.value === 'processing') return
  zipState.value = 'processing'
  try {
    const blob = await createZipBlob(
      successfulResults.value.map(({ result }) => ({
        name: result.outputName,
        data: result.blob,
      })),
      (progress) => (zipProgress.value = progress),
    )
    downloadBlob(blob, `${props.mode}-results.zip`)
    zipState.value = 'idle'
  } catch {
    zipState.value = 'error'
  }
}

function savingText(item: PreparedImage): string {
  const result = stateFor(item.id)
  if (!result.blob) return ''
  return calculateSavings(item.file.size, result.blob.size).toFixed(1)
}

function setPreset(width: number) {
  targetWidth.value = width
  changedSide.value = 'width'
  const first = items.value[0]
  if (first && lockRatio.value) {
    targetHeight.value = Math.max(1, Math.round(width / (first.width / first.height)))
  }
}

function handleDimensionInput(side: 'width' | 'height') {
  changedSide.value = side
  const first = items.value[0]
  if (!first || !lockRatio.value) return
  if (
    !Number.isFinite(targetWidth.value) ||
    !Number.isFinite(targetHeight.value) ||
    targetWidth.value <= 0 ||
    targetHeight.value <= 0 ||
    targetWidth.value > 16_384 ||
    targetHeight.value > 16_384
  ) {
    return
  }
  const dimensions = calculateResizeDimensions(
    first.width,
    first.height,
    targetWidth.value,
    targetHeight.value,
    true,
    side,
  )
  targetWidth.value = dimensions.width
  targetHeight.value = dimensions.height
}

watch(
  [
    quality,
    outputFormat,
    backgroundColor,
    keepSmaller,
    resizeUnit,
    resizePercent,
    targetWidth,
    targetHeight,
    lockRatio,
  ],
  () => {
    if (!isProcessing.value) clearResults()
  },
)

onMounted(async () => {
  await Promise.all(
    OUTPUT_FORMATS.map(async (format) => {
      outputSupport[format] = await supportsOutputMimeType(formatToMimeType(format))
    }),
  )
  if (!outputSupport[outputFormat.value]) {
    outputFormat.value = outputSupport.jpeg ? 'jpeg' : 'png'
  }
})

onBeforeUnmount(clearResults)
</script>

<template>
  <section class="tool-workbench" :aria-labelledby="`${mode}-workbench-title`">
    <header class="workbench-title-row">
      <div>
        <span class="eyebrow">{{ $t(`phase3.${mode}.eyebrow`) }}</span>
        <h2 :id="`${mode}-workbench-title`">{{ $t(`phase3.${mode}.title`) }}</h2>
        <p>{{ $t(`phase3.${mode}.description`) }}</p>
      </div>
      <button
        v-if="items.length || failures.length"
        class="button button--secondary"
        type="button"
        @click="clearWorkbench"
      >
        <Trash2 :size="17" aria-hidden="true" />{{ $t('phase3.actions.clear') }}
      </button>
    </header>

    <div class="feature-strip" aria-label="features">
      <span><CheckCircle2 :size="16" />{{ $t(`phase3.${mode}.feature1`) }}</span>
      <span><CheckCircle2 :size="16" />{{ $t(`phase3.${mode}.feature2`) }}</span>
      <span><CheckCircle2 :size="16" />{{ $t(`phase3.${mode}.feature3`) }}</span>
    </div>

    <div class="tool-controls">
      <div v-if="mode === 'converter'" class="control-group">
        <label>{{ $t('phase3.controls.outputFormat') }}</label>
        <div class="segmented-control segmented-control--three">
          <label v-for="format in OUTPUT_FORMATS" :key="format">
            <input
              v-model="outputFormat"
              type="radio"
              :value="format"
              :disabled="!outputSupport[format]"
            />
            <span>{{ format === 'jpeg' ? 'JPG' : format.toUpperCase() }}</span>
          </label>
        </div>
      </div>

      <template v-if="mode === 'resizer'">
        <div class="control-group">
          <label>{{ $t('phase3.controls.resizeMode') }}</label>
          <div class="segmented-control">
            <label>
              <input v-model="resizeUnit" type="radio" value="pixels" />
              <span>{{ $t('phase3.controls.pixels') }}</span>
            </label>
            <label>
              <input v-model="resizeUnit" type="radio" value="percent" />
              <span>{{ $t('phase3.controls.percent') }}</span>
            </label>
          </div>
        </div>
        <div v-if="resizeUnit === 'pixels'" class="dimension-controls">
          <label>
            <span>{{ $t('phase3.controls.width') }}</span>
            <input
              v-model.number="targetWidth"
              type="number"
              min="1"
              max="16384"
              @input="handleDimensionInput('width')"
            />
          </label>
          <button
            class="ratio-lock"
            :class="{ 'ratio-lock--active': lockRatio }"
            type="button"
            :aria-pressed="lockRatio"
            @click="lockRatio = !lockRatio"
          >
            <Lock :size="16" />{{ $t('phase3.controls.lockRatio') }}
          </button>
          <label>
            <span>{{ $t('phase3.controls.height') }}</span>
            <input
              v-model.number="targetHeight"
              type="number"
              min="1"
              max="16384"
              @input="handleDimensionInput('height')"
            />
          </label>
        </div>
        <label v-else class="range-control">
          <span
            >{{ $t('phase3.controls.scale') }} <strong>{{ resizePercent }}%</strong></span
          >
          <input v-model.number="resizePercent" type="range" min="1" max="400" step="1" />
        </label>
        <div v-if="resizeUnit === 'pixels'" class="preset-row">
          <button type="button" @click="setPreset(640)">640 px</button>
          <button type="button" @click="setPreset(1280)">1280 px</button>
          <button type="button" @click="setPreset(1920)">1920 px</button>
        </div>
      </template>

      <label class="range-control">
        <span
          >{{ $t('phase3.controls.quality') }} <strong>{{ quality }}%</strong></span
        >
        <input v-model.number="quality" type="range" min="10" max="100" step="1" />
      </label>

      <label v-if="mode === 'converter' && outputFormat === 'jpeg'" class="color-control">
        <span>{{ $t('phase3.controls.background') }}</span>
        <input v-model="backgroundColor" type="color" />
        <code>{{ backgroundColor.toUpperCase() }}</code>
      </label>

      <label v-if="mode === 'compressor'" class="check-control">
        <input v-model="keepSmaller" type="checkbox" />
        <span>{{ $t('phase3.controls.keepSmaller') }}</span>
      </label>
    </div>

    <ImageUploader :disabled="items.length >= 20 || isProcessing" @files="receiveFiles" />

    <div v-if="isLoading" class="processing-banner" role="status">
      <LoaderCircle class="spin" :size="19" aria-hidden="true" />
      {{ $t('phase3.status.preparing', { count: pendingCount }) }}
    </div>

    <div v-if="failures.length" class="upload-failures" aria-live="polite">
      <article v-for="failure in failures" :key="failure.id" class="upload-failure">
        <AlertCircle :size="19" aria-hidden="true" />
        <span
          ><strong>{{ failure.fileName }}</strong
          >{{ $t(issueKey(failure.issue), failure.issue.params ?? {}) }}</span
        >
        <button
          type="button"
          :aria-label="$t('phase2.dismissError')"
          @click="dismissFailure(failure.id)"
        >
          <X :size="17" />
        </button>
      </article>
    </div>

    <div v-if="items.length" class="process-action-row">
      <div>
        <strong>{{ $t('phase3.status.selected', { count: items.length }) }}</strong>
        <span v-if="isProcessing">{{
          $t('phase3.status.progress', { done: completedCount, total: items.length })
        }}</span>
        <span v-else>{{ $t(`phase3.${mode}.hint`) }}</span>
      </div>
      <button v-if="!isProcessing" class="button button--primary" type="button" @click="processAll">
        <Play :size="18" />{{ $t(`phase3.${mode}.action`) }}
      </button>
      <button v-else class="button button--secondary" type="button" @click="cancelAll">
        <LoaderCircle class="spin" :size="18" />{{ $t('phase3.actions.cancel') }}
      </button>
    </div>

    <div v-if="items.length" class="prepared-list">
      <article v-for="item in items" :key="item.id" class="prepared-card result-card">
        <div class="prepared-card__preview">
          <ImagePreviewCanvas
            :source="item.decoded.source"
            :width="item.width"
            :height="item.height"
            :alt="item.file.name"
          />
        </div>
        <div class="prepared-card__content">
          <div class="prepared-card__title">
            <div>
              <strong>{{ item.file.name }}</strong>
              <span
                >{{ item.width }} × {{ item.height }} · {{ formatFileSize(item.file.size) }}</span
              >
            </div>
            <button
              class="icon-button"
              type="button"
              :aria-label="$t('phase2.removeFile')"
              @click="remove(item)"
            >
              <Trash2 :size="17" />
            </button>
          </div>

          <div class="result-summary" aria-live="polite">
            <template v-if="stateFor(item.id).status === 'success'">
              <span class="success-text"
                ><CheckCircle2 :size="17" />{{ $t('phase3.status.done') }}</span
              >
              <strong>{{ formatFileSize(stateFor(item.id).blob?.size ?? 0) }}</strong>
              <span
                v-if="mode === 'compressor' && stateFor(item.id).keptOriginal"
                class="neutral-note"
                >{{ $t('phase3.status.originalKept') }}</span
              >
              <span
                v-else-if="mode === 'compressor'"
                :class="Number(savingText(item)) >= 0 ? 'saving-positive' : 'saving-negative'"
              >
                {{
                  Number(savingText(item)) >= 0
                    ? $t('phase3.status.smaller', { percent: savingText(item) })
                    : $t('phase3.status.larger', {
                        percent: Math.abs(Number(savingText(item))).toFixed(1),
                      })
                }}
              </span>
              <span v-if="mode === 'resizer'"
                >{{ stateFor(item.id).outputWidth }} × {{ stateFor(item.id).outputHeight }}</span
              >
            </template>
            <span v-else-if="stateFor(item.id).status === 'processing'"
              ><LoaderCircle class="spin" :size="17" />{{ $t('phase3.status.processing') }}</span
            >
            <span v-else-if="stateFor(item.id).status === 'error'" class="error-text"
              ><AlertCircle :size="17" />{{
                $t(issueKey(stateFor(item.id).issue!), stateFor(item.id).issue?.params ?? {})
              }}</span
            >
            <span v-else>{{ $t('phase3.status.ready') }}</span>
          </div>

          <button
            v-if="stateFor(item.id).status === 'success'"
            class="button button--primary result-download"
            type="button"
            @click="downloadResult(item)"
          >
            <Download :size="17" />{{ $t('phase3.actions.download') }}
          </button>
        </div>
      </article>
    </div>
    <div v-if="successfulResults.length > 1" class="zip-download-row">
      <button
        class="button button--primary"
        type="button"
        :disabled="zipState === 'processing'"
        @click="downloadAllZip"
      >
        <LoaderCircle v-if="zipState === 'processing'" class="spin" :size="17" />
        <Archive v-else :size="17" />
        {{
          zipState === 'processing'
            ? $t('phase3.actions.zipping', { progress: zipProgress })
            : $t('phase3.actions.downloadZip')
        }}
      </button>
      <span v-if="zipState === 'error'" class="error-text">{{
        $t('phase3.actions.zipError')
      }}</span>
    </div>
  </section>
</template>
