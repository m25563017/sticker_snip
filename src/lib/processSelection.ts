import type { Point, Selection } from '@/types/selection'
import { hexToRgb } from './color'
import { cropSelection } from './cropSelection'
import { applyEraseStrokes, type EraseStroke } from './eraseStrokes'
import { floodFillRemove } from './floodFillRemove'
import type { PixelBuffer } from './pixelBuffer'
import { refineEdges, type EdgeQuality } from './refineEdges'
import { minIslandArea, removeSmallIslands } from './removeSmallIslands'

/**
 * 單一範圍的完整處理流程：
 * 從原圖裁切 → 依該範圍自己的背景色與閾值去背（含魔術棒）→ 橡皮擦 → 清除孤立雜點 → 邊緣處理。
 * 縮圖預覽與匯出都走這一條，確保使用者看到的就是最後下載到的結果。
 *
 * 背景色尚未偵測（null）時只裁切不去背，至少讓使用者看得到框到了什麼。
 */
export function processSelection(source: PixelBuffer, selection: Selection, edgeQuality: EdgeQuality): PixelBuffer {
  const { image, mask, origin } = cropSelection(source, selection)
  if (selection.backgroundColor === null) return image

  // 手動修改存的是原圖座標，扣掉裁切起點才是裁切結果上的位置
  const toLocal = (point: Point): Point => ({ x: point.x - origin.x, y: point.y - origin.y })
  const seeds: Point[] = []
  const strokes: EraseStroke[] = []
  for (const edit of selection.manualEdits) {
    if (edit.tool === 'wand') seeds.push(toLocal(edit.point))
    else strokes.push({ points: edit.points.map(toLocal), radius: edit.radius })
  }

  const backgroundColor = hexToRgb(selection.backgroundColor)
  const removed = floodFillRemove(image, mask, backgroundColor, selection.threshold, seeds)
  const erased = applyEraseStrokes(removed, strokes)
  /**
   * 清雜點放在橡皮擦之後：擦掉一塊後旁邊常殘留沒擦乾淨的小碎片，順便一起清掉，使用者不必擦得很精準。
   * 也要在邊緣處理之前：邊緣處理會讓邊緣變半透明，先做的話雜點也會被當成邊緣處理。
   */
  const cleaned = removeSmallIslands(erased, minIslandArea(erased.width, erased.height))
  return refineEdges(cleaned, backgroundColor, edgeQuality)
}
