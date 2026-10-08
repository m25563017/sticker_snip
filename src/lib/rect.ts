import type { Bounds, Point } from '@/types/selection'

/**
 * 由拖曳的起點與終點算出矩形。
 *
 * 使用者可能往任何方向拖（例如從右下往左上），所以不能直接拿起點當左上角，
 * 要取兩點中較小的 x/y 當左上角，寬高才會是正數。
 * 結果四捨五入成整數──像素沒有半格，之後裁切 ImageData 也只吃整數。
 */
export function rectFromPoints(start: Point, end: Point): Bounds {
  const left = Math.round(Math.min(start.x, end.x))
  const top = Math.round(Math.min(start.y, end.y))
  const right = Math.round(Math.max(start.x, end.x))
  const bottom = Math.round(Math.max(start.y, end.y))
  return { x: left, y: top, width: right - left, height: bottom - top }
}

/**
 * 判斷矩形是否小到應該當成誤點而捨棄。
 * 只要寬或高任一邊不足就算──一條細線裁出來也不會是有意義的貼紙。
 */
export function isRectTooSmall(bounds: Bounds, minSize: number): boolean {
  return bounds.width < minSize || bounds.height < minSize
}

