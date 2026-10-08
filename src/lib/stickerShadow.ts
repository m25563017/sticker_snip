import { hexToRgb } from './color'
import { drawUnder } from './compositing'
import type { PixelBuffer } from './pixelBuffer'
import { distanceToTarget } from './stickerBorder'

/** 陰影設定（需求 4.2），長度單位都是輸出圖片的 px */
export interface ShadowSettings {
  enabled: boolean
  color: string
  /** 0–1 */
  opacity: number
  /** 陰影落下的方向，0° = 右、90° = 下（順時針） */
  angle: number
  /** 陰影離貼紙多遠 */
  distance: number
  /** 模糊之前先把輪廓往外擴多少，陰影越大塊、越實 */
  spread: number
  /** 模糊程度，陰影邊緣越柔和、範圍越大 */
  size: number
}

export const DEFAULT_SHADOW: ShadowSettings = {
  enabled: false,
  color: '#000000',
  opacity: 0.35,
  // 往正下方落：貼紙放在聊天室、筆記頁面上時最自然的光源方向
  angle: 90,
  distance: 4,
  spread: 0,
  size: 8,
}

/** alpha 至少這麼不透明才算輪廓，和白邊的判斷一致 */
const SOLID_ALPHA = 128
/** 連續做幾次方框模糊：三次的結果已經很接近高斯模糊的柔和邊緣 */
const BLUR_PASSES = 3

/** 陰影往貼紙外延伸多遠（任一方向的最大值）：排版要預留這麼多空間，陰影才不會被畫布切掉 */
export function shadowReach(shadow: ShadowSettings): number {
  return shadow.enabled ? Math.ceil(shadow.distance + shadow.spread + shadow.size) : 0
}

/**
 * 一維方框模糊（就地修改）：每一格換成前後 radius 格的平均，超出畫布的部分視為 0（透明）。
 * 用「滑動視窗」累加：視窗往右移一格，只要加上新進來的、減掉移出去的，耗時與 radius 無關。
 */
function boxBlurLine(values: Float32Array, start: number, step: number, length: number, radius: number, buffer: Float32Array): void {
  for (let i = 0; i < length; i++) buffer[i] = values[start + i * step]
  const windowSize = radius * 2 + 1
  let sum = 0
  for (let i = 0; i <= Math.min(radius, length - 1); i++) sum += buffer[i]
  for (let i = 0; i < length; i++) {
    values[start + i * step] = sum / windowSize
    const entering = i + radius + 1
    const leaving = i - radius
    if (entering < length) sum += buffer[entering]
    if (leaving >= 0) sum -= buffer[leaving]
  }
}

function blur(values: Float32Array, width: number, height: number, size: number): void {
  // 三次方框疊起來的總影響範圍約為 3 × radius，所以每次用 size / 3
  const radius = Math.round(size / BLUR_PASSES)
  if (radius <= 0) return
  const buffer = new Float32Array(Math.max(width, height))
  for (let pass = 0; pass < BLUR_PASSES; pass++) {
    for (let y = 0; y < height; y++) boxBlurLine(values, y * width, 1, width, radius, buffer)
    for (let x = 0; x < width; x++) boxBlurLine(values, x, width, height, radius, buffer)
  }
}

/**
 * 陰影的濃淡（0–1）：輪廓 → 擴散 → 模糊 → 依角度與距離位移。
 * 輪廓包含白邊：白邊也是貼紙的一部分，陰影要從白邊外緣開始。
 */
export function shadowCoverage(image: PixelBuffer, shadow: ShadowSettings): Float32Array {
  const { width, height, data } = image
  const total = width * height
  const solid = new Uint8Array(total)
  for (let i = 0; i < total; i++) solid[i] = data[i * 4 + 3] >= SOLID_ALPHA ? 1 : 0

  // 擴散：離輪廓 spread 以內都算進來（邊緣留 1 px 過渡避免鋸齒）
  const shape = new Float32Array(total)
  if (shadow.spread > 0) {
    const distance = distanceToTarget(solid, width, height)
    for (let i = 0; i < total; i++) shape[i] = Math.min(1, Math.max(0, shadow.spread + 0.5 - distance[i]))
  } else {
    for (let i = 0; i < total; i++) shape[i] = data[i * 4 + 3] / 255
  }

  blur(shape, width, height, shadow.size)

  // 位移：陰影上的 (x, y) 取自輪廓上的 (x - dx, y - dy)
  const radians = (shadow.angle * Math.PI) / 180
  const dx = Math.round(Math.cos(radians) * shadow.distance)
  const dy = Math.round(Math.sin(radians) * shadow.distance)
  const shifted = new Float32Array(total)
  for (let y = 0; y < height; y++) {
    const sourceY = y - dy
    if (sourceY < 0 || sourceY >= height) continue
    for (let x = 0; x < width; x++) {
      const sourceX = x - dx
      if (sourceX >= 0 && sourceX < width) shifted[y * width + x] = shape[sourceY * width + sourceX]
    }
  }
  return shifted
}

/**
 * 把陰影墊在最底下（貼紙與白邊之下）。回傳新的 PixelBuffer，不修改傳入的 image；
 * 畫布大小不變，呼叫端要先預留陰影的空間。
 */
export function applyShadow(image: PixelBuffer, shadow: ShadowSettings): PixelBuffer {
  const { width, height, data } = image
  if (!shadow.enabled) return { data: new Uint8ClampedArray(data), width, height }
  return drawUnder(image, shadowCoverage(image, shadow), hexToRgb(shadow.color), shadow.opacity)
}
