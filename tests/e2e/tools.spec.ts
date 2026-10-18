import { test, expect, type Download, type Page } from '@playwright/test'
import JSZip from 'jszip'

// 直接构造 PNG 字节，不依赖外部图片或用户文件，确保测试不会触碰个人照片。
async function fixture(page: Page) {
  const bytes = await page.evaluate(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 640
    canvas.height = 480
    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = '#ff0000'
    ctx.fillRect(0, 0, 320, 480)
    ctx.fillStyle = '#0000ff'
    ctx.fillRect(320, 0, 320, 480)
    return canvas.toDataURL('image/png').split(',')[1]
  })
  return { name: 'sample.png', mimeType: 'image/png', buffer: Buffer.from(bytes, 'base64') }
}

async function downloadBytes(download: Download) {
  const stream = await download.createReadStream()
  if (!stream) throw new Error('Download stream unavailable')
  const chunks: Buffer[] = []
  for await (const chunk of stream) chunks.push(Buffer.from(chunk))
  return Buffer.concat(chunks)
}

function pngSize(bytes: Buffer) {
  expect(bytes.subarray(1, 4).toString()).toBe('PNG')
  return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) }
}

test('converter exports a real JPEG and ZIP contains both files', async ({ page }) => {
  await page.goto('/zh/image-converter/')
  const image = await fixture(page)
  await page.locator('input[type=file]').setInputFiles([image, { ...image, name: 'other.png' }])
  await page.getByText('JPG', { exact: true }).click()
  await page.getByRole('button', { name: '开始转换', exact: true }).click()
  await expect(page.getByRole('button', { name: '下载结果', exact: true })).toHaveCount(2)
  const single = page.waitForEvent('download')
  await page.getByRole('button', { name: '下载结果', exact: true }).first().click()
  const jpeg = await downloadBytes(await single)
  expect(jpeg.subarray(0, 3)).toEqual(Buffer.from([0xff, 0xd8, 0xff]))
  const zipped = page.waitForEvent('download')
  await page.getByRole('button', { name: '打包下载 ZIP', exact: true }).click()
  const zip = await JSZip.loadAsync(await downloadBytes(await zipped))
  expect(Object.keys(zip.files)).toHaveLength(2)
})

test('resizer exports the selected pixel dimensions', async ({ page }) => {
  await page.goto('/zh/image-resizer/')
  await page.locator('input[type=file]').setInputFiles(await fixture(page))
  await expect(page.locator('.prepared-card')).toHaveCount(1)
  await page.getByLabel('宽度', { exact: true }).fill('320')
  await page.getByRole('button', { name: '调整尺寸', exact: true }).click()
  const downloaded = page.waitForEvent('download')
  await page.getByRole('button', { name: '下载结果', exact: true }).click()
  expect(pngSize(await downloadBytes(await downloaded))).toEqual({ width: 320, height: 240 })
})

test('cropper exports a square from a 4:3 source', async ({ page }) => {
  await page.goto('/zh/image-cropper/')
  await page.locator('input[type=file]').setInputFiles(await fixture(page))
  await page.locator('.cropper-sidebar select').selectOption('1:1')
  await page.getByText('PNG', { exact: true }).click()
  await page.getByRole('button', { name: '生成裁剪结果', exact: true }).click()
  const downloaded = page.waitForEvent('download')
  await page.getByRole('button', { name: '下载结果', exact: true }).click()
  expect(pngSize(await downloadBytes(await downloaded))).toEqual({ width: 480, height: 480 })
})

test('watermark writes changed pixels and PDF contains two pages', async ({ page }) => {
  await page.goto('/zh/image-watermark/')
  const image = await fixture(page)
  await page.locator('input[type=file]').last().setInputFiles(image)
  await page.getByRole('button', { name: '添加水印', exact: true }).click()
  const downloaded = page.waitForEvent('download')
  await page.getByRole('button', { name: '下载结果', exact: true }).click()
  const watermarked = await downloadBytes(await downloaded)
  expect(pngSize(watermarked)).toEqual({ width: 640, height: 480 })
  expect(watermarked.equals(image.buffer)).toBe(false)
  await page.goto('/zh/image-to-pdf/')
  await page.locator('input[type=file]').setInputFiles([image, { ...image, name: 'second.png' }])
  await expect(page.locator('.pdf-order-list article')).toHaveCount(2)
  await page.getByRole('button', { name: '生成 PDF', exact: true }).click()
  const pdfDownload = page.waitForEvent('download')
  await page.getByRole('button', { name: '下载 PDF', exact: true }).click()
  const pdf = await downloadBytes(await pdfDownload)
  expect(pdf.subarray(0, 5).toString()).toBe('%PDF-')
  expect(pdf.toString('latin1').match(/\/Type \/Page\b/g)).toHaveLength(2)
})

test('ID editor exports preset dimensions and handles AI cancellation', async ({ page }) => {
  await page.goto('/zh/id-photo/')
  await page.locator('input[type=file]').setInputFiles(await fixture(page))
  await page.getByText('PNG', { exact: true }).click()
  await page.getByRole('button', { name: '生成证件照', exact: true }).click()
  const downloaded = page.waitForEvent('download')
  await page.getByRole('button', { name: '下载结果', exact: true }).click()
  expect(pngSize(await downloadBytes(await downloaded))).toEqual({ width: 295, height: 413 })
  await page.getByRole('button', { name: '开始 AI 抠图', exact: true }).click()
  await page.getByRole('button', { name: '取消处理', exact: true }).click()
  await expect(page.getByRole('button', { name: '开始 AI 抠图', exact: true })).toBeVisible()
})

test('static content, mobile layout, language and disabled ads', async ({ page, request }) => {
  const html = await (await request.get('/zh/id-photo/')).text()
  expect(html).toContain('<h1>AI 证件照</h1>')
  expect(html).toContain('FAQPage')
  await page.setViewportSize({ width: 390, height: 844 })
  for (const slug of ['id-photo', 'image-watermark', 'image-to-pdf']) {
    await page.goto(`/zh/${slug}/`)
    await expect(page.locator('.tool-workbench')).toBeVisible()
    expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false)
    expect(await page.locator('script[src*="googlesyndication"]').count()).toBe(0)
  }
  await page.getByRole('link', { name: '切换到英文' }).click()
  await expect(page).toHaveURL(/\/en\/image-to-pdf\//)
})
