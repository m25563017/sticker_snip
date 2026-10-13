# 貼紙裁切去背工具（Sticker Snip）

把一張含有多個貼紙插畫的合成圖（例如 Canva 素材的縮圖網格），自動切成一張張去背的貼紙 PNG。

**網站**：https://m25563017.github.io/sticker_snip/

- **自動偵測**：上傳後自動找出每一張貼紙，也可以手動補畫矩形、橢圓、套索範圍
- **去背**：從範圍邊緣往內比對背景色（如同 Photoshop 魔術棒的「連續」選取），貼紙內部和背景同色的地方不會被誤刪
- **微調**：魔術棒、橡皮擦、保留筆刷，可復原／重做、縮放檢視
- **輸出**：固定尺寸或原尺寸、邊距、白邊、陰影、實色背景，多張打包成 zip
- **支援手機**：兩指縮放平移、觸控操作
- **中文／English**

## 隱私

圖片**完全不會上傳**，所有處理都在你的瀏覽器裡完成。網站以內容安全政策（CSP `connect-src 'none'`）禁止發出任何網路請求，由瀏覽器強制執行。

## 技術棧

| 項目 | 方案 |
|---|---|
| 框架 | Vue 3 + `<script setup>` + TypeScript |
| 建置 | Vite，`vite-plugin-singlefile` 產出單一 HTML |
| 樣式 | Tailwind CSS v4（不使用前綴）＋手繪風共用樣式 |
| 狀態 | Pinia（Setup Store）|
| 多語系 | vue-i18n |
| 影像運算 | 原生 Canvas `ImageData`，不使用 OpenCV／AI |
| 打包下載 | JSZip |
| 測試 | Vitest |
| 部署 | GitHub Pages（GitHub Actions） |

## 開發指令

```bash
npm install      # 安裝套件
npm run dev      # 開發伺服器（加 -- --host 可用手機連同一個 Wi-Fi 測試）
npm test         # 執行測試
npm run build    # 型別檢查 + 產出 dist/index.html（單一檔，可直接雙擊開啟）
npm run preview  # 本機預覽建置結果
npm run fonts    # 翻譯檔的文字有改動時，重新產生手寫字型子集
```

建置後的 `dist/index.html` 不需要伺服器、不需要網路，雙擊就能使用。
push 到 `main` 時，GitHub Actions 會自動測試、建置並部署到 GitHub Pages。

## 目錄結構

```
src/
├─ components/    元件
├─ composables/   可重複使用的邏輯（縮放手勢、匯出、預覽快取等）
├─ lib/           影像運算純函式（偵測、去背、白邊、陰影…），皆有單元測試
├─ locales/       翻譯檔（zh-TW 為標準，en 結構必須一致）
├─ stores/        Pinia store
├─ types/         型別
├─ assets/fonts/  手寫字型子集（由 npm run fonts 產生）
├─ App.vue
├─ i18n.ts
├─ main.ts
└─ style.css      Tailwind 進入點 + 手繪風共用樣式
scripts/          字型子集化腳本
public/licenses/  字型授權（隨網站發佈）
```

## 授權

- 字型：Patrick Hand、jf open 粉圓（以 Hand CJK 之名子集化），皆為 SIL Open Font License 1.1，見 `public/licenses/`
- 圖示：[Lucide](https://lucide.dev)，ISC License
