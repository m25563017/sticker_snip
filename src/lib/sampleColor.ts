import type { RgbColor } from './color'
import type { PixelBuffer } from './pixelBuffer'

/**
 * 滴管取色：取 (x, y) 周圍 (2 × radius + 1)² 格的平均色，而不是單一像素。
 * 原圖多半是 JPG，點到的那一格可能剛好是壓縮雜點，取平均才能代表那一帶真正的背景色。
 * 靠近邊緣時只平均落在圖片內的格子。
 */
export function sampleColor(image: PixelBuffer, x: number, y: number, radius = 1): RgbColor {
  const centerX = Math.round(x)
  const centerY = Math.round(y)
  let sumR = 0
  let sumG = 0
  let sumB = 0
  let count = 0

  for (let ny = centerY - radius; ny <= centerY + radius; ny++) {
    if (ny < 0 || ny >= image.height) continue
    for (let nx = centerX - radius; nx <= centerX + radius; nx++) {
      if (nx < 0 || nx >= image.width) continue
      const i = (ny * image.width + nx) * 4
      sumR += image.data[i]
      sumG += image.data[i + 1]
      sumB += image.data[i + 2]
      count++
    }
  }

  if (count === 0) return { r: 0, g: 0, b: 0 }
  return { r: Math.round(sumR / count), g: Math.round(sumG / count), b: Math.round(sumB / count) }
}
