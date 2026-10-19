import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const projectRoot = resolve(import.meta.dirname, '../..')

describe('Cloudflare deployment configuration', () => {
  it('keeps the root redirect without an SPA rewrite that matches itself', () => {
    const redirects = readFileSync(resolve(projectRoot, 'public/_redirects'), 'utf8')

    expect(redirects).toMatch(/^\/\s+\/zh\/\s+302$/m)
    expect(redirects).not.toMatch(/^\*\s+\/index\.html\s+200$/m)
  })

  it('uses the generated dist directory with the built-in SPA fallback', () => {
    const config = readFileSync(resolve(projectRoot, 'wrangler.jsonc'), 'utf8')

    expect(config).toContain('"directory": "./dist"')
    expect(config).toContain('"not_found_handling": "single-page-application"')
  })

  it('integrates the official Vite plugin so deploy does not auto-configure the project', () => {
    const config = readFileSync(resolve(projectRoot, 'vite.config.ts'), 'utf8')
    const packageJson = JSON.parse(readFileSync(resolve(projectRoot, 'package.json'), 'utf8')) as {
      scripts: Record<string, string>
      devDependencies: Record<string, string>
    }

    expect(config).toContain("from '@cloudflare/vite-plugin'")
    expect(config).toContain("mode === 'test' ? [] : [cloudflare()]")
    expect(packageJson.scripts.deploy).toBe('npm run build && wrangler deploy')
    expect(packageJson.devDependencies).toHaveProperty('@cloudflare/vite-plugin')
    expect(packageJson.devDependencies).toHaveProperty('wrangler')
  })
})
