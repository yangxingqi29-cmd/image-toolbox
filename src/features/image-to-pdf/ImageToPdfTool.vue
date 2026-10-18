<script setup lang="ts">
import { computed, ref, watch, onBeforeUnmount } from 'vue'
import {
  AlertCircle,
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  Download,
  FileText,
  GripVertical,
  LoaderCircle,
  Trash2,
  X,
} from '@lucide/vue'
import ImagePreviewCanvas from '@/components/image/ImagePreviewCanvas.vue'
import ImageUploader from '@/components/upload/ImageUploader.vue'
import { useImageFiles } from '@/composables/useImageFiles'
import { downloadBlob } from '@/services/export/download'
import { generateImagePdf } from '@/services/export/pdf'
import { formatFileSize } from '@/services/image/limits'

const { items, failures, pendingCount, isLoading, addFiles, removeFile, dismissFailure, clearAll } =
  useImageFiles()
const paper = ref<'a4' | 'letter' | 'custom'>('a4')
const orientation = ref<'portrait' | 'landscape'>('portrait')
const customWidth = ref(210)
const customHeight = ref(297)
const margin = ref(10)
const layout = ref<'single' | 'grid'>('single')
const pdfState = ref<'idle' | 'processing' | 'success' | 'error'>('idle')
const pdfBlob = ref<Blob>()
const progress = ref({ done: 0, total: 0 })
const draggedIndex = ref<number>()
let controller: AbortController | undefined
const pdfPreviewUrl = ref('')

function clearPdf() {
  if (pdfPreviewUrl.value) URL.revokeObjectURL(pdfPreviewUrl.value)
  pdfPreviewUrl.value = ''
  pdfBlob.value = undefined
  pdfState.value = 'idle'
}

function cancelPdf() {
  controller?.abort()
}

const pageSize = computed(() => {
  let width = paper.value === 'letter' ? 215.9 : paper.value === 'custom' ? customWidth.value : 210
  let height =
    paper.value === 'letter' ? 279.4 : paper.value === 'custom' ? customHeight.value : 297
  if (orientation.value === 'landscape' && height > width) [width, height] = [height, width]
  if (orientation.value === 'portrait' && width > height) [width, height] = [height, width]
  return { width, height }
})
const previewPages = computed(() => {
  const count = layout.value === 'grid' ? 4 : 1
  const pages = []
  for (let index = 0; index < items.value.length; index += count) {
    pages.push(items.value.slice(index, index + count))
  }
  return pages
})

function issueKey(code: string): string {
  return `phase2.errors.${code}`
}

function moveItem(from: number, to: number) {
  if (to < 0 || to >= items.value.length || from === to) return
  const next = [...items.value]
  const [moved] = next.splice(from, 1)
  next.splice(to, 0, moved)
  items.value = next
  pdfState.value = 'idle'
  pdfBlob.value = undefined
}

function dropAt(index: number) {
  if (draggedIndex.value === undefined) return
  moveItem(draggedIndex.value, index)
  draggedIndex.value = undefined
}

async function createPdf() {
  if (!items.value.length || pdfState.value === 'processing') return
  clearPdf()
  controller = new AbortController()
  pdfState.value = 'processing'
  pdfBlob.value = undefined
  progress.value = { done: 0, total: items.value.length }
  try {
    pdfBlob.value = await generateImagePdf(
      items.value,
      {
        pageWidthMm: pageSize.value.width,
        pageHeightMm: pageSize.value.height,
        marginMm: Math.max(0, Math.min(40, margin.value)),
        layout: layout.value,
      },
      (done, total) => (progress.value = { done, total }),
      controller.signal,
    )
    pdfPreviewUrl.value = URL.createObjectURL(pdfBlob.value)
    pdfState.value = 'success'
  } catch (error) {
    pdfState.value = error instanceof DOMException && error.name === 'AbortError' ? 'idle' : 'error'
  } finally {
    controller = undefined
  }
}

