# 前端開發與程式風格規範（React / Next.js）

## 1. 核心框架規範

- **框架**：Next.js（App Router）
- **語言**：TypeScript 嚴格模式，禁止使用 `any`，型別不確定請用 `unknown`
- **元件寫法**：函式元件（Function Component）+ Hooks，**禁止使用** Class Component
- **狀態管理**：Zustand

## 2. 樣式規範（Tailwind CSS v4+）

- 所有 class 必須加 `tw:` 前綴
  - 正確：`<div className="tw:flex tw:items-center tw:p-4">`
  - 錯誤：`<div className="flex items-center">`
- 注意：React 用 `className`，不是 `class`
- 單一標籤 Tailwind class **超過 6 個** → 抽成獨立變數或元件
- 條件樣式使用 `clsx` 或 `cn()`

```tsx
// ✅ class 過多時抽成變數
const cardClass = "tw:p-6 tw:bg-white tw:shadow-lg tw:rounded-xl tw:border tw:border-gray-200 tw:hover:shadow-xl"
<div className={cardClass}>...</div>

// ✅ 條件樣式用 clsx
import { clsx } from 'clsx'
<button className={clsx('tw:px-4 tw:py-2', isActive && 'tw:bg-blue-500', !isActive && 'tw:bg-gray-300')}>
```

## 3. 元件規範

- 元件檔案名稱使用 PascalCase：`UserCard.tsx`
- 一個檔案只放一個主要元件

### Props 與事件

- 父傳子用 `props`，子傳父用 callback function，**禁止直接修改 props**
- Props 接收的 callback 使用 `on*` 前綴：`onClose`、`onConfirm`
- 元件內部處理函式使用 `handle*` 前綴：`handleSubmit`、`handleDeleteClick`

### 清單渲染

- 使用 `.map()` 渲染清單，必須加唯一的 `key`
- **禁止** 用陣列 index 當 `key`（除非清單靜態且不會重排）

```tsx
// ✅ 正確
{items.map(item => (
  <ListItem key={item.id} item={item} />
))}

// ❌ 錯誤：key 用 index
{items.map((item, index) => (
  <ListItem key={index} item={item} />
))}
```

### 條件渲染

```tsx
// ✅ 簡單條件
{isLoggedIn && <UserMenu />}

// ✅ 二擇一
{isLoading ? <Spinner /> : <Content />}

// ✅ 複雜條件抽成變數
const content = isLoading ? <Spinner /> : isError ? <ErrorMessage /> : <Content />
return <div>{content}</div>
```

## 4. Hooks 使用規範

- Hooks 只能在 Function Component 或 Custom Hook 的**最頂層**呼叫
- **禁止**在條件式、迴圈、或巢狀函式內呼叫 Hooks
- 複雜邏輯請抽成 Custom Hook 放在 `hooks/` 資料夾，命名必須以 `use` 開頭

```tsx
// ❌ 錯誤：在條件內呼叫
if (isLoggedIn) {
  const [data, setData] = useState(null) // 違規！
}
```

## 5. Zustand 狀態管理規範

```typescript
// stores/useAuthStore.ts
import { create } from 'zustand'

interface AuthState {
  user: User | null
  setUser: (user: User | null) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  setUser: (user) => set({ user }),
  logout: () => set({ user: null }),
}))
```

- Store 檔案放在 `stores/` 資料夾，命名為 `use*Store`
- 只存「跨元件共享」的狀態，元件內部狀態用 `useState`
- **禁止**把所有狀態都放進 Zustand，避免過度設計

## 6. API 請求規範

- 所有 API 請求集中定義在 `lib/api.ts`
- **禁止**在元件內直接寫死 API 路徑字串
- 統一使用 `try-catch` 處理錯誤

```typescript
// lib/api.ts
const API_BASE = process.env.NEXT_PUBLIC_API_URL

export const fetchUser = async (id: string): Promise<User> => {
  const res = await fetch(`${API_BASE}/users/${id}`)
  if (!res.ok) throw new Error('Failed to fetch user')
  return res.json()
}
```

## 7. 圖示規範

- **禁止**在程式碼、元件、頁面中使用 Emoji 作為圖示或裝飾
- **禁止**在 JSX、TypeScript、註解中出現 Emoji 字元
- 需要圖示時，一律使用 **SVG**（inline 或獨立 `.svg` 元件）
- 若 SVG 尚未取得，請留下明確標記：

```tsx
{/* [TODO: ICON] 此處需要「關閉」圖示，請補上對應 SVG */}
<span className="tw:icon-placeholder">[關閉圖示]</span>
```

## 8. 命名慣例

| 類型 | 慣例 | 範例 |
|------|------|------|
| 元件檔案 | PascalCase | `UserCard.tsx` |
| 一般函式/變數 | camelCase | `getUserById` |
| 常數 | UPPER_SNAKE_CASE | `API_BASE_URL` |
| Props callback | `on*` | `onClose`、`onSubmit` |
| 內部處理函式 | `handle*` | `handleClick`、`handleSubmit` |
| Custom Hook | `use*` | `useAuth`、`useFetchUser` |
| Zustand Store | `use*Store` | `useAuthStore`、`useCartStore` |
| CSS 語義容器 | kebab-case | `user-profile-card` |
| 外部工具實例 | `$` 前綴 | `$notify`、`$api` |

## 9. 檔案結構規範

```
src/
├── app/                  # Next.js App Router 頁面
│   ├── layout.tsx
│   └── page.tsx
├── components/           # 共用元件
│   ├── ui/               # 純 UI 元件（Button、Input 等）
│   └── features/         # 業務功能元件
├── hooks/                # Custom Hooks（useXxx.ts）
├── stores/               # Zustand stores
├── lib/                  # 工具函式、API 呼叫
│   └── api.ts            # 所有 API 請求集中在此
└── types/                # TypeScript 型別定義
```

## 10. 註解規範

- JSDoc 語言：**繁體中文**
- **禁止**描述行為：`// 點擊後關閉`
- **必須**描述意圖：`// 關閉前先清空表單，避免下次開啟顯示殘留資料`
- 元件區塊分隔使用：`{/* ======== 區塊名稱 ======== */}`

### 檢查清單（AI Review 用）

- [ ] Tailwind class 是否皆有 `tw:` 前綴？
- [ ] 是否出現 Class Component？
- [ ] `.map()` 是否都有唯一的 `key`（非 index）？
- [ ] Hooks 是否都在最頂層呼叫？
- [ ] API 請求是否集中在 `lib/api.ts`？
- [ ] 是否出現 Emoji 字元？
- [ ] 圖示是否皆使用 SVG？若未取得請標記 `[TODO: ICON]`？
- [ ] 是否有使用 `any` 型別？
