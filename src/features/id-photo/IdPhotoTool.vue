<script setup lang="ts">
import { computed, onBeforeUnmount, reactive, ref, shallowRef, watch } from 'vue'
import {
  AlertCircle,
  CheckCircle2,
  Download,
  LoaderCircle,
  RefreshCcw,
  ScanFace,
  Sparkles,
  Trash2,
  X,
} from '@lucide/vue'
import ImageUploader from '@/components/upload/ImageUploader.vue'
import IdPhotoPreview from './IdPhotoPreview.vue'
import { useImageFiles } from '@/composables/useImageFiles'
import { PHOTO_PRESETS } from '@/data/photo-presets'
import { OUTFITS } from '@/data/outfits'
import { createOutputName, downloadBlob } from '@/services/export/download'
import { segmentPortrait } from '@/services/ai/portrait-segmentation'
import { renderIdPhotoBlob } from '@/services/image/id-photo'
import { formatFileSize } from '@/services/image/limits'
import { processPreparedImage } from '@/services/image/processor'
import type {
  AiProgress,
  IdPhotoTransform,
  OutfitDefinition,
  OutfitTransform,
  SegmentedPortrait,
} from '@/types/id-photo'

const { items, failures, pendingCount, isLoading, addFiles, dismissFailure, clearAll } =
  useImageFiles()
const presetId = ref('oneInch')
const outputWidth = ref(295)
const outputHeight = ref(413)
const dpi = ref(300)
const backgroundMode = ref<'white' | 'blue' | 'red' | 'transparent' | 'custom'>('white')
const customBackground = ref('#ddeeff')
const outputFormat = ref<'jpeg' | 'png'>('jpeg')
const quality = ref(92)
const transform = reactive<IdPhotoTransform>({ zoom: 1, offsetX: 0, offsetY: 0 })
const outfitId = ref<OutfitDefinition['id']>('none')
const outfitImage = shallowRef<HTMLImageElement>()
const outfitTransform = reactive<OutfitTransform>({ scale: 1, offsetY: 0 })
const outfitLoading = ref(false)
const segmented = shallowRef<SegmentedPortrait>()
const aiState = ref<'idle' | 'loading' | 'success' | 'error'>('idle')
const aiProgress = ref<AiProgress>({ status: 'idle' })
const exportState = ref<'idle' | 'processing' | 'success' | 'error'>('idle')
const exportBlob = ref<Blob>()
let aiController: AbortController | undefined
let outfitLoadGeneration = 0
const backgroundOptions = ['white', 'blue', 'red', 'transparent', 'custom'] as const
const knownAiStatuses = new Set([
  'preparing',
  'loading',
  'initiate',
  'download',
  'progress',
  'done',
  'ready',
  'inference',
])

const item = computed(() => items.value[0])
const dimensionsValid = computed(
  () =>
    [outputWidth.value, outputHeight.value].every(
      (value) => Number.isSafeInteger(value) && value >= 64 && value <= 4096,
    ) &&
    Number.isFinite(dpi.value) &&
    dpi.value >= 72 &&
    dpi.value <= 600,
)
const currentSource = computed(() => segmented.value?.source ?? item.value?.decoded.source)
const currentSourceWidth = computed(() => segmented.value?.width ?? item.value?.width ?? 1)
const currentSourceHeight = computed(() => segmented.value?.height ?? item.value?.height ?? 1)
const backgroundColor = computed<string | null>(() => {
  if (backgroundMode.value === 'transparent') return null
  if (backgroundMode.value === 'custom') return customBackground.value
  return { white: '#ffffff', blue: '#438edb', red: '#d94848' }[backgroundMode.value]
})
const physicalSize = computed(() => ({
  width: ((outputWidth.value / dpi.value) * 25.4).toFixed(1),
  height: ((outputHeight.value / dpi.value) * 25.4).toFixed(1),
}))
const progressPercent = computed(() =>
  typeof aiProgress.value.progress === 'number'
    ? Math.round(
        Math.min(
          100,
          aiProgress.value.progress <= 1
            ? aiProgress.value.progress * 100
            : aiProgress.value.progress,
        ),
      )
    : null,
)
const aiStatusKey = computed(() =>
  knownAiStatuses.has(aiProgress.value.status) ? aiProgress.value.status : 'loading',
)

