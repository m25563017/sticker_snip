import type { Selection } from '@/types/selection'
import { hexToRgb } from './color'
import { cropSelection } from './cropSelection'
import { floodFillRemove } from './floodFillRemove'
import type { PixelBuffer } from './pixelBuffer'
import { refineEdges, type EdgeQuality } from './refineEdges'
import { minIslandArea, removeSmallIslands } from './removeSmallIslands'

/**
 * 單一範圍的完整處理流程：
 * 從原圖裁切 → 依該範圍自己的背景色與閾值去背 → 清除孤立雜點 → 邊緣處理。
 * 縮圖預覽與匯出都走這一條，確保使用者看到的就是最後下載到的結果。
 *
 * 背景色尚未偵測（null）時只裁切不去背，至少讓使用者看得到框到了什麼。
 */
export function processSelection(source: PixelBuffer, selection: Selection, edgeQuality: EdgeQuality): PixelBuffer {
  const { image, mask } = cropSelection(source, selection)
  if (selection.backgroundColor === null) return image

  const backgroundColor = hexToRgb(selection.backgroundColor)
  const removed = floodFillRemove(image, mask, backgroundColor, selection.threshold)
  // JPG 壓縮會在背景留下色差超過閾值的小色斑，flood fill 流不進去，要另外清掉
  const cleaned = removeSmallIslands(removed, minIslandArea(removed.width, removed.height))
  // 清雜點必須在邊緣處理之前：邊緣處理會讓邊緣變半透明，先做的話雜點也會被當成邊緣處理
  return refineEdges(cleaned, backgroundColor, edgeQuality)
}
