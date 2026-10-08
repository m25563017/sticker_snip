import type { Bounds, Point, Selection } from '@/types/selection'
import type { ShapeMask } from './cropSelection'

/**
 * 三種選取形狀（矩形／橢圓／套索）的差異集中在這裡。
 * 其他地方（裁切、點選、畫框）只透過這幾個函式操作範圍，不需要各自判斷形狀。
 *
 * 套索的點不論使用者有沒有畫回起點，一律視為「最後一點以直線連回第一點」的封閉多邊形。
 */

/** 任何形狀的外框；套索取所有點的最小外框 */
export function selectionBounds(selection: Selection): Bounds {
  return selection.type === 'lasso' ? pointsBounds(selection.points) : selection.bounds
}

/** 一串點的最小外框，往外取整到完整像素（裁切只能以整數像素為單位） */
export function pointsBounds(points: Point[]): Bounds {
  const xs = points.map((point) => point.x)
  const ys = points.map((point) => point.y)
  const left = Math.floor(Math.min(...xs))
  const top = Math.floor(Math.min(...ys))
  return {
    x: left,
    y: top,
    width: Math.ceil(Math.max(...xs)) - left,
    height: Math.ceil(Math.max(...ys)) - top,
  }
}

function isInsideEllipse(bounds: Bounds, x: number, y: number): boolean {
  const radiusX = bounds.width / 2
  const radiusY = bounds.height / 2
  if (radiusX <= 0 || radiusY <= 0) return false
  const dx = (x - (bounds.x + radiusX)) / radiusX
  const dy = (y - (bounds.y + radiusY)) / radiusY
  return dx * dx + dy * dy <= 1
}

/**
 * 射線法判斷點是否在多邊形內：從點往右畫一條水平線，數它穿過幾條邊，奇數次就在裡面。
 * 邊依序是 points[i-1] → points[i]，i = 0 時接回最後一點，等於自動封閉。
 */
function isInsidePolygon(points: Point[], x: number, y: number): boolean {
  let inside = false
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const a = points[i]
    const b = points[j]
    const crossesRow = a.y > y !== b.y > y
    if (crossesRow && x < a.x + ((y - a.y) * (b.x - a.x)) / (b.y - a.y)) inside = !inside
  }
  return inside
}

/** 點是否在形狀「裡面」（不只是外框裡）：點選橢圓時，點到外框四個角落不算 */
export function containsPoint(selection: Selection, point: Point): boolean {
  switch (selection.type) {
    case 'rect': {
      const { x, y, width, height } = selection.bounds
      return point.x >= x && point.x <= x + width && point.y >= y && point.y <= y + height
    }
    case 'ellipse':
      return isInsideEllipse(selection.bounds, point.x, point.y)
    case 'lasso':
      return isInsidePolygon(selection.points, point.x, point.y)
  }
}

/**
 * 在畫布上點選範圍：找出包含這個點的範圍中，外框面積最小的那個，回傳它在陣列中的位置（沒有則 -1）。
 * 選最小的：大框裡如果有小框，選大的話小框就永遠點不到了。
 */
export function findSelectionAt(selections: Selection[], point: Point): number {
  let found = -1
  let smallestArea = Infinity
  selections.forEach((selection, index) => {
    if (!containsPoint(selection, point)) return
    const { width, height } = selectionBounds(selection)
    if (width * height < smallestArea) {
      found = index
      smallestArea = width * height
    }
  })
  return found
}

/**
 * 掃描線填滿多邊形：每一列算出和多邊形各邊的交點，排序後兩兩一組，中間的像素就在形狀內。
 * 比逐像素用射線法判斷快很多：每列只算一次交點，不必每個像素都繞所有邊一圈。
 */
function fillPolygon(mask: ShapeMask, region: Bounds, points: Point[]): void {
  const crossings: number[] = []
  for (let row = 0; row < region.height; row++) {
    // 以像素中心判斷，避免邊剛好壓在像素邊界上時忽有忽無
    const y = region.y + row + 0.5
    crossings.length = 0
    for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
      const a = points[i]
      const b = points[j]
      if (a.y > y !== b.y > y) crossings.push(a.x + ((y - a.y) * (b.x - a.x)) / (b.y - a.y))
    }
    crossings.sort((left, right) => left - right)

    /**
     * 像素中心落在 [左交點, 右交點) 之間才算形狀內（左閉右開）：
     * 中心剛好壓在邊上時有一致的歸屬，相鄰兩個形狀共用的邊不會重複或漏掉像素。
     */
    for (let k = 0; k + 1 < crossings.length; k += 2) {
      const start = Math.max(0, Math.ceil(crossings[k] - region.x - 0.5))
      const end = Math.min(region.width - 1, Math.ceil(crossings[k + 1] - region.x - 0.5) - 1)
      for (let column = start; column <= end; column++) mask[row * region.width + column] = 1
    }
  }
}

/**
 * 產生形狀遮罩：長度 = region 的寬 × 高，1 = 在形狀內。
 * region 是實際裁切的範圍（可能因為超出原圖而被截掉一部分），形狀本身仍以原圖座標計算。
 */
export function createShapeMask(selection: Selection, region: Bounds): ShapeMask {
  const mask = new Uint8Array(region.width * region.height)

  switch (selection.type) {
    case 'rect':
      mask.fill(1)
      break
    case 'ellipse':
      for (let row = 0; row < region.height; row++) {
        for (let column = 0; column < region.width; column++) {
          const inside = isInsideEllipse(selection.bounds, region.x + column + 0.5, region.y + row + 0.5)
          if (inside) mask[row * region.width + column] = 1
        }
      }
      break
    case 'lasso':
      fillPolygon(mask, region, selection.points)
      break
  }

  return mask
}
