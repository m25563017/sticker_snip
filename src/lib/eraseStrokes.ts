import type { Point } from '@/types/selection'
import type { PixelBuffer } from './pixelBuffer'

export interface EraseStroke {
  points: Point[]
  /** 筆刷半徑（px） */
  radius: number
}

/** 以 (cx, cy) 為圓心、radius 為半徑，把圓內的像素設成透明 */
function stampCircle(data: Uint8ClampedArray, width: number, height: number, cx: number, cy: number, radius: number): void {
  const radiusSquared = radius * radius
  const top = Math.max(0, Math.floor(cy - radius))
  const bottom = Math.min(height - 1, Math.ceil(cy + radius))
  const left = Math.max(0, Math.floor(cx - radius))
  const right = Math.min(width - 1, Math.ceil(cx + radius))

  for (let y = top; y <= bottom; y++) {
    for (let x = left; x <= right; x++) {
      const dx = x - cx
      const dy = y - cy
      if (dx * dx + dy * dy <= radiusSquared) data[(y * width + x) * 4 + 3] = 0
    }
  }
}

/**
 * 橡皮擦：沿著每一筆路徑把經過的地方擦成透明，不管顏色。
 *
 * 滑鼠移動事件是「跳著」回報位置的，快速拖曳時兩個點可能相距好幾十 px，
 * 只在回報的點上蓋章會變成一串斷開的圓點。所以兩點之間每隔半個半徑補蓋一次章，
 * 讓擦過的痕跡是連續的一條線。
 *
 * 回傳新的 PixelBuffer，不修改傳入的 image。座標以 image 為準。
 */
export function applyEraseStrokes(image: PixelBuffer, strokes: EraseStroke[]): PixelBuffer {
  const { width, height } = image
  const data = new Uint8ClampedArray(image.data)

  for (const { points, radius } of strokes) {
    const step = Math.max(1, radius / 2)
    points.forEach((point, index) => {
      const previous = points[index - 1] ?? point
      const distance = Math.hypot(point.x - previous.x, point.y - previous.y)
      const steps = Math.max(1, Math.ceil(distance / step))
      for (let i = 1; i <= steps; i++) {
        const t = i / steps
        const x = previous.x + (point.x - previous.x) * t
        const y = previous.y + (point.y - previous.y) * t
        stampCircle(data, width, height, x, y, radius)
      }
    })
  }

  return { data, width, height }
}
