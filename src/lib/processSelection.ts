import type { Point, Selection } from '@/types/selection'
import { applyBrushMask, BRUSH_KEEP, paintBrushMask, type BrushStroke } from './brushStrokes'
import { hexToRgb } from './color'
import { cropSelection } from './cropSelection'
import { floodFillRemove } from './floodFillRemove'
import type { PixelBuffer } from './pixelBuffer'
import { refineEdges, type EdgeQuality } from './refineEdges'
import { minIslandArea, removeSmallIslands } from './removeSmallIslands'

/**
 * 單一範圍的完整處理流程：
 * 裁切 → 去背（含魔術棒）→ 筆刷（橡皮擦、保留）→ 清雜點 → 邊緣處理 → 再套一次筆刷。
 * 縮圖預覽與匯出都走這一條，確保使用者看到的就是最後下載到的結果。
 *
 * 規則是「使用者手動塗的永遠優先」：清雜點不會清掉保留過的區塊，
 * 邊緣處理之後再套一次筆刷，確保自動處理沒有改到手動塗過的地方。
 *
 * 背景色尚未偵測（null）時只裁切不去背，至少讓使用者看得到框到了什麼。
 */
export function processSelection(source: PixelBuffer, selection: Selection, edgeQuality: EdgeQuality): PixelBuffer {
  const { image, mask, origin } = cropSelection(source, selection)
  if (selection.backgroundColor === null) return image

  // 手動修改存的是原圖座標，扣掉裁切起點才是裁切結果上的位置
  const toLocal = (point: Point): Point => ({ x: point.x - origin.x, y: point.y - origin.y })
  const seeds: Point[] = []
  const strokes: BrushStroke[] = []
  for (const edit of selection.manualEdits) {
    if (edit.tool === 'wand') seeds.push(toLocal(edit.point))
    else strokes.push({ effect: edit.tool, points: edit.points.map(toLocal), radius: edit.radius })
  }

  const brush = paintBrushMask(image.width, image.height, strokes)
  // 橢圓、套索的形狀外不屬於這個範圍，保留筆刷也不能把它們救回來
  for (let i = 0; i < brush.length; i++) if (mask[i] === 0) brush[i] = 0

  const backgroundColor = hexToRgb(selection.backgroundColor)
  const removed = floodFillRemove(image, mask, backgroundColor, selection.threshold, seeds)
  const brushed = applyBrushMask(removed, image, brush)
  /**
   * 清雜點放在筆刷之後：擦掉一塊後旁邊常殘留沒擦乾淨的小碎片，順便一起清掉，使用者不必擦得很精準；
   * 保留過的區塊則不清。也要在邊緣處理之前：邊緣處理會讓邊緣變半透明，先做的話雜點也會被當成邊緣處理。
   */
  const cleaned = removeSmallIslands(brushed, minIslandArea(brushed.width, brushed.height), (i) => brush[i] === BRUSH_KEEP)
  const refined = refineEdges(cleaned, backgroundColor, edgeQuality)
  // 邊緣處理會把保留區塊的邊緣變半透明、擦除的邊緣也可能被改到，最後再套一次讓手動結果為準
  return applyBrushMask(refined, image, brush)
}
