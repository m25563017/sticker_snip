import { onMounted, ref } from 'vue'
import { detectInAppBrowser, detectPlatform, lineExternalUrl } from '@/lib/inAppBrowser'

/**
 * 從 App 內建瀏覽器開啟時的處理：
 * - LINE：直接跳轉到帶 openExternalBrowser=1 的網址，LINE 會改用外部瀏覽器開啟
 * - 其他（含 LIFF、跳轉後仍留在 LINE 的那一頁）：顯示提示，引導使用者自己改用瀏覽器
 *
 * @param onNoticeClosed 提示關閉（或根本不需要提示）時呼叫，例如接著顯示第一次使用的教學，避免兩個視窗疊在一起
 */
export function useInAppBrowser(onNoticeClosed: () => void) {
  const userAgent = navigator.userAgent
  const inAppBrowser = detectInAppBrowser(userAgent)
  const platform = detectPlatform(userAgent)
  const isNoticeOpen = ref(inAppBrowser !== null)

  onMounted(() => {
    const redirectUrl = lineExternalUrl(window.location.href, inAppBrowser)
    if (redirectUrl) window.location.replace(redirectUrl)
    if (!isNoticeOpen.value) onNoticeClosed()
  })

  function closeNotice(): void {
    isNoticeOpen.value = false
    onNoticeClosed()
  }

  return { platform, isNoticeOpen, closeNotice }
}
