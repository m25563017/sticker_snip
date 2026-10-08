import type { RgbColor } from './color'
import type { PixelBuffer } from './pixelBuffer'

/**
 * 取 (x, y) 周圍 (2 × radius + 1)² 格的平均色；radius = 0 就是單一像素的顏色。
 * 原圖多半是 JPG，單一格可能剛好是壓縮雜點，需要代表「那一帶」的顏色時可以取平均。
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

/**
 * 取出以 (x, y) 為中心、邊長 2 × radius + 1 的一小塊像素，給放大鏡顯示用。
 * 超出圖片的部分填透明，讓游標在圖片邊緣時放大鏡仍維持固定大小、中心不偏移。
 */
export function readPatch(image: PixelBuffer, x: number, y: number, radius: number): PixelBuffer {
  const size = radius * 2 + 1
  const data = new Uint8ClampedArray(size * size * 4)
  const left = Math.round(x) - radius
  const top = Math.round(y) - radius

  for (let row = 0; row < size; row++) {
    const sourceY = top + row
    if (sourceY < 0 || sourceY >= image.height) continue
    for (let column = 0; column < size; column++) {
      const sourceX = left + column
      if (sourceX < 0 || sourceX >= image.width) continue
      const from = (sourceY * image.width + sourceX) * 4
      data.set(image.data.subarray(from, from + 4), (row * size + column) * 4)
    }
  }

  return { data, width: size, height: size }
}
