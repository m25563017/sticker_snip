import type { Point } from '@/types/selection'
import { computeContainSize } from './canvas'

/**
 * 畫面座標 ↔ 原圖座標互轉。
 *
 * EditorCanvas 把原圖等比縮放後顯示，scale = 顯示尺寸 / 原圖尺寸
 * （由 computeContainSize 算出）。選取資料一律存「原圖座標」，
 * 視窗縮放時只需重算 scale，已存的範圍不用跟著改；
 * 要畫到畫面上時才轉回顯示座標。
 */

/** 滑鼠在畫面上的位置 → 原圖上的位置 */
export function displayToSource(point: Point, scale: number): Point {
  if (scale <= 0) return { x: 0, y: 0 }
  return { x: point.x / scale, y: point.y / scale }
}

/** 原圖上的位置 → 畫面上要畫的位置 */
export function sourceToDisplay(point: Point, scale: number): Point {
  return { x: point.x * scale, y: point.y * scale }
}

/**
 * 元件上的點擊位置 → 圖片像素座標，用於「等比塞進框裡、置中顯示」的圖片（同 object-fit: contain）。
 * 圖片長寬比和框不同時，左右或上下會留白；點在留白處回傳 null，代表沒點到圖片。
 *
 * @param point 相對於元件左上角的點擊位置（CSS px）
 */
export function containedPointToImage(
  point: Point,
  elementWidth: number,
  elementHeight: number,
  imageWidth: number,
  imageHeight: number,
): Point | null {
  const { scale } = computeContainSize(imageWidth, imageHeight, elementWidth, elementHeight)
  if (scale <= 0) return null

  // 用未四捨五入的實際顯示尺寸計算留白，避免換算出的座標有半像素偏移
  const offsetX = (elementWidth - imageWidth * scale) / 2
  const offsetY = (elementHeight - imageHeight * scale) / 2
  const x = (point.x - offsetX) / scale
  const y = (point.y - offsetY) / scale

  if (x < 0 || y < 0 || x >= imageWidth || y >= imageHeight) return null
  return { x, y }
}

/**
 * 把點限制在原圖範圍內。拖曳框選時滑鼠可能拉到畫布外，
 * 若不限制，之後裁切會讀到圖片以外不存在的像素。
 */
export function clampPoint(point: Point, width: number, height: number): Point {
  return {
    x: Math.min(Math.max(point.x, 0), width),
    y: Math.min(Math.max(point.y, 0), height),
  }
}
