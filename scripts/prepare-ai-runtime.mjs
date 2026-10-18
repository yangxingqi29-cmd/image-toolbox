import { readFile, mkdir, writeFile, rm } from 'node:fs/promises'
import { gzipSync } from 'node:zlib'
import { fileURLToPath } from 'node:url'

// Pages 单文件上限为 25 MiB；预先压缩运行时，浏览器加载时显式解压。
const runtime = fileURLToPath(
  import.meta.resolve('onnxruntime-web/ort-wasm-simd-threaded.asyncify.wasm'),
)
const destination = new URL('../public/ai-runtime/', import.meta.url)
await mkdir(destination, { recursive: true })
await rm(new URL('ort.wasm.gz', destination), { force: true })
await writeFile(
  new URL('ort.runtime.bin', destination),
  gzipSync(await readFile(runtime), { level: 9 }),
)
