import { chromium } from '@playwright/test'
import { mkdir } from 'node:fs/promises'

const browser = await chromium.launch({ channel: 'msedge', headless: true })
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } })
  await page.goto('http://127.0.0.1:4173/zh/')
  await page.locator('#tools').waitFor()
  await mkdir(new URL('../docs/screenshots/', import.meta.url), { recursive: true })
  await page.screenshot({ path: 'docs/screenshots/home.png' })
  await page.locator('#tools').scrollIntoViewIfNeeded()
  await page.screenshot({ path: 'docs/screenshots/tools.png' })
} finally {
  await browser.close()
}
