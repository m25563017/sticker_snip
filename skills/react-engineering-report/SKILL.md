---
name: react-engineering-report
description: >
  React / Next.js 工程任務完成報告 Skill。當使用者完成一個 React 或 Next.js 開發任務後，
  需要產出結構化的工作回報，或對程式碼進行 React 規範審查時觸發。
  適用情境：「幫我整理這次做了什麼」、「產出任務報告」、「檢查有沒有違反規範」、
  「收尾」，或專案使用 Next.js、Zustand、Tailwind CSS v4 等技術棧時。
---

# React Engineering Report Skill

協助開發者在 React / Next.js 任務完成後，依照標準規範進行程式碼自檢，並產出結構化的工程回報。

---

## 執行流程

### Step 1：確認任務內容

若使用者未說明，詢問：
- 本次完成了哪些功能或修改
- 涉及的主要檔案或元件

### Step 2：規範自我檢查

參考 `references/react-rules.md` 逐項審查，重點確認以下高頻違規項目：

#### 樣式規範
- [ ] 所有 Tailwind class 是否都有 `tw:` 前綴？
- [ ] 是否使用了 `class` 而非 `className`？

#### 元件規範
- [ ] 是否出現 Class Component（`extends React.Component`）？
- [ ] `.map()` 是否都有唯一的 `key`（禁止用 index）？
- [ ] Props callback 是否用 `on*` 前綴，內部處理函式是否用 `handle*`？

#### Hooks 規範
- [ ] Hooks 是否都在最頂層呼叫，沒有放在條件式或迴圈內？

#### 資料管理
- [ ] API 請求是否集中在 `lib/api.ts`，沒有在元件內寫死路徑？
- [ ] Zustand store 是否只存跨元件共享的狀態？

#### 其他
- [ ] 是否出現 Emoji 字元？圖示是否改用 SVG？
- [ ] 是否使用 `any` 型別？
- [ ] 註解是否描述「意圖」而非「行為」？

### Step 3：產出報告

依照以下格式輸出：

---

## 報告格式

```markdown
## 今日開發摘要

- （條列式說明完成的功能或任務）

## 規範檢查

### React / Next.js 規範
- [ ] Tailwind class 是否皆有 tw: 前綴？
- [ ] 是否出現 Class Component？
- [ ] .map() 是否都有唯一的 key（非 index）？
- [ ] Hooks 是否都在最頂層呼叫？
- [ ] API 請求是否集中在 lib/api.ts？
- [ ] 是否出現 Emoji 字元？圖示是否皆使用 SVG？
- [ ] 是否有使用 any 型別？
- [ ] Props callback 是否用 on* 前綴？
- [ ] 內部處理函式是否用 handle* 前綴？
- [ ] 註解是否描述意圖而非行為？

## AI 使用記錄

- 使用工具：（列出本次用到的 AI 工具）
- 主要貢獻：（AI 生成 / 人工調整 / 純人工）
- 人工審核：已完成 / 待確認
```

---

## 重要原則

1. **如實回報** — 若有違規項目，誠實列出，同時提供正確的改法
2. **高頻違規優先** — `tw:` 前綴、`key` 使用、Emoji 禁用是最常出現的問題
3. **詳細規則參考** — 各規範細節請見 `references/react-rules.md`
4. **用繁體中文輸出** — 報告語言與使用者一致
