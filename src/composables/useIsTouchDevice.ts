import { useMediaQuery } from '@vueuse/core'

/**
 * 主要用手指操作的裝置（手機、平板）。
 * 看的是「主要的指標夠不夠精準」而不是螢幕寬度：iPad 螢幕很大，但一樣沒有滑鼠、沒有「滑過」。
 * 用途：改顯示觸控用的提示、讓滑過才出現的按鈕常駐顯示。
 */
export function useIsTouchDevice() {
  return useMediaQuery('(pointer: coarse)')
}
