import { describe, expect, it } from 'vitest'
import en from '@/i18n/en.json'
import zh from '@/i18n/zh-CN.json'
import { categories, tools } from '@/data/tools'

describe('tool catalog', () => {
  it('uses unique stable ids and slugs', () => {
    expect(new Set(tools.map((tool) => tool.id)).size).toBe(tools.length)
    expect(new Set(tools.map((tool) => tool.slug)).size).toBe(tools.length)
  })

  it('keeps every tool in a declared category', () => {
    const categoryIds = new Set(categories.map((category) => category.id))
    expect(tools.every((tool) => categoryIds.has(tool.category))).toBe(true)
  })

  it('has Chinese and English names and descriptions for every catalog item', () => {
    for (const tool of tools) {
      expect(zh.tools[tool.id as keyof typeof zh.tools]?.name).toBeTruthy()
      expect(zh.tools[tool.id as keyof typeof zh.tools]?.description).toBeTruthy()
      expect(en.tools[tool.id as keyof typeof en.tools]?.name).toBeTruthy()
      expect(en.tools[tool.id as keyof typeof en.tools]?.description).toBeTruthy()
    }

    for (const category of categories) {
      expect(zh.categories[category.id].name).toBeTruthy()
      expect(en.categories[category.id].name).toBeTruthy()
    }
  })
})
