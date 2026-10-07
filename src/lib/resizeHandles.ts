import type { Bounds, Point } from '@/types/selection'
import { rectFromPoints } from './rect'

/** 8 個控制點：4 個角 + 4 條邊的中點，以方位命名（n = 上、e = 右、s = 下、w = 左） */
export type ResizeHandle = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w'

/** 游標移到控制點上時的樣式，提示可以往哪個方向拖 */
export const HANDLE_CURSORS: Record<ResizeHandle, string> = {
  nw: 'nwse-resize',
  se: 'nwse-resize',
  ne: 'nesw-resize',
  sw: 'nesw-resize',
  n: 'ns-resize',
  s: 'ns-resize',
  e: 'ew-resize',
  w: 'ew-resize',
}

export function handlePositions(bounds: Bounds): Record<ResizeHandle, Point> {
  const left = bounds.x
  const right = bounds.x + bounds.width
  const top = bounds.y
  const bottom = bounds.y + bounds.height
  const centerX = left + bounds.width / 2
  const centerY = top + bounds.height / 2
  return {
    nw: { x: left, y: top },
    n: { x: centerX, y: top },
    ne: { x: right, y: top },
    e: { x: right, y: centerY },
    se: { x: right, y: bottom },
    s: { x: centerX, y: bottom },
    sw: { x: left, y: bottom },
    w: { x: left, y: centerY },
  }
}

/**
 * 游標是否在某個控制點附近（tolerance 以內）。
 * 角優先於邊：框很小時角和邊的中點會擠在一起，角能同時調兩個方向，比較常用。
 */
export function hitTestHandle(bounds: Bounds, point: Point, tolerance: number): ResizeHandle | null {
  const positions = handlePositions(bounds)
  const order: ResizeHandle[] = ['nw', 'ne', 'se', 'sw', 'n', 'e', 's', 'w']
  for (const handle of order) {
    const position = positions[handle]
    if (Math.abs(point.x - position.x) <= tolerance && Math.abs(point.y - position.y) <= tolerance) {
      return handle
    }
  }
  return null
}

/**
 * 拖動控制點後的新外框：只移動控制點所在的那幾條邊，其餘的邊固定不動。
 * 拖過頭（例如把左邊拖到右邊之外）時，交給 rectFromPoints 自動翻轉成正的寬高。
 *
 * @param original 開始拖曳時的外框（以它為基準，而不是上一次移動的結果，避免誤差累積）
 * @param pointer 游標目前位置（原圖座標）
 */
export function resizeBounds(original: Bounds, handle: ResizeHandle, pointer: Point): Bounds {
  let left = original.x
  let top = original.y
  let right = original.x + original.width
  let bottom = original.y + original.height

  if (handle.includes('w')) left = pointer.x
  if (handle.includes('e')) right = pointer.x
  if (handle.includes('n')) top = pointer.y
  if (handle.includes('s')) bottom = pointer.y

  return rectFromPoints({ x: left, y: top }, { x: right, y: bottom })
}
