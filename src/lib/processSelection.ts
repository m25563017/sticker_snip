import type { Selection } from '@/types/selection'
import { hexToRgb } from './color'
import { cropSelection } from './cropSelection'
import { floodFillRemove } from './floodFillRemove'
import type { PixelBuffer } from './pixelBuffer'

/**
 * 單一範圍的完整處理流程：從原圖裁切 → 依該範圍自己的背景色與閾值去背。
 * 縮圖預覽與匯出都走這一條，確保使用者看到的就是最後下載到的結果。
 *
 * 背景色尚未偵測（null）時只裁切不去背，至少讓使用者看得到框到了什麼。
 */
export function processSelection(source: PixelBuffer, selection: Selection): PixelBuffer {
  const { image, mask } = cropSelection(source, selection)
  if (selection.backgroundColor === null) return image
  return floodFillRemove(image, mask, hexToRgb(selection.backgroundColor), selection.threshold)
}
