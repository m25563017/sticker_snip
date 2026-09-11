import { fileURLToPath, URL } from 'node:url'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import { viteSingleFile } from 'vite-plugin-singlefile'
// 用 'vitest/config' 的 defineConfig（是 vite 版本的超集），
// 才能在同一份設定檔裡多出 `test` 欄位並拿到型別提示
import { defineConfig } from 'vitest/config'

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
  test: {
    // lib/ 和 stores/ 的純邏輯測試不需要瀏覽器 DOM，用 node 環境跑最快；
    // 之後若要測會操作 window/canvas 的元件，再於該測試檔頂端加
    // `// @vitest-environment jsdom` 覆蓋即可，不用整專案都背 jsdom 的開銷
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      // 先只針對「數學題」性質的程式碼算覆蓋率（report-rules 要求 80%）；
      // components/ 的畫面互動測試留到寫 @vue/test-utils 時再納入
      include: ['src/lib/**', 'src/stores/**'],
    },
  },
})
