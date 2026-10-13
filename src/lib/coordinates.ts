import type { Bounds, Point } from '@/types/selection'
import { computeContainSize } from './canvas'
import type { ZoomView } from './zoomView'

/**
 * 畫面座標 ↔ 原圖座標互轉。
 *
 * EditorCanvas 把原圖等比縮放、置中後顯示，使用者還可以再放大、平移。
 * 選取資料一律存「原圖座標」，視窗大小或縮放改變時只需重算換算方式，已存的範圍不用跟著改；
 * 要畫到畫面上時才轉回顯示座標。
 */

/** 原圖 → 畫面的換算：畫面座標 = 原圖座標 × scale + offset */
export interface ViewTransform {
  /** 顯示尺寸 / 原圖尺寸 */
  scale: number
  /** 原圖左上角在畫面上的位置 */
  offsetX: number
  offsetY: number
}

/**
 * 「適應視窗」的擺放（等比塞進外框、置中）再疊上使用者的縮放視角，得到原圖 → 畫面的換算。
 * 縮放視角以外框左上角為原點，和微調彈窗的 ZoomView 定義相同，可以共用 zoomAt、panBy。
 *
 * @param margin 外框四周預留的空白（放得下圖片的黑框與錯位陰影）
 */
export function composeViewTransform(
  imageWidth: number,
  imageHeight: number,
  boxWidth: number,
  boxHeight: number,
  margin: number,
  view: ZoomView,
): ViewTransform {
  const { scale: fitScale } = computeContainSize(imageWidth, imageHeight, boxWidth - margin * 2, boxHeight - margin * 2)
  // 用未四捨五入的實際顯示尺寸計算置中位置，避免換算出的座標有半像素偏移
  const fitX = (boxWidth - imageWidth * fitScale) / 2
  const fitY = (boxHeight - imageHeight * fitScale) / 2
  return {
    scale: fitScale * view.scale,
    offsetX: view.x + fitX * view.scale,
    offsetY: view.y + fitY * view.scale,
  }
}

/** 滑鼠在畫面上的位置 → 原圖上的位置 */
export function displayToSource(point: Point, transform: ViewTransform): Point {
  if (transform.scale <= 0) return { x: 0, y: 0 }
  return { x: (point.x - transform.offsetX) / transform.scale, y: (point.y - transform.offsetY) / transform.scale }
}

/** 原圖上的位置 → 畫面上要畫的位置 */
export function sourceToDisplay(point: Point, transform: ViewTransform): Point {
  return { x: point.x * transform.scale + transform.offsetX, y: point.y * transform.scale + transform.offsetY }
}

/** 原圖上的外框 → 畫面上的外框 */
export function boundsToDisplay(bounds: Bounds, transform: ViewTransform): Bounds {
  const { x, y } = sourceToDisplay(bounds, transform)
  return { x, y, width: bounds.width * transform.scale, height: bounds.height * transform.scale }
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
