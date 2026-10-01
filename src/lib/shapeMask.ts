import type { ShapeMask } from './cropSelection'

/**
 * 遮罩的共用判斷。背景偵測（找邊界取樣）與 flood fill 去背（找起點）
 * 對「什麼叫邊界」必須有一致的定義，所以集中在這裡。
 */

/** 沒傳遮罩時視為整張圖都在形狀內 */
export function isInsideMask(mask: ShapeMask | undefined, width: number, x: number, y: number): boolean {
  return mask === undefined || mask[y * width + x] === 1
}

/**
 * 判斷一個「形狀內」的像素是不是形狀的邊界：
 * 位在圖片最外圈，或上下左右任一鄰居落在形狀外。
 * 矩形遮罩全為 1，結果就等於圖片最外圍一圈；橢圓／套索則會沿著形狀輪廓走。
 */
export function isMaskBorder(
  mask: ShapeMask | undefined,
  width: number,
  height: number,
  x: number,
  y: number,
): boolean {
  if (x === 0 || y === 0 || x === width - 1 || y === height - 1) return true
  return (
    !isInsideMask(mask, width, x - 1, y) ||
    !isInsideMask(mask, width, x + 1, y) ||
    !isInsideMask(mask, width, x, y - 1) ||
    !isInsideMask(mask, width, x, y + 1)
  )
}