function issueKey(code: string): string {
  return `phase2.errors.${code}`
}

async function receiveFiles(files: File[]) {
  resetAll()
  await addFiles(files.slice(0, 1))
}

function disposeSegmented() {
  segmented.value?.dispose()
  segmented.value = undefined
}

function disposeOutfitImage() {
  outfitLoadGeneration += 1
  if (outfitImage.value) outfitImage.value.src = ''
  outfitImage.value = undefined
  outfitLoading.value = false
}

async function chooseOutfit(outfit: OutfitDefinition) {
  if (outfit.id !== 'none' && aiState.value !== 'success') return
  disposeOutfitImage()
  outfitId.value = outfit.id
  outfitTransform.scale = outfit.defaultScale
  outfitTransform.offsetY = outfit.defaultOffsetY
  if (!outfit.src) return

  const generation = outfitLoadGeneration
  const image = new Image()
  image.decoding = 'async'
  outfitLoading.value = true
  try {
    image.src = outfit.src
    await image.decode()
    if (generation !== outfitLoadGeneration) {
      image.src = ''
      return
    }
    outfitImage.value = image
  } catch {
    if (generation === outfitLoadGeneration) outfitId.value = 'none'
  } finally {
    if (generation === outfitLoadGeneration) outfitLoading.value = false
  }
}

function resetEditor() {
  transform.zoom = 1
  transform.offsetX = 0
  transform.offsetY = 0
  exportState.value = 'idle'
  exportBlob.value = undefined
}

function resetAll() {
  aiController?.abort()
  aiController = undefined
  disposeSegmented()
  disposeOutfitImage()
  outfitId.value = 'none'
  clearAll()
  aiState.value = 'idle'
  resetEditor()
}

function applyPreset() {
  const preset = PHOTO_PRESETS.find((candidate) => candidate.id === presetId.value)
  if (!preset || preset.id === 'custom') return
  outputWidth.value = preset.widthPx
  outputHeight.value = preset.heightPx
  dpi.value = preset.dpi
  resetEditor()
}

async function removeBackground() {
  if (!item.value || aiState.value === 'loading') return
  aiController?.abort()
  disposeSegmented()
  aiController = new AbortController()
  const taskController = aiController
  aiState.value = 'loading'
  aiProgress.value = { status: 'preparing', progress: 0 }

  try {
    const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 4
    const maxEdge = memory <= 4 ? 1024 : 1600
    const scale = Math.min(1, maxEdge / Math.max(item.value.width, item.value.height))
    const aiInput = await processPreparedImage(
      item.value,
      {
        width: Math.max(1, Math.round(item.value.width * scale)),
        height: Math.max(1, Math.round(item.value.height * scale)),
        mimeType: 'image/png',
      },
      taskController.signal,
    )
    const result = await segmentPortrait(
      aiInput,
      (progress) => (aiProgress.value = progress),
      taskController.signal,
    )
    if (taskController.signal.aborted || aiController !== taskController) {
      result.dispose()
      return
    }
    segmented.value = result
    aiState.value = 'success'
    resetEditor()
  } catch (error) {
    if (aiController !== taskController) return
    if (error instanceof DOMException && error.name === 'AbortError') {
      aiState.value = 'idle'
    } else {
      aiState.value = 'error'
    }
  } finally {
    if (aiController === taskController) aiController = undefined
  }
}

function cancelAi() {
  aiController?.abort()
}

