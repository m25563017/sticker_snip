import type { Point } from '@/types/selection'

/**
 * 微調彈窗的縮放視角：內容先依外框等比顯示（scale = 1），再放大 scale 倍、平移 (x, y)。
 * 對應 CSS 的 translate(x, y) scale(scale)，transform-origin 為左上角。
 */
export interface ZoomView {
  scale: number
  x: number
  y: number
}

export interface ViewportSize {
  width: number
  height: number
}

export const FIT_VIEW: ZoomView = { scale: 1, x: 0, y: 0 }
/** 放大 8 倍已經能看清單一像素，再大只是一格格色塊 */
export const MAX_ZOOM = 8

/** 限制平移範圍：放大後的內容永遠蓋滿外框，不會被拖到只剩一角或整片空白 */
function clampOffset(view: ZoomView, size: ViewportSize): ZoomView {
  const clamp = (value: number, length: number) => Math.min(0, Math.max(length * (1 - view.scale), value))
  return { scale: view.scale, x: clamp(view.x, size.width), y: clamp(view.y, size.height) }
}

/**
 * 以 anchor（外框內的游標位置）為中心縮放 factor 倍：
 * 游標底下的那一點縮放前後停在同一個位置，就像用手指頂著地圖某處放大。
 */
export function zoomAt(view: ZoomView, anchor: Point, factor: number, size: ViewportSize): ZoomView {
  const scale = Math.min(MAX_ZOOM, Math.max(1, view.scale * factor))
  const ratio = scale / view.scale
  return clampOffset(
    { scale, x: anchor.x - (anchor.x - view.x) * ratio, y: anchor.y - (anchor.y - view.y) * ratio },
    size,
  )
}

export function panBy(view: ZoomView, dx: number, dy: number, size: ViewportSize): ZoomView {
  return clampOffset({ scale: view.scale, x: view.x + dx, y: view.y + dy }, size)
}
