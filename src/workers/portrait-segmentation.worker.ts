/// <reference lib="webworker" />

interface SegmentRequest {
  type: 'segment'
  file: Blob
}

interface RawImageResult {
  data: Uint8Array | Uint8ClampedArray
  width: number
  height: number
}

type Segmenter = ((input: Blob) => Promise<RawImageResult>) & {
  dispose?: () => Promise<void>
}

const workerScope = self as unknown as DedicatedWorkerGlobalScope

function emitProgress(value: unknown) {
  if (!value || typeof value !== 'object') return
  const record = value as Record<string, unknown>
  workerScope.postMessage({
    type: 'progress',
    status: typeof record.status === 'string' ? record.status : 'loading',
    progress: typeof record.progress === 'number' ? record.progress : undefined,
  })
}

async function createSegmenter(): Promise<Segmenter> {
  const transformers = await import('@huggingface/transformers')
  transformers.env.allowLocalModels = false
  transformers.env.useBrowserCache = true
  transformers.env.useWasmCache = false
  if (transformers.env.backends.onnx.wasm) {
    const response = await fetch('/ai-runtime/ort.runtime.bin')
    if (!response.ok || !response.body) throw new Error('runtimeDownloadFailed')
    const decompressed = response.body.pipeThrough(new DecompressionStream('gzip'))
    transformers.env.backends.onnx.wasm.wasmBinary = await new Response(decompressed).arrayBuffer()
    transformers.env.backends.onnx.wasm.numThreads = 1
  }

  // 量化/WebGPU 路径在真实样例出现头发蒙版损坏，默认使用已人工核验的全精度 WASM。
  const segmenter = await transformers.pipeline('background-removal', 'Xenova/modnet', {
    device: 'wasm',
    dtype: 'fp32',
    revision: 'fa2fa546052fba4c08921230a26cc69a333fca12',
    progress_callback: emitProgress,
  })
  return segmenter as unknown as Segmenter
}

workerScope.onmessage = async (event: MessageEvent<SegmentRequest>) => {
  if (event.data.type !== 'segment') return
  let segmenter: Segmenter | undefined

  try {
    segmenter = await createSegmenter()
    workerScope.postMessage({ type: 'progress', status: 'inference' })
    const output = await segmenter(event.data.file)
    const pixels = new Uint8ClampedArray(output.data)
    workerScope.postMessage(
      {
        type: 'result',
        width: output.width,
        height: output.height,
        pixels: pixels.buffer,
      },
      [pixels.buffer],
    )
  } catch (error) {
    workerScope.postMessage({
      type: 'error',
      message: error instanceof Error ? error.message : 'segmentationFailed',
    })
  } finally {
    await segmenter?.dispose?.()
  }
}

export {}
