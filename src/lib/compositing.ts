import type { RgbColor } from './color'
import type { PixelBuffer } from './pixelBuffer'

/**
 * 在圖片「下面」墊一層單色（白邊、陰影共用）：coverage 決定每一格墊多濃，
 * 原圖以一般的「疊在上面」方式合成——上層顯示多少，剩下的讓下層透出來。
 * 回傳新的 PixelBuffer，不修改傳入的 image。
 *
 * @param coverage 每一格底色的濃度 0–1，長度 = 寬 × 高
 * @param opacity 整層底色的透明度 0–1
 */
export function drawUnder(image: PixelBuffer, coverage: Float32Array, color: RgbColor, opacity = 1): PixelBuffer {
  const { width, height, data } = image
  const output = new Uint8ClampedArray(data.length)

  for (let i = 0; i < width * height; i++) {
    const o = i * 4
    const belowAlpha = coverage[i] * opacity
    const topAlpha = data[o + 3] / 255
    const alpha = topAlpha + belowAlpha * (1 - topAlpha)
    if (alpha === 0) continue
    const mix = (top: number, below: number) => (top * topAlpha + below * belowAlpha * (1 - topAlpha)) / alpha
    output[o] = mix(data[o], color.r)
    output[o + 1] = mix(data[o + 1], color.g)
    output[o + 2] = mix(data[o + 2], color.b)
    output[o + 3] = alpha * 255
  }

  return { data: output, width, height }
}
