import { fileURLToPath, URL } from 'node:url'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import { viteSingleFile } from 'vite-plugin-singlefile'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  // base: './' 讓資源用相對路徑；viteSingleFile 會再把 JS/CSS 全內嵌進 index.html，
  // 使用者不需架伺服器，直接雙擊 dist/index.html 就能用（需求文件第 3 節）
  base: './',
  plugins: [vue(), tailwindcss(), viteSingleFile()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
})
