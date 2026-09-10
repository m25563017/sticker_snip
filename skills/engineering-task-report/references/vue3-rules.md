# 前端開發與程式風格規範 (Vue3)

## 1. 核心框架規範

- **版本**：Vue 3 (Composition API / `<script setup>`)。
- **組件通信 (Communication)**：
    - 嚴格使用 `props` 進行數據下傳，`emits` 進行事件上傳。
    - **禁止使用** `provide` / `inject`，以確保組件間的依賴關係透明。

## 2. 樣式規範 (Tailwind CSS v4+)

- **版本**：Tailwind CSS v4 以上。

## 3. 通知與彈窗規範 (Notification)

- **禁用原生方法**：嚴格禁止使用瀏覽器原生的 `alert()`。
- **標準套件**：必須使用 `@pieda/core` 的 `useNotify`。
- **實作要求**：
    - 必須宣告變數為 `$notify`。
    - **禁止包裝**：請直接在邏輯中調用 `$notify.alert`，不要將此寫法封裝成自定義方法 (Method/Function)。
- **程式碼範例**：

    ```typescript
    import { useNotify } from "@pieda/core";

    const $notify = useNotify();

    // 直接調用，不可包裝成其他 function
    $notify.alert({
        title: "系統通知",
        message: "發生錯誤，請稍後再試",
        variant: "error",
    });
    ```

## 4. API 與資料請求規範

- **集中管理**
    - 所有 API 請求必須透過 `stores/myApi.ts` 中定義的方法呼叫

- **路徑規範**
    - API URL 必須統一定義於 `$api` 物件中
    - 禁止在組件內直接寫死字串路徑

## 5. 工程進度報告產出標準

每次回報需包含以下內容：

- **今日開發摘要**
    - 條列式說明完成的功能或任務

- **規範檢查**
    - 是否誤用 `provide/inject`
    - 是否使用原生 `alert()`

- **Tailwind 檢查**
    - class 是否皆有 `tw:` 前綴

## 6. Vue 模板與命名規範

### 6.1 組件結構順序

- **強制要求**：單檔案組件 (SFC) 內的標籤排列順序必須統一為：
    1. `<script setup>`
    2. `<template>`
    3. `<style>`

### 6.2 CSS 與樣式撰寫標準

- **優先級**：樣式以 **Tailwind CSS** 為主。
- **轉移至 `<style>` 之判定**：
    - 若單一個標籤上的 Tailwind class **超過 6 個**，請將樣式抽離並寫入 `<style>` 區塊中。
- **巢狀規範**：
    - 在 `<style>` 中編寫 CSS 時，請盡量使用**巢狀 (Nesting)** 寫法。
    - **限制**：巢狀深度**不得超過三層**，以維持代碼可讀性與效能。

### 6.3 語義化容器命名策略 (Semantic Container Naming)

結合 **BEM 簡化版** 與 **Functional CSS** 的優勢：

- **命名慣例**：
    - 採用 **kebab-case** (連字元命名法)，以與 JavaScript 的 camelCase 及 Tailwind 的前綴邏輯進行視覺區隔。
- **核心規則**：
    - **重要容器 (Key Container)**：必須具備語義化的類名。
    - **位置順序**：語義化類名必須作為 `class` 屬性中的**第一個項目**，其後才接續 Tailwind 類名。

#### **判定原則 (何時命名？)**

| 類別 | 說明與範例 |
| **必須命名** | 頁面最外層佈局容器 (Layout Wrappers)、具獨立功能的組件主體 (Component Roots)、複雜表單或大型資料清單的包覆層。 |
| **不需命名** | 僅為了排版存在的輔助層 (如 `tw:flex` 中繼層)、單純的文字裝飾標籤 (如 `span`, `b`)。 |

#### **正確範例**：

```vue
<template>
    <section class="main-content-wrapper tw:flex tw:flex-col tw:min-h-screen">
        <div class="user-profile-card tw:p-6 tw:bg-white tw:shadow-lg">
            <h2 class="tw:text-xl">{{ userName }}</h2>
        </div>
    </section>
</template>

<style scoped>
.main-content-wrapper {
    /* 只有當 Tailwind class 超過 6 個或需特殊處理時才寫在此 */
    .user-profile-card {
        /* 巢狀示範，不超過三層 */
        &:hover {
            filter: brightness(0.95);
        }
    }
}
</style>
```

## 7. Vue 模板與命名規範

