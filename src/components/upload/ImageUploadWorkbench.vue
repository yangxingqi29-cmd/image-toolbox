<script setup lang="ts">
import { onBeforeUnmount, reactive } from 'vue'
import { AlertCircle, CheckCircle2, Download, LoaderCircle, Trash2, X } from '@lucide/vue'
import ImagePreviewCanvas from '@/components/image/ImagePreviewCanvas.vue'
import ImageUploader from '@/components/upload/ImageUploader.vue'
import { useImageFiles } from '@/composables/useImageFiles'
import { createOutputName, downloadBlob } from '@/services/export/download'
import { renderImageToBlob } from '@/services/image/canvas'
import { toImageIssue } from '@/services/image/errors'
import { formatFileSize } from '@/services/image/limits'
import type { ImageIssue, PreparedImage } from '@/types/image'

interface ExportState {
  status: 'idle' | 'processing' | 'success' | 'error'
  issue?: ImageIssue
  outputBytes?: number
}

const { items, failures, pendingCount, isLoading, addFiles, removeFile, dismissFailure, clearAll } =
  useImageFiles()
const exportStates = reactive<Record<string, ExportState>>({})
const exportControllers = new Map<string, AbortController>()

function stateFor(id: string): ExportState {
  return exportStates[id] ?? { status: 'idle' }
}

function issueKey(issue: ImageIssue): string {
  return `phase2.errors.${issue.code}`
}

async function exportPng(item: PreparedImage) {
  const controller = new AbortController()
  exportControllers.get(item.id)?.abort()
  exportControllers.set(item.id, controller)
  exportStates[item.id] = { status: 'processing' }

  try {
    const blob = await renderImageToBlob(item.decoded.source, item.width, item.height, {
      mimeType: 'image/png',
      signal: controller.signal,
    })
    downloadBlob(blob, createOutputName(item.file.name, '-browser-copy', 'png'))
    exportStates[item.id] = { status: 'success', outputBytes: blob.size }
  } catch (error) {
    const issue = toImageIssue(error)
    if (issue.code === 'cancelled') {
      exportStates[item.id] = { status: 'idle' }
    } else {
      exportStates[item.id] = { status: 'error', issue }
    }
  } finally {
    exportControllers.delete(item.id)
  }
}

function remove(item: PreparedImage) {
  exportControllers.get(item.id)?.abort()
  exportControllers.delete(item.id)
  delete exportStates[item.id]
  removeFile(item.id)
}

function clearWorkbench() {
  exportControllers.forEach((controller) => controller.abort())
  exportControllers.clear()
  Object.keys(exportStates).forEach((id) => delete exportStates[id])
  clearAll()
}

onBeforeUnmount(() => {
  exportControllers.forEach((controller) => controller.abort())
  exportControllers.clear()
})
</script>

<template>
  <section class="foundation-workbench" aria-labelledby="foundation-title">
    <div class="foundation-heading">
      <div>
        <span class="eyebrow">{{ $t('phase2.eyebrow') }}</span>
        <h2 id="foundation-title">{{ $t('phase2.title') }}</h2>
        <p>{{ $t('phase2.description') }}</p>
      </div>
      <button
        v-if="items.length || failures.length"
        class="button button--secondary"
        type="button"
        @click="clearWorkbench"
      >
        <Trash2 :size="17" aria-hidden="true" />{{ $t('phase2.clearAll') }}
      </button>
    </div>

    <ImageUploader :disabled="items.length >= 20" @files="addFiles" />

    <div v-if="isLoading" class="processing-banner" role="status">
      <LoaderCircle class="spin" :size="19" aria-hidden="true" />
      {{ $t('phase2.decoding', { count: pendingCount }) }}
    </div>

    <div v-if="failures.length" class="upload-failures" aria-live="polite">
      <article v-for="failure in failures" :key="failure.id" class="upload-failure">
        <AlertCircle :size="19" aria-hidden="true" />
        <span
          ><strong>{{ failure.fileName || $t('phase2.unknownFile') }}</strong
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

    <div v-if="items.length" class="prepared-list">
      <article v-for="item in items" :key="item.id" class="prepared-card">
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
                >{{ item.width }} × {{ item.height }} · {{ formatFileSize(item.file.size) }} ·
                {{ item.format.toUpperCase() }}</span
              >
            </div>
            <button
              class="icon-button"
              type="button"
              :aria-label="$t('phase2.removeFile')"
              @click="remove(item)"
            >
              <Trash2 :size="17" aria-hidden="true" />
            </button>
          </div>

          <div v-if="item.warnings.length" class="file-warnings">
            <span v-for="warning in item.warnings" :key="warning.code">
              <AlertCircle :size="15" aria-hidden="true" />{{
                $t(issueKey(warning), warning.params ?? {})
              }}
            </span>
          </div>

          <div class="prepared-card__status" aria-live="polite">
            <span v-if="stateFor(item.id).status === 'success'" class="success-text">
              <CheckCircle2 :size="16" />{{
                $t('phase2.exportSuccess', {
                  size: formatFileSize(stateFor(item.id).outputBytes ?? 0),
                })
              }}
            </span>
            <span v-else-if="stateFor(item.id).status === 'error'" class="error-text">
              <AlertCircle :size="16" />{{
                $t(issueKey(stateFor(item.id).issue!), stateFor(item.id).issue?.params ?? {})
              }}
            </span>
            <span v-else>{{ $t('phase2.ready') }}</span>
          </div>

          <div class="prepared-card__actions">
            <button
              v-if="stateFor(item.id).status !== 'processing'"
              class="button button--primary"
              type="button"
              @click="exportPng(item)"
            >
              <Download :size="17" aria-hidden="true" />{{ $t('phase2.exportPng') }}
            </button>
            <button
              v-else
              class="button button--secondary"
              type="button"
              @click="exportControllers.get(item.id)?.abort()"
            >
              <LoaderCircle class="spin" :size="17" aria-hidden="true" />{{ $t('phase2.cancel') }}
            </button>
          </div>
        </div>
      </article>
    </div>

    <p class="foundation-privacy">{{ $t('phase2.privacy') }}</p>
  </section>
</template>
