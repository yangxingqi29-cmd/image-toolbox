import { fileURLToPath, URL } from 'node:url'
import { cloudflare } from '@cloudflare/vite-plugin'
import tailwindcss from '@tailwindcss/vite'
import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vitest/config'

export default defineConfig(({ mode }) => ({
  // Cloudflare 插件负责生成 Worker 部署产物，避免 Wrangler 在部署时再次自动初始化项目。
  // Vitest 也读取此配置，但测试模式不需要 Worker 环境，否则会重复创建 Vite server。
  plugins: [vue(), tailwindcss(), ...(mode === 'test' ? [] : [cloudflare()])],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    exclude: ['tests/e2e/**', 'node_modules/**', 'dist/**'],
    environment: 'happy-dom',
    setupFiles: ['./tests/setup.ts'],
    css: true,
  },
  build: {
    target: 'es2022',
    sourcemap: true,
  },
  worker: {
    // AI Worker 需要动态加载 Transformers.js，因此使用支持代码分包的 ES 模块格式。
    format: 'es',
  },
}))
