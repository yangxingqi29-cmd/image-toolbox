import {
  BadgeCheck,
  Crop,
  FileImage,
  FileOutput,
  ImageDown,
  Maximize2,
  Palette,
  ScanFace,
  Shapes,
  Stamp,
} from '@lucide/vue'
import type { CategoryDefinition, ToolDefinition } from '@/types/tool'

export const categories: CategoryDefinition[] = [
  { id: 'optimize', icon: ImageDown },
  { id: 'convert', icon: Shapes },
  { id: 'resize', icon: Maximize2 },
  { id: 'idPhoto', icon: BadgeCheck },
  { id: 'edit', icon: Palette },
  { id: 'export', icon: FileOutput },
]

/**
 * 工具目录只保存稳定标识和路由信息，名称与说明统一从 i18n 读取。
 * phase 用于如实标注开发阶段，避免把尚未完成的工具描述为可用功能。
 */
export const tools: ToolDefinition[] = [
  {
    id: 'compressor',
    slug: 'image-compressor',
    category: 'optimize',
    icon: ImageDown,
    featured: true,
    phase: 3,
  },
  {
    id: 'converter',
    slug: 'image-converter',
    category: 'convert',
    icon: FileImage,
    featured: true,
    phase: 3,
  },
  {
    id: 'resizer',
    slug: 'image-resizer',
    category: 'resize',
    icon: Maximize2,
    featured: true,
    phase: 3,
  },
  {
    id: 'cropper',
    slug: 'image-cropper',
    category: 'resize',
    icon: Crop,
    phase: 3,
  },
  {
    id: 'idPhoto',
    slug: 'id-photo',
    category: 'idPhoto',
    icon: ScanFace,
    featured: true,
    phase: 4,
  },
  {
    id: 'watermark',
    slug: 'image-watermark',
    category: 'edit',
    icon: Stamp,
    phase: 5,
  },
  {
    id: 'imageToPdf',
    slug: 'image-to-pdf',
    category: 'export',
    icon: FileOutput,
    phase: 5,
  },
]
