import type { OutfitDefinition } from '@/types/id-photo'

/**
 * 服装素材为本项目生成的透明图层，不含人物或身份特征。
 * 默认位置针对竖版证件照，用户仍可按颈肩位置微调。
 */
export const OUTFITS: OutfitDefinition[] = [
  { id: 'none', defaultScale: 1, defaultOffsetY: 0 },
  {
    id: 'navySuit',
    src: '/outfits/navy-suit-v2.png',
    defaultScale: 1.36,
    defaultOffsetY: 0.5,
  },
  {
    id: 'womenBlazer',
    src: '/outfits/women-blazer.png',
    defaultScale: 1.32,
    defaultOffsetY: 0.48,
  },
  {
    id: 'whiteShirt',
    src: '/outfits/white-shirt-v2.png',
    defaultScale: 1.3,
    defaultOffsetY: 0.45,
  },
  {
    id: 'blueShirtTie',
    src: '/outfits/blue-shirt-tie-v2.png',
    defaultScale: 1.32,
    defaultOffsetY: 0.44,
  },
]
