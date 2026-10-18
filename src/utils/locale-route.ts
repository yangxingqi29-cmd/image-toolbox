import type { AppLocale } from '@/types/locale'

const localePattern = /^\/(zh|en)(?=\/|$)/

/**
 * 仅替换语言前缀，保留当前工具路径、查询参数和哈希。
 * 这样切换语言时不会破坏可安全复用的前端编辑状态。
 */
export function switchLocalePath(fullPath: string, locale: AppLocale): string {
  if (localePattern.test(fullPath)) {
    return fullPath.replace(localePattern, `/${locale}`)
  }

  return `/${locale}/`
}

export function localizedPath(locale: AppLocale, slug = ''): string {
  return slug ? `/${locale}/${slug}/` : `/${locale}/`
}
