---
name: engineering-task-report
description: >
  工程任務完成報告 Skill。當使用者完成一個開發任務、功能實作、或 Bug 修復後，
  需要產出結構化的工作回報時觸發。也適用於對 Vue3 程式碼進行規範檢查，
  或使用者說「幫我整理一下剛才做了什麼」、「產出任務報告」、「收尾」等情境。
  會根據專案框架（Vue3 / React）選擇對應的規範進行審查。
---

# Engineering Task Report Skill

協助開發者在任務完成後，依照標準 SOP 產出結構化的工程回報，並進行程式碼規範自檢。

---

## 執行流程

### Step 1：確認任務框架

根據使用者的專案或本次對話內容，判斷使用的框架：

- **Vue3 / Nuxt3** → 參考 `references/vue3-rules.md` 進行規範審查
- **React / Next.js** → 使用 React 規範（需搭配對應 `CLAUDE.md`）
- **框架無關任務** → 僅套用 `references/report-rules.md` 通用規範

### Step 2：規範自我檢查

根據判斷的框架，逐項確認以下內容：

#### Vue3 專案檢查（`references/vue3-rules.md`）

- [ ] SFC 標籤順序：`<script setup>` → `<template>` → `<style>`
- [ ] 是否完全避免了 `v-if` 與 `v-for` 寫在同一標籤？
- [ ] 所有 `v-for` 是否都有綁定 `:key`？
- [ ] 是否誤用 `provide` / `inject`？
- [ ] 是否使用原生 `alert()`（應改用 `$notify`）？
- [ ] Tailwind class 是否皆有 `tw:` 前綴？
- [ ] 外部套件是否皆以 `$` 開頭命名？
- [ ] 是否有使用 `any` 型別？
- [ ] Pinia 解構是否正確使用了 `storeToRefs`？
- [ ] 註解是否描述「意圖」而非「行為」？
- [ ] [SSR 專案] 瀏覽器 API 是否包在 `if (process.client)` 或 `<ClientOnly>` 內？

#### 通用 AI 工作流檢查（`references/report-rules.md`）

- [ ] AI 工具使用是否記錄？
- [ ] 程式碼品質是否通過審核？
- [ ] 測試是否覆蓋關鍵路徑？

### Step 3：產出報告

依照以下格式輸出完整的任務回報：

---

## 報告格式

```markdown
## 今日開發摘要

- （條列式說明完成的功能或任務）

## 規範檢查

### Vue3 規範
- [ ] SFC 標籤順序是否正確？
- [ ] 是否誤用 provide/inject？
- [ ] 是否使用原生 alert()？
- [ ] Tailwind class 是否皆有 tw: 前綴？
- [ ] v-if 與 v-for 是否分開標籤？
- [ ] 所有 v-for 是否有 :key？
- [ ] 外部套件是否以 $ 開頭？
- [ ] 是否有使用 any 型別？
- [ ] Pinia 解構是否使用 storeToRefs？
- [ ] 註解是否描述意圖而非行為？

### AI 工作流規範
- [ ] AI 工具使用是否記錄？
- [ ] 程式碼品質是否通過審核？
- [ ] 測試是否覆蓋關鍵路徑？

## AI 使用記錄

- 使用工具：（列出本次用到的 AI 工具）
- 主要貢獻：（AI 生成 / 人工調整 / 純人工）
- 人工審核：已完成 / 待確認
```

---

## 重要原則

1. **如實回報** — 若有違規項目，誠實列出，不要掩蓋
2. **給出修復建議** — 發現違規時，同時提供正確的改法
3. **用繁體中文輸出** — 報告語言與使用者一致
4. **詳細規則參考** — 各規範細節請見 `references/` 目錄下的對應文件
