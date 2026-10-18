import type { Component } from 'vue'

export type ToolCategory = 'optimize' | 'convert' | 'resize' | 'idPhoto' | 'edit' | 'export'

export interface ToolDefinition {
  id: string
  slug: string
  category: ToolCategory
  icon: Component
  featured?: boolean
  phase: number
}

export interface CategoryDefinition {
  id: ToolCategory
  icon: Component
}
