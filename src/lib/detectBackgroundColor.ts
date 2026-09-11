import type { RgbColor } from './color'
import type { PixelBuffer } from './pixelBuffer'

/** 顏色分桶的間距：把相近的顏色視為同一色，過濾掉圖片壓縮／抗鋸齒造成的微小色差雜訊 */
const QUANTIZE_STEP = 8

/** 邊界像素中，眾數顏色至少要佔這個比例才信任「邊界法」，否則退回全圖直方圖備援 */
const BORDER_CONFIDENCE_RATIO = 0.5

/** 全圖直方圖備援時，先把圖縮到這個邊長以內，控制運算量 */
const HISTOGRAM_DOWNSCALE_MAX_SIDE = 64

function quantizeChannel(value: number): number {
  return Math.round(value / QUANTIZE_STEP) * QUANTIZE_STEP
}

function colorBucketKey(color: RgbColor): string {
  return `${quantizeChannel(color.r)},${quantizeChannel(color.g)},${quantizeChannel(color.b)}`
}

function readPixel(image: PixelBuffer, x: number, y: number): RgbColor {
  const i = (y * image.width + x) * 4
  return { r: image.data[i], g: image.data[i + 1], b: image.data[i + 2] }
}

/** 統計一批顏色的眾數（依分桶後的 key），回傳代表色與其佔比 */
function findDominantColor(colors: RgbColor[]): { color: RgbColor; ratio: number } {
  const buckets = new Map<string, { count: number; sample: RgbColor }>()

  for (const color of colors) {
    const key = colorBucketKey(color)
    const bucket = buckets.get(key)
    if (bucket) {
      bucket.count += 1
    } else {
      buckets.set(key, { count: 1, sample: color })
    }
  }

  let best = { count: 0, sample: { r: 255, g: 255, b: 255 } }
  for (const bucket of buckets.values()) {
    if (bucket.count > best.count) best = bucket
  }

  return { color: best.sample, ratio: colors.length === 0 ? 0 : best.count / colors.length }
}

/** 收集圖片最外圍一圈（上下左右四邊）的像素顏色 */
function collectBorderColors(image: PixelBuffer): RgbColor[] {
  const { width, height } = image
  const colors: RgbColor[] = []

  for (let x = 0; x < width; x++) {
    colors.push(readPixel(image, x, 0))
    colors.push(readPixel(image, x, height - 1))
  }
  // 上下兩排已經含蓋左右兩端的角落，這裡從 1 到 height-2 避免角落重複計算
  for (let y = 1; y < height - 1; y++) {
    colors.push(readPixel(image, 0, y))
    colors.push(readPixel(image, width - 1, y))
  }

  return colors
}

/** 用最近鄰取樣把圖片縮到指定邊長以內，只為了讓全圖直方圖統計的運算量可控 */
function downscale(image: PixelBuffer, maxSide: number): PixelBuffer {
  const scale = Math.min(1, maxSide / Math.max(image.width, image.height))
  const width = Math.max(1, Math.round(image.width * scale))
  const height = Math.max(1, Math.round(image.height * scale))
  const data = new Uint8ClampedArray(width * height * 4)

  for (let y = 0; y < height; y++) {
    const sourceY = Math.min(image.height - 1, Math.floor(y / scale))
    for (let x = 0; x < width; x++) {
      const sourceX = Math.min(image.width - 1, Math.floor(x / scale))
      const sourceIndex = (sourceY * image.width + sourceX) * 4
      const targetIndex = (y * width + x) * 4
      data[targetIndex] = image.data[sourceIndex]
      data[targetIndex + 1] = image.data[sourceIndex + 1]
      data[targetIndex + 2] = image.data[sourceIndex + 2]
      data[targetIndex + 3] = image.data[sourceIndex + 3]
    }
  }

  return { data, width, height }
}

function collectAllColors(image: PixelBuffer): RgbColor[] {
  const colors: RgbColor[] = []
  const total = image.width * image.height
  for (let i = 0; i < total; i++) {
    const offset = i * 4
    colors.push({ r: image.data[offset], g: image.data[offset + 1], b: image.data[offset + 2] })
  }
  return colors
}

/**
 * 自動判斷合成圖的背景色（需求文件 4.4）。
 *
 * 先假設背景色會出現在圖片最外圍一圈──這對「貼紙置中排列、四周留白」的
 * 素材圖既準確又便宜。但如果剛好有插畫畫到邊緣，邊界像素會很分散、選不出
 * 明顯眾數，這時退而求其次，改看縮小後的全圖裡佔比最大的顏色──背景色的
 * 面積通常還是遠大於任何單一插畫。
 */
export function detectBackgroundColor(image: PixelBuffer): RgbColor {
  const borderResult = findDominantColor(collectBorderColors(image))

  if (borderResult.ratio >= BORDER_CONFIDENCE_RATIO) {
    return borderResult.color
  }

  const downscaled = downscale(image, HISTOGRAM_DOWNSCALE_MAX_SIDE)
  return findDominantColor(collectAllColors(downscaled)).color
}
