import type { Bounds, Point, Selection } from '@/types/selection'
import type { PixelBuffer } from './pixelBuffer'
import { createShapeMask, selectionBounds } from './selectionShape'

/**
 * 形狀遮罩：長度 = width × height，每格對應裁切結果的一個像素。
 * 1 = 在選取形狀內，0 = 在形狀外。
 * 矩形全為 1；橢圓／套索的外接矩形角落會是 0，
 * 背景偵測與去背都靠它跳過「不屬於這個範圍」的像素。
 */
export type ShapeMask = Uint8Array

export interface CroppedRegion {
  image: PixelBuffer
  mask: ShapeMask
  /**
   * 裁切結果的左上角在原圖上的位置。原圖座標減掉它就是裁切後的座標；
   * 範圍超出原圖被截掉時，它和 selection.bounds 的 x/y 會不同。
   */
  origin: Point
}

/**
 * 把範圍限制在原圖內。正常操作下框選已經 clamp 過，
 * 但之後支援拖曳調整、或換了一張較小的圖時，仍可能出現越界的 bounds，
 * 這裡再守一次，避免讀到陣列外的位置。
 */
function clampBounds(bounds: Bounds, sourceWidth: number, sourceHeight: number): Bounds {
  const left = Math.max(0, Math.min(bounds.x, sourceWidth))
  const top = Math.max(0, Math.min(bounds.y, sourceHeight))
  const right = Math.max(left, Math.min(bounds.x + bounds.width, sourceWidth))
  const bottom = Math.max(top, Math.min(bounds.y + bounds.height, sourceHeight))
  return { x: left, y: top, width: right - left, height: bottom - top }
}

/** 一列一列地把原圖中 bounds 範圍的像素複製到新陣列 */
function copyPixels(source: PixelBuffer, bounds: Bounds): PixelBuffer {
  const { x, y, width, height } = bounds
  const data = new Uint8ClampedArray(width * height * 4)

  for (let row = 0; row < height; row++) {
    // 同一列的像素在記憶體裡是連續的，可以整段複製，比逐像素快很多
    const sourceStart = ((y + row) * source.width + x) * 4
    const sourceEnd = sourceStart + width * 4
    data.set(source.data.subarray(sourceStart, sourceEnd), row * width * 4)
  }

  return { data, width, height }
}

/**
 * 依選取範圍從原圖裁出像素（取形狀的外框），並產生對應的形狀遮罩。
 * 回傳的 image 是新的陣列，之後去背直接改它也不會動到原圖。
 */
export function cropSelection(source: PixelBuffer, selection: Selection): CroppedRegion {
  const bounds = clampBounds(selectionBounds(selection), source.width, source.height)
  return {
    image: copyPixels(source, bounds),
    mask: createShapeMask(selection, bounds),
    origin: { x: bounds.x, y: bounds.y },
  }
}