async function exportPhoto() {
  if (!currentSource.value || !item.value || !dimensionsValid.value) return
  exportState.value = 'processing'
  exportBlob.value = undefined
  try {
    const mimeType = outputFormat.value === 'png' ? 'image/png' : 'image/jpeg'
    const safeBackground =
      mimeType === 'image/jpeg' ? (backgroundColor.value ?? '#ffffff') : backgroundColor.value
    const blob = await renderIdPhotoBlob(
      currentSource.value,
      currentSourceWidth.value,
      currentSourceHeight.value,
      {
        width: Math.max(1, Math.round(outputWidth.value)),
        height: Math.max(1, Math.round(outputHeight.value)),
        backgroundColor: safeBackground,
        mimeType,
        quality: quality.value / 100,
        transform: { ...transform },
        outfit: outfitImage.value
          ? {
              source: outfitImage.value,
              width: outfitImage.value.naturalWidth,
              height: outfitImage.value.naturalHeight,
              transform: { ...outfitTransform },
            }
          : undefined,
      },
    )
    exportBlob.value = blob
    exportState.value = 'success'
  } catch {
    exportState.value = 'error'
  }
}

function downloadPhoto() {
  if (!exportBlob.value || !item.value) return
  downloadBlob(
    exportBlob.value,
    createOutputName(
      item.value.file.name,
      '-id-photo',
      outputFormat.value === 'png' ? 'png' : 'jpg',
    ),
  )
}

watch(presetId, applyPreset)
watch(transform, () => {
  exportState.value = 'idle'
  exportBlob.value = undefined
})
watch(outfitTransform, () => {
  exportState.value = 'idle'
  exportBlob.value = undefined
})
watch(outfitId, () => {
  exportState.value = 'idle'
  exportBlob.value = undefined
})
watch(backgroundMode, (value) => {
  if (value === 'transparent') outputFormat.value = 'png'
})
watch(outputFormat, (value) => {
  if (value === 'jpeg' && backgroundMode.value === 'transparent') backgroundMode.value = 'white'
})
watch(
  [outputWidth, outputHeight, dpi, backgroundMode, customBackground, outputFormat, quality],
  () => {
    exportState.value = 'idle'
    exportBlob.value = undefined
  },
)

onBeforeUnmount(() => {
  aiController?.abort()
  disposeSegmented()
  disposeOutfitImage()
})
</script>

