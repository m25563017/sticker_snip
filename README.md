# 貼紙裁切去背工具

純前端、離線可用的本地小工具：輸入一張含多個貼紙插畫的合成圖，手動框選每個貼紙，
自動去背（從邊緣 flood fill）、可選保留白色描邊，最後打包成 zip 下載。

需求文件：[does/貼紙裁切去背工具_需求文件.md](does/貼紙裁切去背工具_需求文件.md)

## 技術棧

| 項目 | 方案 |
|---|---|
| 框架 | Vue 3 + `<script setup>` + TypeScript |
| 建置 | Vite |
| 樣式 | Tailwind CSS v4（`@tailwindcss/vite`，不使用前綴）|
| 狀態 | Pinia（Setup Store）|
| 影像運算 | 原生 Canvas `ImageData`，不引入 OpenCV / AI |
| 打包 | JSZip |
| 通知 | `@pieda/core` 的 `useNotify` |
| 輸出 | `vite-plugin-singlefile`：build 產出單一 HTML，可直接雙擊開啟 |

## 開發指令

```bash
npm install      # 安裝依賴（@pieda/core 需私有 registry 權限）
npm run dev      # 開發伺服器
npm run build    # 型別檢查 + 產出 dist/index.html（單一檔，可直接雙擊開啟）
npm run preview  # 本機預覽 dist/
```

建置後把 `dist/index.html` 傳給任何人、丟隨身碟或雙擊開啟都能運作，
不需要伺服器、不需要網路（`dist/favicon.svg` 只是分頁圖示，缺了也不影響功能）。

## 目錄結構

```
src/
├─ components/    元件
├─ composables/   影像運算等可複用邏輯（use* 工廠函式）
├─ stores/        Pinia store（editor.ts：底圖 / 選取 / 去背設定 / 輸出設定）
├─ types/         型別（selection.ts：選取範圍統一資料結構）
├─ App.vue
├─ main.ts
└─ style.css      Tailwind 進入點 + 手繪風全域基底
```
