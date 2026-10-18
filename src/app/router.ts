import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import { i18n } from '@/i18n'
import { tools } from '@/data/tools'
import { isAppLocale, type AppLocale } from '@/types/locale'
import { updatePageMeta } from '@/services/seo/meta'

const toolRoutes: RouteRecordRaw[] = tools.map((tool) => ({
  path: `/:locale(zh|en)/${tool.slug}/`,
  name: tool.id,
  component: () => import('@/views/ToolIntroView.vue'),
  props: { toolId: tool.id },
  meta: { titleKey: `tools.${tool.id}.name` },
}))

const routes: RouteRecordRaw[] = [
  { path: '/', redirect: '/zh/' },
  {
    path: '/:locale(zh|en)/',
    name: 'home',
    component: () => import('@/views/HomeView.vue'),
    meta: { titleKey: 'meta.homeTitle' },
  },
  ...toolRoutes,
  {
    path: '/:locale(zh|en)/:page(about|privacy|terms|contact)/',
    name: 'static-page',
    component: () => import('@/views/StaticPageView.vue'),
  },
  { path: '/:pathMatch(.*)*', redirect: '/zh/' },
]

export const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior(to, _from, savedPosition) {
    if (savedPosition) return savedPosition
    if (to.hash) return { el: to.hash, behavior: 'smooth' }
    return { top: 0 }
  },
})

router.beforeEach((to) => {
  const routeLocale = to.params.locale
  const locale: AppLocale = isAppLocale(routeLocale) ? routeLocale : 'zh'
  i18n.global.locale.value = locale
  document.documentElement.lang = locale === 'zh' ? 'zh-CN' : 'en'
})

router.afterEach(updatePageMeta)
