import { test, expect } from '@playwright/test'
import { resolve } from 'node:path'
import { existsSync } from 'node:fs'

test('real MODNet portrait segmentation @ai', async ({ page }) => {
  test.skip(
    !existsSync(resolve('tests/e2e/portrait.jpg')),
    'Provide an authorized portrait fixture for the optional AI visual check.',
  )
  test.setTimeout(240_000)
  await page.goto('/zh/id-photo/')
  await page.locator('input[type=file]').setInputFiles(resolve('tests/e2e/portrait.jpg'))
  await page.getByRole('button', { name: '开始 AI 抠图', exact: true }).click()
  await expect(
    page.locator('.id-photo-preview-panel > .success-text, .id-photo-preview-panel > .error-text'),
  ).toBeVisible({ timeout: 210_000 })
  await expect(page.locator('.id-photo-preview-panel > .success-text')).toBeVisible({
    timeout: 1000,
  })
  await page.getByRole('button', { name: '透明', exact: true }).click()
  const beforeOutfit = await page
    .locator('.id-photo-preview-canvas')
    .evaluate((element) => (element as HTMLCanvasElement).toDataURL())
  await page.getByRole('button', { name: /深蓝西装/ }).click()
  await expect(page.locator('.outfit-grid button.active')).toContainText('深蓝西装')
  await expect
    .poll(() =>
      page
        .locator('.id-photo-preview-canvas')
        .evaluate((element) => (element as HTMLCanvasElement).toDataURL()),
    )
    .not.toBe(beforeOutfit)
  await page.evaluate(() => window.scrollTo(0, 0))
  await page.screenshot({ path: 'test-results/portrait-segmentation.png', fullPage: true })
  const alpha = await page.locator('.id-photo-preview-canvas').evaluate((element) => {
    const canvas = element as HTMLCanvasElement
    const pixels = canvas.getContext('2d')!.getImageData(0, 0, canvas.width, canvas.height).data
    let transparent = 0
    let opaque = 0
    for (let i = 3; i < pixels.length; i += 4) {
      if (pixels[i] < 20) transparent += 1
      if (pixels[i] > 235) opaque += 1
    }
    const alphaAt = (x: number, y: number) =>
      pixels[(Math.floor(y * canvas.height) * canvas.width + Math.floor(x * canvas.width)) * 4 + 3]
    return {
      transparent,
      opaque,
      total: pixels.length / 4,
      hair: alphaAt(0.5, 0.14),
      face: alphaAt(0.5, 0.5),
    }
  })
  expect(alpha.transparent).toBeGreaterThan(alpha.total * 0.05)
  expect(alpha.opaque).toBeGreaterThan(alpha.total * 0.1)
  expect(alpha.hair).toBeGreaterThan(235)
  expect(alpha.face).toBeGreaterThan(235)
})
