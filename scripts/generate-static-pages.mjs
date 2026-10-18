import { mkdir, readFile, writeFile, readdir, unlink } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import process from 'node:process'
import { loadEnv } from 'vite'
import { fileURLToPath } from 'node:url'

const projectRoot = dirname(dirname(fileURLToPath(import.meta.url)))
const distDir = join(projectRoot, 'dist')
const template = await readFile(join(distDir, 'index.html'), 'utf8')
// Worker 已显式使用压缩运行时，删除 Rollup 自动收集但不再请求的超限 WASM 副本。
for (const name of await readdir(join(distDir, 'assets'))) {
  if (/^ort-wasm-.*\.wasm$/.test(name)) await unlink(join(distDir, 'assets', name))
}
const zh = JSON.parse(await readFile(join(projectRoot, 'src/i18n/zh-CN.json'), 'utf8'))
const en = JSON.parse(await readFile(join(projectRoot, 'src/i18n/en.json'), 'utf8'))

const tools = [
  ['compressor', 'image-compressor'],
  ['converter', 'image-converter'],
  ['resizer', 'image-resizer'],
  ['cropper', 'image-cropper'],
  ['idPhoto', 'id-photo'],
  ['watermark', 'image-watermark'],
  ['imageToPdf', 'image-to-pdf'],
]
const staticPages = ['about', 'privacy', 'terms', 'contact']
const productionEnv = loadEnv('production', projectRoot, '')
const configuredUrl =
  process.env.VITE_SITE_URL || process.env.SITE_URL || productionEnv.VITE_SITE_URL || ''

function validSiteUrl(value) {
  try {
    const url = new URL(value)
    return url.protocol === 'https:' || url.protocol === 'http:' ? url : null
  } catch {
    return null
  }
}

const siteUrl = validSiteUrl(configuredUrl)

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

function routeDefinitions(locale, messages) {
  const routes = [
    {
      locale,
      path: `/${locale}/`,
      title: messages.meta.homeTitle,
      description: messages.hero.description,
      h1: `${messages.hero.titleStart} ${messages.hero.titleAccent}`,
      type: 'home',
    },
  ]

  tools.forEach(([id, slug]) => {
    routes.push({
      locale,
      path: `/${locale}/${slug}/`,
      title: messages.tools[id].name,
      description: messages.seo.tools[id].intro,
      h1: messages.tools[id].name,
      type: 'tool',
      id,
      slug,
    })
  })
  staticPages.forEach((page) => {
    routes.push({
      locale,
      path: `/${locale}/${page}/`,
      title: messages.pages[page].title,
      description: messages.pages[page].description,
      h1: messages.pages[page].title,
      type: 'page',
      page,
    })
  })
  return routes
}

const routes = [...routeDefinitions('zh', zh), ...routeDefinitions('en', en)]

function toolBody(route, messages) {
  const content = messages.seo.tools[route.id]
  const related = tools.filter(([id]) => id !== route.id).slice(0, 3)
  return `
    <article>
      <h1>${escapeHtml(route.h1)}</h1>
      <p>${escapeHtml(route.description)}</p>
      <section>
        <h2>${escapeHtml(content.guideTitle)}</h2>
        <p>${escapeHtml(content.intro)}</p>
        <h3>${escapeHtml(messages.seo.input)}</h3><p>${escapeHtml(content.input)}</p>
        <h3>${escapeHtml(messages.seo.output)}</h3><p>${escapeHtml(content.output)}</p>
        <h3>${escapeHtml(messages.seo.limitations)}</h3><p>${escapeHtml(content.limitations)}</p>
        <ol><li>${escapeHtml(content.step1)}</li><li>${escapeHtml(content.step2)}</li><li>${escapeHtml(content.step3)}</li></ol>
      </section>
      <section>
        <h2>${escapeHtml(messages.seo.faqTitle)}</h2>
        <h3>${escapeHtml(content.faq1Question)}</h3><p>${escapeHtml(content.faq1Answer)}</p>
        <h3>${escapeHtml(content.faq2Question)}</h3><p>${escapeHtml(content.faq2Answer)}</p>
      </section>
      <nav aria-label="${escapeHtml(messages.seo.relatedTitle)}">
        <h2>${escapeHtml(messages.seo.relatedTitle)}</h2>
        ${related.map(([id, slug]) => `<a href="/${route.locale}/${slug}/">${escapeHtml(messages.tools[id].name)}</a>`).join(' ')}
      </nav>
    </article>`
}

function homeBody(route, messages) {
  return `<article><h1>${escapeHtml(route.h1)}</h1><p>${escapeHtml(route.description)}</p><h2>${escapeHtml(messages.home.toolsTitle)}</h2><nav>${tools.map(([id, slug]) => `<a href="/${route.locale}/${slug}/">${escapeHtml(messages.tools[id].name)}</a>`).join(' ')}</nav><h2>${escapeHtml(messages.home.faqTitle)}</h2><p>${escapeHtml(messages.home.faq1Answer)}</p></article>`
}

function pageBody(route, messages) {
  const content = messages.pages[route.page]
  return `<article><h1>${escapeHtml(route.h1)}</h1><p>${escapeHtml(route.description)}</p>${[1, 2, 3].map((index) => `<section><h2>${escapeHtml(content[`section${index}Title`])}</h2><p>${escapeHtml(content[`section${index}Body`])}</p></section>`).join('')}</article>`
}