<template>
  <section class="tool-workbench id-photo-workbench" aria-labelledby="id-photo-title">
    <header class="workbench-title-row">
      <div>
        <span class="eyebrow">{{ $t('idPhoto.eyebrow') }}</span>
        <h2 id="id-photo-title">{{ $t('idPhoto.title') }}</h2>
        <p>{{ $t('idPhoto.description') }}</p>
      </div>
      <button v-if="item" class="button button--secondary" type="button" @click="resetAll">
        <Trash2 :size="17" />{{ $t('phase3.actions.clear') }}
      </button>
    </header>

    <div class="feature-strip" aria-label="features">
      <span><CheckCircle2 :size="16" />{{ $t('idPhoto.feature1') }}</span>
      <span><CheckCircle2 :size="16" />{{ $t('idPhoto.feature2') }}</span>
      <span><CheckCircle2 :size="16" />{{ $t('idPhoto.feature3') }}</span>
    </div>

    <ImageUploader v-if="!item" :multiple="false" single-purpose="portrait" @files="receiveFiles" />
    <div v-if="isLoading" class="processing-banner">
      <LoaderCircle class="spin" :size="18" />{{
        $t('phase3.status.preparing', { count: pendingCount })
      }}
    </div>
    <div v-if="failures.length" class="upload-failures">
      <article v-for="failure in failures" :key="failure.id" class="upload-failure">
        <AlertCircle :size="19" />
        <span
          ><strong>{{ failure.fileName }}</strong
          >{{ $t(issueKey(failure.issue.code), failure.issue.params ?? {}) }}</span
        >
        <button type="button" @click="dismissFailure(failure.id)"><X :size="17" /></button>
      </article>
    </div>

    <div v-if="item && currentSource" class="id-photo-layout">
      <div class="id-photo-preview-panel">
        <div class="id-photo-preview" :class="{ 'transparent-grid': !backgroundColor }">
          <IdPhotoPreview
            :source="currentSource"
            :source-width="currentSourceWidth"
            :source-height="currentSourceHeight"
            :output-width="dimensionsValid ? outputWidth : 295"
            :output-height="dimensionsValid ? outputHeight : 413"
            :background-color="backgroundColor"
            :transform="transform"
            :outfit-source="outfitImage"
            :outfit-width="outfitImage?.naturalWidth"
            :outfit-height="outfitImage?.naturalHeight"
            :outfit-transform="outfitTransform"
          />
        </div>
        <div class="crop-file-meta">
          <strong>{{ item.file.name }}</strong>
          <span>{{ item.width }} × {{ item.height }} · {{ formatFileSize(item.file.size) }}</span>
        </div>
        <div class="ai-action-card">
          <div>
            <strong><Sparkles :size="17" />{{ $t('idPhoto.aiTitle') }}</strong>
            <span>{{ $t('idPhoto.aiDescription') }}</span>
          </div>
          <button
            v-if="aiState !== 'loading'"
            class="button button--primary"
            type="button"
            @click="removeBackground"
          >
            <ScanFace :size="18" />{{
              $t(aiState === 'success' ? 'idPhoto.aiRetry' : 'idPhoto.aiAction')
            }}
          </button>
          <button v-else class="button button--secondary" type="button" @click="cancelAi">
            <LoaderCircle class="spin" :size="18" />{{ $t('phase3.actions.cancel') }}
          </button>
        </div>
        <div v-if="aiState === 'loading'" class="ai-progress" role="status">
          <span
            ><LoaderCircle class="spin" :size="16" />{{
              $t(`idPhoto.aiStatus.${aiStatusKey}`, { progress: progressPercent ?? 0 })
            }}</span
          >
          <progress v-if="progressPercent !== null" max="100" :value="progressPercent"></progress>
        </div>
        <p v-else-if="aiState === 'success'" class="success-text">
          <CheckCircle2 :size="16" />{{ $t('idPhoto.aiSuccess') }}
        </p>
        <p v-else-if="aiState === 'error'" class="error-text">
          <AlertCircle :size="16" />{{ $t('idPhoto.aiError') }}
        </p>
      </div>

      <aside class="id-photo-controls">
        <div class="control-group">
          <label>{{ $t('idPhoto.preset') }}</label>
          <select v-model="presetId">
            <option v-for="preset in PHOTO_PRESETS" :key="preset.id" :value="preset.id">
              {{ $t(`idPhoto.presets.${preset.id}`) }}
            </option>
          </select>
        </div>
        <div class="dimension-controls id-photo-dimensions">
          <label
            ><span>{{ $t('phase3.controls.width') }}</span
            ><input v-model.number="outputWidth" type="number" min="64" max="4096"
          /></label>
          <span>×</span>
          <label
            ><span>{{ $t('phase3.controls.height') }}</span
            ><input v-model.number="outputHeight" type="number" min="64" max="4096"
          /></label>
        </div>
        <label class="number-control"
          ><span>DPI</span><input v-model.number="dpi" type="number" min="72" max="600"
        /></label>
        <p class="size-summary">
          {{ physicalSize.width }} × {{ physicalSize.height }} mm · {{ outputWidth }} ×
          {{ outputHeight }} px
        </p>

        <div class="control-group">
          <label>{{ $t('idPhoto.background') }}</label>
          <div class="background-swatches">
            <button
              v-for="option in backgroundOptions"
              :key="option"
              type="button"
              :class="{ active: backgroundMode === option }"
              :aria-label="$t(`idPhoto.backgrounds.${option}`)"
              @click="backgroundMode = option"
            >
              <span
                :class="`swatch swatch--${option}`"
                :style="option === 'custom' ? { background: customBackground } : undefined"
              ></span>
            </button>
          </div>
          <input
            v-if="backgroundMode === 'custom'"
            v-model="customBackground"
            type="color"
            class="wide-color-input"
          />
        </div>

        <div class="control-group outfit-control">
          <label>{{ $t('idPhoto.outfit') }}</label>
          <div class="outfit-grid">
            <button
              v-for="outfit in OUTFITS"
              :key="outfit.id"
              type="button"
              :class="{ active: outfitId === outfit.id }"
              :disabled="outfit.id !== 'none' && aiState !== 'success'"
              @click="chooseOutfit(outfit)"
            >
              <span v-if="outfit.id === 'none'" class="outfit-original">{{
                $t('idPhoto.outfits.noneShort')
              }}</span>
              <img v-else :src="outfit.src" :alt="$t(`idPhoto.outfits.${outfit.id}`)" />
              <small>{{ $t(`idPhoto.outfits.${outfit.id}`) }}</small>
            </button>
          </div>
          <p class="outfit-hint">
            {{ $t(aiState === 'success' ? 'idPhoto.outfitHint' : 'idPhoto.outfitNeedsAi') }}
          </p>
          <span v-if="outfitLoading" class="processing-inline"
            ><LoaderCircle class="spin" :size="15" />{{ $t('idPhoto.outfitLoading') }}</span
          >
        </div>
        <template v-if="outfitId !== 'none'">
          <label class="range-control"
            ><span
              >{{ $t('idPhoto.outfitScale') }}
              <strong>{{ outfitTransform.scale.toFixed(2) }}×</strong></span
            ><input
              v-model.number="outfitTransform.scale"
              type="range"
              min="0.8"
              max="1.8"
              step="0.01"
          /></label>
          <label class="range-control"
            ><span>{{ $t('idPhoto.outfitVertical') }}</span
            ><input
              v-model.number="outfitTransform.offsetY"
              type="range"
              min="0.2"
              max="0.65"
              step="0.01"
          /></label>
        </template>

        <label class="range-control"
          ><span
            >{{ $t('idPhoto.zoom') }} <strong>{{ transform.zoom.toFixed(2) }}×</strong></span
          ><input v-model.number="transform.zoom" type="range" min="0.6" max="2.5" step="0.01"
        /></label>
        <label class="range-control"
          ><span>{{ $t('idPhoto.horizontal') }}</span
          ><input v-model.number="transform.offsetX" type="range" min="-0.5" max="0.5" step="0.01"
        /></label>
        <label class="range-control"
          ><span>{{ $t('idPhoto.vertical') }}</span
          ><input v-model.number="transform.offsetY" type="range" min="-0.5" max="0.5" step="0.01"
        /></label>
        <button class="button button--secondary full-width" type="button" @click="resetEditor">
          <RefreshCcw :size="17" />{{ $t('idPhoto.reset') }}
        </button>

        <div class="segmented-control">
          <label><input v-model="outputFormat" type="radio" value="jpeg" /><span>JPG</span></label>
          <label><input v-model="outputFormat" type="radio" value="png" /><span>PNG</span></label>
        </div>
        <label class="range-control"
          ><span
            >{{ $t('phase3.controls.quality') }} <strong>{{ quality }}%</strong></span
          ><input v-model.number="quality" type="range" min="50" max="100"
        /></label>
        <button
          class="button button--primary full-width"
          type="button"
          :disabled="exportState === 'processing' || !dimensionsValid || aiState === 'loading'"
          @click="exportPhoto"
        >
          <LoaderCircle v-if="exportState === 'processing'" class="spin" :size="18" />
          <Download v-else :size="18" />{{ $t('idPhoto.export') }}
        </button>
        <div v-if="exportState === 'success'" class="export-result-card">
          <span class="success-text"
            ><CheckCircle2 :size="16" />{{
              $t('idPhoto.exportReady', { size: formatFileSize(exportBlob?.size ?? 0) })
            }}</span
          >
          <button class="button button--primary full-width" type="button" @click="downloadPhoto">
            <Download :size="17" />{{ $t('phase3.actions.download') }}
          </button>
        </div>
        <p v-else-if="exportState === 'error'" class="error-text">
          <AlertCircle :size="16" />{{ $t('idPhoto.exportError') }}
        </p>
      </aside>
    </div>

    <p class="tool-disclaimer">{{ $t('idPhoto.disclaimer') }}</p>
  </section>
</template>
