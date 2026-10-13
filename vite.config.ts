import { fileURLToPath, URL } from 'node:url'
import type { Plugin } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import { viteSingleFile } from 'vite-plugin-singlefile'
// 用 'vitest/config' 的 defineConfig（是 vite 版本的超集），
// 才能在同一份設定檔裡多出 `test` 欄位並拿到型別提示
import { defineConfig } from 'vitest/config'

/**
 * 內容安全政策（CSP）：告訴瀏覽器這個網頁「只准做哪些事」，其餘一律擋下。
 * 最關鍵的是 connect-src 'none'：網頁不能發出任何網路請求，
 * 「圖片不會上傳」就由瀏覽器強制執行，就算某個套件被植入惡意程式也送不出去。
 *
 * - script／style 需要 'unsafe-inline'：單一 HTML 建置把程式和樣式都內嵌在頁面裡；
 *   專案沒有 v-html、innerHTML、eval，沒有讓外人插入程式的入口
 * - font-src data:：手寫字型以 data URI 內嵌
 * - img-src data: blob:：網站圖示、下載用的暫時連結
 *
 * GitHub Pages 不能自訂回應標頭，所以改用 <meta> 標籤；
 * 只在建置時加入（apply: 'build'），開發時的熱更新要連線到開發伺服器，加了會被擋掉。
 */
const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  'font-src data:',
  "img-src 'self' data: blob:",
  "connect-src 'none'",
  "object-src 'none'",
  "base-uri 'none'",
  "form-action 'none'",
].join('; ')

function contentSecurityPolicy(): Plugin {
  return {
    name: 'content-security-policy',
    apply: 'build',
    transformIndexHtml: () => [
      { tag: 'meta', attrs: { 'http-equiv': 'Content-Security-Policy', content: CONTENT_SECURITY_POLICY }, injectTo: 'head-prepend' },
    ],
  }
}

// https://vite.dev/config/
export default defineConfig({
  // base: './' 讓資源用相對路徑；viteSingleFile 會再把 JS/CSS 全內嵌進 index.html，
  // 使用者不需架伺服器，直接雙擊 dist/index.html 就能用（需求文件第 3 節）
  base: './',
  plugins: [vue(), tailwindcss(), viteSingleFile(), contentSecurityPolicy()],
  // vue-i18n 的編譯開關：只用 Composition API，關掉舊版 API 與正式版 devtools，打包檔比較小
  define: {
    __VUE_I18N_FULL_INSTALL__: true,
    __VUE_I18N_LEGACY_API__: false,
    __INTLIFY_PROD_DEVTOOLS__: false,
  },
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