function jsonLd(route, messages) {
  const base = {
    '@context': 'https://schema.org',
    name: route.title,
    description: route.description,
    inLanguage: route.locale === 'zh' ? 'zh-CN' : 'en',
  }
  if (route.type !== 'tool')
    return { ...base, '@type': route.type === 'home' ? 'WebSite' : 'WebPage' }
  const content = messages.seo.tools[route.id]
  return [
    {
      ...base,
      '@type': 'SoftwareApplication',
      applicationCategory: 'MultimediaApplication',
      operatingSystem: 'Any',
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: [1, 2].map((index) => ({
        '@type': 'Question',
        name: content[`faq${index}Question`],
        acceptedAnswer: { '@type': 'Answer', text: content[`faq${index}Answer`] },
      })),
    },
  ]
}

function alternatePath(route, locale) {
  return route.path.replace(/^\/(zh|en)\//, `/${locale}/`)
}

function headExtras(route, messages) {
  const fullTitle = `${route.title} | Image Toolbox`
  const canonical = siteUrl ? new URL(route.path, siteUrl).href : ''
  const links = siteUrl
    ? `<link rel="canonical" href="${escapeHtml(canonical)}"><link rel="alternate" hreflang="zh-CN" href="${escapeHtml(new URL(alternatePath(route, 'zh'), siteUrl).href)}"><link rel="alternate" hreflang="en" href="${escapeHtml(new URL(alternatePath(route, 'en'), siteUrl).href)}"><link rel="alternate" hreflang="x-default" href="${escapeHtml(new URL(alternatePath(route, 'en'), siteUrl).href)}">`
    : ''
  return `${links}<meta property="og:title" content="${escapeHtml(fullTitle)}"><meta property="og:description" content="${escapeHtml(route.description)}"><meta property="og:type" content="website">${canonical ? `<meta property="og:url" content="${escapeHtml(canonical)}">` : ''}<meta name="twitter:card" content="summary_large_image"><script id="image-toolbox-jsonld" type="application/ld+json">${JSON.stringify(jsonLd(route, messages)).replaceAll('<', '\\u003c')}</script>`
}

for (const route of routes) {
  const messages = route.locale === 'zh' ? zh : en
  const body =
    route.type === 'tool'
      ? toolBody(route, messages)
      : route.type === 'home'
        ? homeBody(route, messages)
        : pageBody(route, messages)
  const staticApp = `<div id="app"><main class="static-seo-content">${body}</main></div>`
  let html = template
    .replace(/<html lang="[^"]*">/, `<html lang="${route.locale === 'zh' ? 'zh-CN' : 'en'}">`)
    .replace(
      /<title>[\s\S]*?<\/title>/,
      `<title>${escapeHtml(route.title)} | Image Toolbox</title>`,
    )
    .replace(
      /<meta\s+name="description"[\s\S]*?\/>/,
      `<meta name="description" content="${escapeHtml(route.description)}" />`,
    )
    .replace('</head>', `${headExtras(route, messages)}</head>`)
    .replace(/<div id="app">[\s\S]*?<\/div>/, staticApp)

  if (!html.includes('<h1>') || !html.includes('name="description"')) {
    throw new Error(`Static SEO validation failed for ${route.path}`)
  }
  const output = join(distDir, route.path.replace(/^\//, ''), 'index.html')
  await mkdir(dirname(output), { recursive: true })
  await writeFile(output, html)
}

const sitemapUrls = siteUrl
  ? routes
      .map((route) => `  <url><loc>${escapeHtml(new URL(route.path, siteUrl).href)}</loc></url>`)
      .join('\n')
  : '  <!-- Set VITE_SITE_URL during the production build to emit absolute URLs. -->'
await writeFile(
  join(distDir, 'sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${sitemapUrls}\n</urlset>\n`,
)
await writeFile(
  join(distDir, 'robots.txt'),
  `User-agent: *\nAllow: /\n${siteUrl ? `Sitemap: ${new URL('/sitemap.xml', siteUrl).href}\n` : ''}`,
)

// 静态发布包附带主要运行依赖的原始许可文本，保留商业分发所需声明。
const noticePackages = [
  'vue',
  'vue-router',
  'vue-i18n',
  '@lucide/vue',
  '@huggingface/transformers',
  'onnxruntime-web',
  'onnxruntime-common',
  'jspdf',
  'jszip',
]
const notices = []
for (const name of noticePackages) {
  const root = join(projectRoot, 'node_modules', name)
  const metadata = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'))
  const licenseFiles = (await readdir(root)).filter((file) => /^licen[sc]e|^notice/i.test(file))
  notices.push(`${name} ${metadata.version} — ${metadata.license || ''}`)
  for (const file of licenseFiles) {
    try {
      notices.push(await readFile(join(root, file), 'utf8'))
    } catch {
      /* 目录不作为许可正文读取。 */
    }
  }
}
await writeFile(join(distDir, 'third-party-notices.txt'), notices.join('\n\n'))

console.log(
  `Generated ${routes.length} localized static pages${siteUrl ? ` for ${siteUrl.origin}` : ' without production canonical URLs'}.`,
)
