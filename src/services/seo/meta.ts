import type { RouteLocationNormalizedLoaded } from 'vue-router'
import { i18n } from '@/i18n'
import { tools } from '@/data/tools'
import { isAppLocale, type AppLocale } from '@/types/locale'

function upsertMeta(selector: string, attributes: Record<string, string>) {
  let element = document.head.querySelector<HTMLMetaElement>(selector)
  if (!element) {
    element = document.createElement('meta')
    document.head.append(element)
  }
  Object.entries(attributes).forEach(([key, value]) => element?.setAttribute(key, value))
}

function clearManagedLinks() {
  document.head
    .querySelectorAll(
      '[data-image-toolbox-seo], link[rel="canonical"], link[rel="alternate"][hreflang]',
    )
    .forEach((element) => element.remove())
}

function appendLink(rel: string, href: string, hreflang?: string) {
  const link = document.createElement('link')
  link.rel = rel
  link.href = href
  if (hreflang) link.hreflang = hreflang
  link.dataset.imageToolboxSeo = 'true'
  document.head.append(link)
}

function pageInfo(route: RouteLocationNormalizedLoaded) {
  const locale: AppLocale = isAppLocale(route.params.locale) ? route.params.locale : 'zh'
  const page = typeof route.params.page === 'string' ? route.params.page : null
  const tool = tools.find((candidate) => candidate.id === route.name)

  if (tool) {
    return {
      locale,
      title: i18n.global.t(`tools.${tool.id}.name`),
      description: i18n.global.t(`seo.tools.${tool.id}.intro`),
      type: 'tool' as const,
      toolId: tool.id,
    }
  }
  if (page) {
    return {
      locale,
      title: i18n.global.t(`pages.${page}.title`),
      description: i18n.global.t(`pages.${page}.description`),
      type: 'page' as const,
    }
  }
  return {
    locale,
    title: i18n.global.t('meta.homeTitle'),
    description: i18n.global.t('hero.description'),
    type: 'home' as const,
  }
}

export function updatePageMeta(route: RouteLocationNormalizedLoaded) {
  const info = pageInfo(route)
  const fullTitle = `${info.title} | Image Toolbox`
  document.title = fullTitle
  upsertMeta('meta[name="description"]', { name: 'description', content: info.description })
  upsertMeta('meta[property="og:title"]', { property: 'og:title', content: fullTitle })
  upsertMeta('meta[property="og:description"]', {
    property: 'og:description',
    content: info.description,
  })
  upsertMeta('meta[property="og:type"]', { property: 'og:type', content: 'website' })
  upsertMeta('meta[name="twitter:card"]', {
    name: 'twitter:card',
    content: 'summary_large_image',
  })

  clearManagedLinks()
  const configuredSiteUrl = import.meta.env.VITE_SITE_URL?.trim()
  if (configuredSiteUrl) {
    try {
      const siteUrl = new URL(configuredSiteUrl)
      const canonical = new URL(route.path, siteUrl).href
      const defaultPath = route.path.replace(/^\/(zh|en)\//, '/en/')
      appendLink('canonical', canonical)
      appendLink(
        'alternate',
        new URL(route.path.replace(/^\/(zh|en)\//, '/zh/'), siteUrl).href,
        'zh-CN',
      )
      appendLink(
        'alternate',
        new URL(route.path.replace(/^\/(zh|en)\//, '/en/'), siteUrl).href,
        'en',
      )
      appendLink('alternate', new URL(defaultPath, siteUrl).href, 'x-default')
      upsertMeta('meta[property="og:url"]', { property: 'og:url', content: canonical })
    } catch {
      // 域名未配置或格式无效时不输出伪造 canonical。
    }
  }

  document.querySelector('#image-toolbox-jsonld')?.remove()
  const script = document.createElement('script')
  script.id = 'image-toolbox-jsonld'
  script.type = 'application/ld+json'
  const base = {
    '@context': 'https://schema.org',
    name: info.title,
    description: info.description,
    inLanguage: info.locale === 'zh' ? 'zh-CN' : 'en',
  }
  script.textContent = JSON.stringify(
    info.type === 'tool'
      ? {
          ...base,
          '@type': 'SoftwareApplication',
          applicationCategory: 'MultimediaApplication',
          operatingSystem: 'Any',
          offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
        }
      : { ...base, '@type': info.type === 'home' ? 'WebSite' : 'WebPage' },
  )
  document.head.append(script)
}
