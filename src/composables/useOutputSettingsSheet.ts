import { ref } from 'vue'

/**
 * 手機版「輸出設定」面板的開關（電腦版設定一直顯示在右側，用不到）。
 * 開關按鈕在底部操作列（App），面板在檢查頁（ReviewGrid），兩邊要看同一份狀態，
 * 所以狀態放在模組層級：不管在哪裡呼叫，拿到的都是同一個 isOpen。
 */
const isOpen = ref(false)

export function useOutputSettingsSheet() {
  function toggle(): void {
    isOpen.value = !isOpen.value
  }

  function close(): void {
    isOpen.value = false
  }

  return { isOpen, toggle, close }
}