### 規則與慣例

- **`v-for` / `v-if` 必須用 `<template>` 包裝**。
- **禁止** 在同一個 HTML 標籤上同時使用 `v-if` 與 `v-for`。
- **強制** `v-for` 必須搭配具備唯一性的 `:key`。
- 正確範例：

```vue
<template v-if="items.length > 0">
    <template v-for="item in items" :key="item.id">
        <ListItem :item="item" />
    </template>
</template>
```

- **事件命名與回調 (Callback)**
    - **Props 接收的事件**：使用 `on*` 前綴 (例如：`onClose`, `onConfirm`)。
    - **內部處理函式**：使用 `handle*` 前綴 (例如：`handleDeleteClick`, `handleSubmit`)。
      _註：這能幫 AI 區分「傳進來的 function」與「組件內部定義的 function」。_
- **v-model 更新事件**
    - 統一使用 `@update:modelValue` 或 `@update:propertyName` 模式。
- **變數與 Store 命名慣例**
    - **Store 實例**：統一為 `xxxStore` (小駝峰)，例如 `const authStore = useAuthStore()`。
    - **外部工具/插件實例**：統一使用 `$` 前綴，例如 `$notify`、`$api`、`$ajax`。

## 8. 環境適配與 SSR 安全規範 (Environment Safety)

**判定原則**：本章節僅適用於 Nuxt 3 或 SSR 專案。若為 Vite/Vue CLI 之純 SPA 專案，可忽略此標籤限制。

- **[SSR] 環境判定**：
  在生命週期鉤子（如 `onMounted`）之外存取瀏覽器特有 API（`window`, `localStorage` 等）時，必須包覆於 `if (process.client)`。
    - **原因**：避免 Node.js 執行環境因找不到瀏覽器物件而崩潰。

- **[SSR] 組件隔離**：
  若組件涉及非同步 Client 渲染套件（如地圖、圖表）或大量 DOM 操作，請使用 `<ClientOnly>` 包裹。

- **通用替代方案 (Composables)**：
  建議優先使用 `@vueuse/core` 的 `useStorage` 代替原生 `localStorage`。這類工具庫通常已內建環境判定，能同時兼容 SPA 與 SSR，減少手寫 `if (process.client)` 的次數。

## 9. 邏輯封裝與響應性規範 (Logic & Reactivity)

- **Pinia 實作慣例**：
    - **定義風格**：統一採用 `defineStore('id', () => { ... })` 的 Setup Store 寫法。
    - **響應性解構**：從 Store 解構狀態時，必須使用 `storeToRefs()` 以避免響應性丟失；方法 (Actions) 則直接解構。
- **Factory Function (Composable) 規範**：
    - 鼓勵使用 Factory Function 回傳多個相關函式（如 `useLineAuth.ts`）來提高內聚力。
    - **命名慣例**：必須以 `use` 開頭，且內部狀態需保持封裝。

## 10. 註解與代碼說明規範 (Documentation)

- **JSDoc 語言**：一律使用繁體中文。
- **註解哲學**：
    - **禁止描述行為**：不要寫 `// 如果是客戶端就執行`。
    - **強制描述意圖**：必須解釋「決策原因」或「業務邏輯背景」。例如：`// 為了避開 SSR 渲染時的 Hydration Mismatch，此處強制 client 執行。`
    - **區塊分隔**：在 `<template>` 中使用特定的註解分隔線，例如：`<!-- ======== 區塊名稱 ======== -->`。

## 11. 檔案組織與模板結構補充 (File Organization)

- **模板區塊化**：大型組件應使用註解分隔線進行視覺分割，便於開發者快速定位代碼。
- **TypeScript 嚴格檢查**：
    - 所有 API 回傳值必須在 `myApi.ts` 中定義 Interface。
    - **禁止使用 `any`**，若型別不確定應使用 `unknown`。

### 檢查清單 (AI Review 用)

- [ ] 是否完全避免了 `v-if` 與 `v-for` 寫在同一標籤？
- [ ] 所有 `v-for` 是否都有綁定 `:key`？
- [ ] 外部套件是否皆以 `$` 開頭命名 (如 `$notify`)？
- [ ] 是否在組件內部使用了 `handle*` 命名本地處理函式？
- [ ] [註解] 是否存在「解釋做什麼」的冗餘註解？
- [ ] [Reactivity] Pinia 解構是否正確使用了 storeToRefs？
