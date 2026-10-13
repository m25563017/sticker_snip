import { ref } from 'vue'
import { useStorage } from '@vueuse/core'

export type HelpTab = 'guide' | 'about'

/**
 * 「使用說明」對話框的開關。頂列的 ? 按鈕、上傳頁的版權提醒連結、第一次開啟網站時都會打開它，
 * 狀態放在模組層級，所有地方拿到的都是同一份。
 */
const isOpen = ref(false)
const tab = ref<HelpTab>('guide')
/** 看過（或略過）教學就記住，之後不再自動跳出；想再看可以按頂列的 ? */
const hasSeenGuide = useStorage('sticker-snip:guide-seen', false)

export function useHelpDialog() {
  function open(target: HelpTab = 'guide'): void {
    tab.value = target
    isOpen.value = true
  }

  function close(): void {
    isOpen.value = false
    hasSeenGuide.value = true
  }

  function openGuideOnFirstVisit(): void {
    if (!hasSeenGuide.value) open('guide')
  }

  return { isOpen, tab, open, close, openGuideOnFirstVisit }
}
