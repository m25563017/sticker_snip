import type { Point } from '@/types/selection'
import type { PixelBuffer } from './pixelBuffer'

/** 筆刷的效果：erase = 擦成透明；keep = 強制保留（還原成原圖） */
export type BrushEffect = 'erase' | 'keep'

export interface BrushStroke {
  effect: BrushEffect
  points: Point[]
  /** 筆刷半徑（px） */
  radius: number
}

/** 筆刷標記圖每一格的值 */
export const BRUSH_NONE = 0
export const BRUSH_ERASE = 1
export const BRUSH_KEEP = 2

/** 以 (cx, cy) 為圓心、radius 為半徑，把圓內的格子標成 value */
function stampCircle(mask: Uint8Array, width: number, height: number, cx: number, cy: number, radius: number, value: number): void {
  const radiusSquared = radius * radius
  const top = Math.max(0, Math.floor(cy - radius))
  const bottom = Math.min(height - 1, Math.ceil(cy + radius))
  const left = Math.max(0, Math.floor(cx - radius))
  const right = Math.min(width - 1, Math.ceil(cx + radius))

  for (let y = top; y <= bottom; y++) {
    for (let x = left; x <= right; x++) {
      const dx = x - cx
      const dy = y - cy
      if (dx * dx + dy * dy <= radiusSquared) mask[y * width + x] = value
    }
  }
}

/**
 * 依操作順序把每一筆畫到「筆刷標記圖」上：每格記錄最後一支塗過它的筆刷（後塗的蓋過先塗的），
 * 跟在紙上畫畫一樣——先保留、再擦同一個地方就是擦掉；反過來就是保留。
 *
 * 滑鼠移動事件是「跳著」回報位置的，快速拖曳時兩個點可能相距好幾十 px，
 * 只在回報的點上蓋章會變成一串斷開的圓點。所以兩點之間每隔半個半徑補蓋一次章，
 * 讓塗過的痕跡是連續的一條線。
 */
export function paintBrushMask(width: number, height: number, strokes: BrushStroke[]): Uint8Array {
  const mask = new Uint8Array(width * height)

  for (const { effect, points, radius } of strokes) {
    const value = effect === 'erase' ? BRUSH_ERASE : BRUSH_KEEP
    const step = Math.max(1, radius / 2)
    points.forEach((point, index) => {
      const previous = points[index - 1] ?? point
      const distance = Math.hypot(point.x - previous.x, point.y - previous.y)
      const steps = Math.max(1, Math.ceil(distance / step))
      for (let i = 1; i <= steps; i++) {
        const t = i / steps
        const x = previous.x + (point.x - previous.x) * t
        const y = previous.y + (point.y - previous.y) * t
        stampCircle(mask, width, height, x, y, radius, value)
      }
    })
  }

  return mask
}

/**
 * 依筆刷標記圖修改圖片：擦除的格子變透明，保留的格子還原成原圖（original）的樣子。
 * 回傳新的 PixelBuffer，不修改傳入的 image。
 *
 * @param original 去背前的原圖（同尺寸），保留筆刷從這裡取回像素
 */
export function applyBrushMask(image: PixelBuffer, original: PixelBuffer, mask: Uint8Array): PixelBuffer {
  const { width, height } = image
  const data = new Uint8ClampedArray(image.data)

  for (let i = 0; i < width * height; i++) {
    if (mask[i] === BRUSH_ERASE) {
      data[i * 4 + 3] = 0
    } else if (mask[i] === BRUSH_KEEP) {
      data.set(original.data.subarray(i * 4, i * 4 + 4), i * 4)
    }
  }

  return { data, width, height }
}