function downloadPdf() {
  if (pdfBlob.value) downloadBlob(pdfBlob.value, 'image-toolbox.pdf')
}

function resetAll() {
  cancelPdf()
  clearPdf()
  clearAll()
  pdfBlob.value = undefined
  pdfState.value = 'idle'
}

watch([paper, orientation, customWidth, customHeight, margin, layout, items], () => {
  cancelPdf()
  clearPdf()
})
onBeforeUnmount(() => {
  cancelPdf()
  clearPdf()
})
</script>

<template>
  <section class="tool-workbench" aria-labelledby="pdf-title">
    <header class="workbench-title-row">
      <div>
        <span class="eyebrow">{{ $t('pdf.eyebrow') }}</span>
        <h2 id="pdf-title">{{ $t('pdf.title') }}</h2>
        <p>{{ $t('pdf.description') }}</p>
      </div>
      <button v-if="items.length" class="button button--secondary" type="button" @click="resetAll">
        <Trash2 :size="17" />{{ $t('phase3.actions.clear') }}
      </button>
    </header>
    <div class="feature-strip">
      <span><CheckCircle2 :size="16" />{{ $t('pdf.feature1') }}</span
      ><span><CheckCircle2 :size="16" />{{ $t('pdf.feature2') }}</span
      ><span><CheckCircle2 :size="16" />{{ $t('pdf.feature3') }}</span>
    </div>

    <div class="tool-controls pdf-controls">
      <div class="control-group">
        <label>{{ $t('pdf.paper') }}</label
        ><select v-model="paper">
          <option value="a4">A4</option>
          <option value="letter">Letter</option>
          <option value="custom">{{ $t('pdf.custom') }}</option>
        </select>
      </div>
      <div class="control-group">
        <label>{{ $t('pdf.orientation') }}</label>
        <div class="segmented-control">
          <label
            ><input v-model="orientation" type="radio" value="portrait" /><span>{{
              $t('pdf.portrait')
            }}</span></label
          ><label
            ><input v-model="orientation" type="radio" value="landscape" /><span>{{
              $t('pdf.landscape')
            }}</span></label
          >
        </div>
      </div>
      <div class="control-group">
        <label>{{ $t('pdf.layout') }}</label>
        <div class="segmented-control">
          <label
            ><input v-model="layout" type="radio" value="single" /><span>{{
              $t('pdf.single')
            }}</span></label
          ><label
            ><input v-model="layout" type="radio" value="grid" /><span>{{
              $t('pdf.grid')
            }}</span></label
          >
        </div>
      </div>
      <label class="number-control"
        ><span>{{ $t('pdf.margin') }}</span
        ><input v-model.number="margin" type="number" min="0" max="40" /><small>mm</small></label
      >
      <div v-if="paper === 'custom'" class="dimension-controls">
        <label
          ><span>{{ $t('phase3.controls.width') }}</span
          ><input v-model.number="customWidth" type="number" min="50" max="1000" /></label
        ><span>×</span
        ><label
          ><span>{{ $t('phase3.controls.height') }}</span
          ><input v-model.number="customHeight" type="number" min="50" max="1000"
        /></label>
      </div>
    </div>

    <ImageUploader :disabled="items.length >= 20 || pdfState === 'processing'" @files="addFiles" />
    <div v-if="isLoading" class="processing-banner">
      <LoaderCircle class="spin" :size="18" />{{
        $t('phase3.status.preparing', { count: pendingCount })
      }}
    </div>
    <div v-if="failures.length" class="upload-failures">
      <article v-for="failure in failures" :key="failure.id" class="upload-failure">
        <AlertCircle :size="19" /><span
          ><strong>{{ failure.fileName }}</strong
          >{{ $t(issueKey(failure.issue.code), failure.issue.params ?? {}) }}</span
        ><button type="button" @click="dismissFailure(failure.id)"><X :size="17" /></button>
      </article>
    </div>

    <div v-if="items.length" class="pdf-layout">
      <div class="pdf-order-list">
        <h3>{{ $t('pdf.orderTitle') }}</h3>
        <article
          v-for="(item, index) in items"
          :key="item.id"
          draggable="true"
          @dragstart="draggedIndex = index"
          @dragover.prevent
          @drop="dropAt(index)"
        >
          <GripVertical :size="18" />
          <div class="pdf-thumb">
            <ImagePreviewCanvas
              :source="item.decoded.source"
              :width="item.width"
              :height="item.height"
              :alt="item.file.name"
            />
          </div>
          <div>
            <strong>{{ index + 1 }}. {{ item.file.name }}</strong
            ><span
              >{{ item.width }} × {{ item.height }} · {{ formatFileSize(item.file.size) }}</span
            >
          </div>
          <div class="inline-actions">
            <button
              class="icon-button"
              type="button"
              :disabled="index === 0"
              @click="moveItem(index, index - 1)"
            >
              <ArrowUp :size="15" /></button
            ><button
              class="icon-button"
              type="button"
              :disabled="index === items.length - 1"
              @click="moveItem(index, index + 1)"
            >
              <ArrowDown :size="15" /></button
            ><button class="icon-button" type="button" @click="removeFile(item.id)">
              <Trash2 :size="15" />
            </button>
          </div>
        </article>
      </div>

      <div class="pdf-preview-panel">
        <h3>{{ $t('pdf.previewTitle') }}</h3>
        <div class="pdf-pages">
          <div
            v-for="(page, pageIndex) in previewPages"
            :key="pageIndex"
            class="pdf-page"
            :style="{
              aspectRatio: `${pageSize.width} / ${pageSize.height}`,
              padding: `${Math.min(35, (margin / pageSize.width) * 100)}%`,
            }"
            :class="{
              'pdf-page--landscape': orientation === 'landscape',
              'pdf-page--grid': layout === 'grid',
            }"
          >
            <div v-for="entry in page" :key="entry.id" class="pdf-page-image">
              <ImagePreviewCanvas
                :source="entry.decoded.source"
                :width="entry.width"
                :height="entry.height"
                :alt="entry.file.name"
              />
            </div>
            <small>{{ pageIndex + 1 }}</small>
          </div>
        </div>
      </div>
    </div>

    <div v-if="items.length" class="process-action-row">
      <div>
        <strong>{{ $t('pdf.ready', { count: items.length }) }}</strong
        ><span>{{ pageSize.width.toFixed(1) }} × {{ pageSize.height.toFixed(1) }} mm</span>
      </div>
      <button
        class="button button--primary"
        type="button"
        :disabled="pdfState === 'processing'"
        @click="createPdf"
      >
        <LoaderCircle v-if="pdfState === 'processing'" class="spin" :size="18" /><FileText
          v-else
          :size="18"
        />{{ pdfState === 'processing' ? $t('pdf.progress', progress) : $t('pdf.action') }}
      </button>
      <button
        v-if="pdfState === 'processing'"
        class="button button--secondary"
        type="button"
        @click="cancelPdf"
      >
        {{ $t('phase3.actions.cancel') }}
      </button>
    </div>
    <iframe
      v-if="pdfPreviewUrl"
      :src="pdfPreviewUrl"
      :title="$t('pdf.previewTitle')"
      class="pdf-document-preview"
    ></iframe>
    <div v-if="pdfState === 'success'" class="export-result-card">
      <span class="success-text"
        ><CheckCircle2 :size="17" />{{
          $t('pdf.success', { size: formatFileSize(pdfBlob?.size ?? 0) })
        }}</span
      ><button class="button button--primary" type="button" @click="downloadPdf">
        <Download :size="17" />{{ $t('pdf.download') }}
      </button>
    </div>
    <p v-else-if="pdfState === 'error'" class="error-text">
      <AlertCircle :size="17" />{{ $t('pdf.error') }}
    </p>
  </section>
</template>
