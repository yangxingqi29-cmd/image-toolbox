import { computed, onScopeDispose, ref, shallowRef } from 'vue'
import { ImageProcessingError, toImageIssue } from '@/services/image/errors'
import { IMAGE_LIMITS } from '@/services/image/limits'
import { prepareImageFile } from '@/services/image/prepare'
import type { PreparedImage, UploadFailure } from '@/types/image'

export function useImageFiles() {
  const items = shallowRef<PreparedImage[]>([])
  const failures = ref<UploadFailure[]>([])
  const pendingCount = ref(0)
  const controllers = new Set<AbortController>()
  let generation = 0
  let uploadOrder = 0
  const itemOrder = new Map<string, number>()

  const isLoading = computed(() => pendingCount.value > 0)

  async function addFiles(input: FileList | File[]) {
    const requested = Array.from(input)
    const remainingSlots = Math.max(
      0,
      IMAGE_LIMITS.maxBatchFiles - items.value.length - pendingCount.value,
    )
    const files = requested.slice(0, remainingSlots)
    const activeGeneration = generation
    const orders = files.map(() => uploadOrder++)

    if (requested.length > remainingSlots) {
      failures.value.push({
        id: `limit-${Date.now()}`,
        fileName: requested[remainingSlots]?.name ?? '',
        issue: new ImageProcessingError('tooManyFiles', {
          max: IMAGE_LIMITS.maxBatchFiles,
        }).issue,
      })
    }

    let cursor = 0
    pendingCount.value += files.length

    async function consumeQueue() {
      while (cursor < files.length) {
        if (activeGeneration !== generation) {
          pendingCount.value -= files.length - cursor
          break
        }
        const index = cursor++
        const file = files[index]
        const controller = new AbortController()
        controllers.add(controller)

        try {
          const prepared = await prepareImageFile(file, controller.signal)
          if (activeGeneration !== generation) {
            prepared.decoded.dispose()
            continue
          }
          const retainedBytes = items.value.reduce(
            (sum, item) => sum + item.width * item.height * 4,
            0,
          )
          if (retainedBytes + prepared.width * prepared.height * 4 > 160 * 1024 * 1024) {
            prepared.decoded.dispose()
            throw new ImageProcessingError('memoryRisk', { max: 160 })
          }
          itemOrder.set(prepared.id, orders[index])
          // PDF 和批量结果遵循用户选择顺序，不能取决于哪张图片先解码完。
          items.value = [...items.value, prepared].sort(
            (a, b) => itemOrder.get(a.id)! - itemOrder.get(b.id)!,
          )
        } catch (error) {
          const issue = toImageIssue(error)
          if (issue.code !== 'cancelled') {
            failures.value.push({
              id: `${file.name}-${Date.now()}-${cursor}`,
              fileName: file.name,
              issue,
            })
          }
        } finally {
          controllers.delete(controller)
          pendingCount.value -= 1
        }
      }
    }

    // 最多两个并发解码，避免批量上传时同时展开大量 RGBA 缓冲。
    const workerCount = Math.min(IMAGE_LIMITS.batchConcurrency, files.length)
    await Promise.all(Array.from({ length: workerCount }, () => consumeQueue()))
  }

  function removeFile(id: string) {
    const item = items.value.find((candidate) => candidate.id === id)
    item?.decoded.dispose()
    itemOrder.delete(id)
    items.value = items.value.filter((candidate) => candidate.id !== id)
  }

  function dismissFailure(id: string) {
    failures.value = failures.value.filter((failure) => failure.id !== id)
  }

  function clearAll() {
    generation += 1
    controllers.forEach((controller) => controller.abort())
    controllers.clear()
    items.value.forEach((item) => item.decoded.dispose())
    items.value = []
    itemOrder.clear()
    failures.value = []
  }

  onScopeDispose(clearAll)

  return {
    items,
    failures,
    pendingCount,
    isLoading,
    addFiles,
    removeFile,
    dismissFailure,
    clearAll,
  }
}
