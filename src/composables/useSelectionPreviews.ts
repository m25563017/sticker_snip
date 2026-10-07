import { shallowRef, watchEffect } from 'vue'
import { useEditorStore } from '@/stores/editor'
import type { PixelBuffer } from '@/lib/pixelBuffer'
import { processSelection } from '@/lib/processSelection'
import type { Selection } from '@/types/selection'
import type { EdgeQuality } from '@/lib/refineEdges'

interface CacheEntry {
  key: string
  result: PixelBuffer
}

/**
 * 會影響去背結果的欄位，組成一個字串當「指紋」。
 * 指紋沒變就代表結果不會變，可以直接沿用上次算好的，
 * 不必每次有任何範圍變動就把所有範圍重算一遍（大範圍去背一次要上百 ms）。
 */
function processingKey(selection: Selection, edgeQuality: EdgeQuality): string {
  const shape = selection.type === 'lasso' ? selection.points : selection.bounds
  // 邊緣品質是全域設定，但同樣會改變結果，切換時每個範圍都要重算
  return JSON.stringify([selection.type, shape, selection.backgroundColor, selection.threshold, edgeQuality])
}

/**
 * 提供每個範圍去背後的預覽結果（以範圍 id 查詢）。
 */
export function useSelectionPreviews() {
  const editorStore = useEditorStore()
  /** 整份 Map 換掉時才通知畫面更新，不需要 Vue 深入追蹤裡面的像素資料 */
  const previews = shallowRef(new Map<number, PixelBuffer>())

  /** 一般 Map、不是響應式：它只是內部的記事本，讀寫它都不該觸發重算 */
  const cache = new Map<number, CacheEntry>()
  let cachedSource: PixelBuffer | null = null

  /**
   * watchEffect 會自動追蹤執行過程中「讀到」的響應式資料：
   * 這裡讀了 sourcePixels、邊緣品質、selections 陣列，以及每個範圍的 bounds／背景色／閾值，
   * 之後任何一個改變都會重新執行。白邊設定沒被讀到，改它就不會觸發重算。
   */
  watchEffect(() => {
    const source = editorStore.sourcePixels
    // 換了一張新圖，舊結果全部作廢──新圖的範圍 id 會從 1 重新編號，不能誤用舊圖的快取
    if (source !== cachedSource) {
      cache.clear()
      cachedSource = source
    }

    const { edgeQuality } = editorStore.outputSettings
    const next = new Map<number, PixelBuffer>()
    if (source) {
      for (const selection of editorStore.selections) {
        const key = processingKey(selection, edgeQuality)
        let entry = cache.get(selection.id)
        if (!entry || entry.key !== key) {
          entry = { key, result: processSelection(source, selection, edgeQuality) }
          cache.set(selection.id, entry)
        }
        next.set(selection.id, entry.result)
      }
    }

    // 已刪除的範圍不再保留快取，避免佔著記憶體
    for (const id of cache.keys()) {
      if (!next.has(id)) cache.delete(id)
    }
    previews.value = next
  })

  return { previews }
}
