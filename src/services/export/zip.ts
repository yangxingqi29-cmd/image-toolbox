export interface ZipEntry {
  name: string
  data: Blob
}

function uniqueName(name: string, used: Set<string>): string {
  if (!used.has(name)) {
    used.add(name)
    return name
  }
  const dot = name.lastIndexOf('.')
  const base = dot > 0 ? name.slice(0, dot) : name
  const extension = dot > 0 ? name.slice(dot) : ''
  let index = 2
  while (used.has(`${base}-${index}${extension}`)) index += 1
  const result = `${base}-${index}${extension}`
  used.add(result)
  return result
}

export async function createZipBlob(
  entries: ZipEntry[],
  onProgress?: (percent: number) => void,
): Promise<Blob> {
  const { default: JSZip } = await import('jszip')
  const archive = new JSZip()
  const usedNames = new Set<string>()
  entries.forEach((entry) => archive.file(uniqueName(entry.name, usedNames), entry.data))
  return archive.generateAsync(
    { type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } },
    (metadata) => onProgress?.(Math.round(metadata.percent)),
  )
}
