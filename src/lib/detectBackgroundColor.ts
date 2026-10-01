import type { RgbColor } from './color'
import type { ShapeMask } from './cropSelection'
import type { PixelBuffer } from './pixelBuffer'
import { isInsideMask, isMaskBorder } from './shapeMask'

/** 顏色分桶的間距：把相近的顏色視為同一色，過濾掉圖片壓縮／抗鋸齒造成的微小色差雜訊 */
const QUANTIZE_STEP = 8

/** 邊界像素中，眾數顏色至少要佔這個比例才信任「邊界法」，否則退回全圖直方圖備援 */
const BORDER_CONFIDENCE_RATIO = 0.5

/** 全圖直方圖備援時，每邊最多取樣這麼多點，控制運算量 */
const HISTOGRAM_SAMPLE_MAX_SIDE = 64

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

/** 收集形狀邊界一圈的像素顏色 */
function collectBorderColors(image: PixelBuffer, mask: ShapeMask | undefined): RgbColor[] {
  const { width, height } = image
  const colors: RgbColor[] = []

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (isInsideMask(mask, width, x, y) && isMaskBorder(mask, width, height, x, y)) {
        colors.push(readPixel(image, x, y))
      }
    }
  }

  return colors
}

/**
 * 每隔固定間距取樣形狀內的像素，當作全圖直方圖的統計樣本。
 * 不需要看每個像素──背景色面積通常遠大於其他顏色，抽樣就足以看出眾數。
 */
function sampleInsideColors(image: PixelBuffer, mask: ShapeMask | undefined): RgbColor[] {
  const { width, height } = image
  const step = Math.max(1, Math.ceil(Math.max(width, height) / HISTOGRAM_SAMPLE_MAX_SIDE))
  const colors: RgbColor[] = []

  for (let y = 0; y < height; y += step) {
    for (let x = 0; x < width; x += step) {
      if (isInsideMask(mask, width, x, y)) colors.push(readPixel(image, x, y))
    }
  }

  return colors
}

/**
 * 自動判斷單一範圍的背景色（需求文件 4.6）。
 *
 * 先假設背景色會出現在範圍的邊界一圈──使用者框選時通常會在貼紙四周留一點空白，
 * 這樣既準確又便宜。但如果框得太貼、裁到插畫邊緣，邊界像素會很分散、選不出
 * 明顯眾數，這時退而求其次，改看範圍內佔比最大的顏色──背景色的面積通常還是
 * 遠大於任何單一顏色。
 *
 * mask 用來排除形狀外的像素（例如橢圓外接矩形的四個角落），
 * 那些像素不屬於這個範圍，不該參與投票。不傳則整張圖都算。
 */
export function detectBackgroundColor(image: PixelBuffer, mask?: ShapeMask): RgbColor {
  const borderResult = findDominantColor(collectBorderColors(image, mask))

  if (borderResult.ratio >= BORDER_CONFIDENCE_RATIO) {
    return borderResult.color
  }

  return findDominantColor(sampleInsideColors(image, mask)).color
}
