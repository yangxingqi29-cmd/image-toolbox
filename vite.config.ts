import { fileURLToPath, URL } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [vue(), tailwindcss()],
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
})
