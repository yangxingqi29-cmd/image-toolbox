<script setup lang="ts">
import { ref } from 'vue'
import { Images, UploadCloud } from '@lucide/vue'

const props = withDefaults(
  defineProps<{
    disabled?: boolean
    multiple?: boolean
    singlePurpose?: 'crop' | 'portrait'
  }>(),
  { multiple: true, singlePurpose: 'crop' },
)
const emit = defineEmits<{ files: [files: File[]] }>()

const input = ref<HTMLInputElement | null>(null)
const isDragging = ref(false)

function forwardFiles(files: FileList | null) {
  if (props.disabled || !files?.length) return
  emit('files', Array.from(files))
  if (input.value) input.value.value = ''
}

function handleDrop(event: DragEvent) {
  isDragging.value = false
  forwardFiles(event.dataTransfer?.files ?? null)
}
</script>

<template>
  <div
    class="image-uploader"
    :class="{ 'image-uploader--dragging': isDragging, 'image-uploader--disabled': disabled }"
    @dragenter.prevent="isDragging = true"
    @dragover.prevent="isDragging = true"
    @dragleave.prevent="isDragging = false"
    @drop.prevent="handleDrop"
  >
    <input
      ref="input"
      class="sr-only"
      type="file"
      accept="image/jpeg,image/png,image/webp"
      :multiple="multiple"
      :disabled="disabled"
      @change="forwardFiles(($event.target as HTMLInputElement).files)"
    />
    <span class="image-uploader__icon"><UploadCloud :size="30" aria-hidden="true" /></span>
    <div>
      <strong>{{ $t('phase2.upload.title') }}</strong>
      <p>
        {{
          $t(
            multiple
              ? 'phase2.upload.description'
              : singlePurpose === 'portrait'
                ? 'phase2.upload.portraitDescription'
                : 'phase2.upload.singleDescription',
          )
        }}
      </p>
    </div>
    <button
      class="button button--primary"
      type="button"
      :disabled="disabled"
      @click="input?.click()"
    >
      <Images :size="18" aria-hidden="true" />
      {{
        $t(
          multiple
            ? 'phase2.upload.button'
            : singlePurpose === 'portrait'
              ? 'phase2.upload.portraitButton'
              : 'phase2.upload.singleButton',
        )
      }}
    </button>
    <small>{{ $t(multiple ? 'phase2.upload.limits' : 'phase2.upload.singleLimits') }}</small>
  </div>
</template>
