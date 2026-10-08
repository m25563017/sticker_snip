import { forEachComponent } from './connectedComponents'
import type { PixelBuffer } from './pixelBuffer'

/**
 * 白邊設定（需求 4.2、4.7 外框），粗細單位是輸出圖片的 px。
 * 只開放顏色與粗細：貼紙白邊實務上都是不透明、邊緣俐落的，透明度與柔化用不到。
 */
export interface BorderSettings {
  enabled: boolean
  color: string
  thickness: number
}

export const DEFAULT_BORDER: BorderSettings = {
  enabled: false,
  color: '#ffffff',
  // 256×256 輸出時約 3%，是常見貼紙的白邊比例
  thickness: 8,
}

/** alpha 至少這麼不透明才算貼紙本體：邊緣半透明的抗鋸齒像素、殘留的淡雜訊不會長出白邊 */
const SOLID_ALPHA = 128
/** 白邊外緣保留 1 px 的過渡，否則斜線、弧線會出現明顯的鋸齒 */
const ANTIALIAS_WIDTH = 1
const INFINITY = 1e20

/**
 * 一維的平方距離轉換（Felzenszwalb & Huttenlocher, 2012）：
 * 對每個位置，找出「f 值 + 距離平方」最小的那個點。想像每個點都放一個開口朝上的拋物線，
 * 下包絡線就是答案；只要掃過一次就能建出下包絡線，所以耗時與長度成正比。
 */
function distanceTransform1D(
  f: Float64Array,
  length: number,
  output: Float64Array,
  vertices: Int32Array,
  boundaries: Float64Array,
): void {
  let k = 0
  vertices[0] = 0
  boundaries[0] = -INFINITY
  boundaries[1] = INFINITY

  for (let q = 1; q < length; q++) {
    let s: number
    // 新拋物線和目前最右邊那條的交點；交點在它的範圍左邊，代表那條被完全蓋住，丟掉
    for (;;) {
      const v = vertices[k]
      s = (f[q] + q * q - (f[v] + v * v)) / (2 * q - 2 * v)
      if (s > boundaries[k] || k === 0) break
      k--
    }
    k++
    vertices[k] = q
    boundaries[k] = s
    boundaries[k + 1] = INFINITY
  }

  k = 0
  for (let q = 0; q < length; q++) {
    while (boundaries[k + 1] < q) k++
    const v = vertices[k]
    output[q] = (q - v) * (q - v) + f[v]
  }
}

/**
 * 二維歐氏距離轉換：每個像素到最近「目標像素」的直線距離（目標像素本身為 0）。
 * 先對每一欄、再對每一列做一維轉換；兩個方向分開算的結果，等於真正的二維直線距離。
 * 用直線距離而非上下左右的步數，往外長出的形狀才會是圓弧，不會變成菱形或方形。
 */
export function distanceToTarget(isTarget: Uint8Array, width: number, height: number): Float64Array {
  const longest = Math.max(width, height)
  const f = new Float64Array(longest)
  const line = new Float64Array(longest)
  const vertices = new Int32Array(longest)
  const boundaries = new Float64Array(longest + 1)
  const squared = new Float64Array(width * height)

  for (let i = 0; i < width * height; i++) squared[i] = isTarget[i] ? 0 : INFINITY

  for (let x = 0; x < width; x++) {
    for (let y = 0; y < height; y++) f[y] = squared[y * width + x]
    distanceTransform1D(f, height, line, vertices, boundaries)
    for (let y = 0; y < height; y++) squared[y * width + x] = line[y]
  }
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) f[x] = squared[y * width + x]
    distanceTransform1D(f, width, line, vertices, boundaries)
    for (let x = 0; x < width; x++) squared[y * width + x] = Math.sqrt(line[x])
  }

  return squared
}

/**
 * 白邊的覆蓋程度（0–1）：沿著貼紙輪廓往外長 thickness，邊角是圓弧，並把窄縫、凹角填平。
 *
 * 做法是「先長胖、再削瘦」（影像處理的閉運算）：
 * 1. 往外長 thickness + smoothing：兩個部件之間的窄縫、輪廓的凹角都被填滿
 * 2. 再往內削 smoothing：外緣回到 thickness 的位置，但填平的地方不會被削開
 * 3. 外緣保留 1 px 的過渡，避免鋸齒
 */
export function borderCoverage(image: PixelBuffer, thickness: number): Float32Array {
  const { width, height, data } = image
  const smoothing = Math.max(1, thickness)

  /**
   * 四周多墊一圈空白再計算：「先長胖」的範圍可能超出畫布，
   * 若只在畫布裡找「外面」，靠邊的地方削不下去，會沿著畫布邊緣拉出尖刺。
   */
  const pad = Math.ceil(thickness + smoothing) + 1
  const paddedWidth = width + pad * 2
  const paddedHeight = height + pad * 2
  const paddedTotal = paddedWidth * paddedHeight
  const solid = new Uint8Array(paddedTotal)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (data[(y * width + x) * 4 + 3] >= SOLID_ALPHA) solid[(y + pad) * paddedWidth + x + pad] = 1
    }
  }
  ignoreSpecks(solid, paddedWidth, paddedHeight)

  // 1. 長胖：離貼紙 thickness + smoothing 以內都算進來
  const toSticker = distanceToTarget(solid, paddedWidth, paddedHeight)
  const outside = new Uint8Array(paddedTotal)
  for (let i = 0; i < paddedTotal; i++) outside[i] = toSticker[i] <= thickness + smoothing ? 0 : 1

  // 2. 削瘦：離「長胖後的外面」超過 smoothing 才保留；3. 外緣抗鋸齒。最後裁回原本的畫布大小
  const toOutside = distanceToTarget(outside, paddedWidth, paddedHeight)
  const coverage = new Float32Array(width * height)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const distance = toOutside[(y + pad) * paddedWidth + x + pad]
      coverage[y * width + x] = Math.min(1, Math.max(0, (distance - smoothing) / ANTIALIAS_WIDTH + 0.5))
    }
  }
  return coverage
}

/**
 * 面積不到最大塊這個比例的碎塊不長白邊。以 does/ 素材實測：殘留雜點約 0.02%，
 * 最小的正常裝飾（小叉叉、短線）約 0.7%，0.1% 落在兩者之間。
 * 用比例而非固定面積：同一顆雜點在 1024 輸出和 64 輸出上的像素數差很多。
 */
const SPECK_RATIO_TO_LARGEST = 0.001

/** 把太小的碎塊從遮罩上拿掉（只影響白邊計算，貼紙本身不受影響） */
function ignoreSpecks(solid: Uint8Array, width: number, height: number): void {
  const isSolid = (i: number) => solid[i] === 1
  let largest = 0
  forEachComponent(width, height, isSolid, (pixels) => {
    largest = Math.max(largest, pixels.length)
  })
  const minArea = largest * SPECK_RATIO_TO_LARGEST
  forEachComponent(width, height, isSolid, (pixels) => {
    if (pixels.length >= minArea) return
    for (const i of pixels) solid[i] = 0
  })
}

/**
 * 把白邊畫在貼紙下面：白邊色 × 覆蓋程度當底，貼紙以一般的「疊在上面」方式合成。
 * 回傳新的 PixelBuffer，不修改傳入的 image；畫布大小不變，呼叫端要先預留白邊的空間。
 */
export function applyBorder(image: PixelBuffer, border: BorderSettings): PixelBuffer {
  const { width, height, data } = image
  if (!border.enabled || border.thickness <= 0) return { data: new Uint8ClampedArray(data), width, height }

  const coverage = borderCoverage(image, border.thickness)
  const red = Number.parseInt(border.color.slice(1, 3), 16)
  const green = Number.parseInt(border.color.slice(3, 5), 16)
  const blue = Number.parseInt(border.color.slice(5, 7), 16)
  const output = new Uint8ClampedArray(data.length)

  for (let i = 0; i < width * height; i++) {
    const o = i * 4
    const borderAlpha = coverage[i]
    const stickerAlpha = data[o + 3] / 255
    // 「貼紙疊在白邊上」的 alpha 合成：上層顯示多少、剩下的讓下層透出來
    const alpha = stickerAlpha + borderAlpha * (1 - stickerAlpha)
    if (alpha === 0) continue
    const mix = (sticker: number, below: number) =>
      (sticker * stickerAlpha + below * borderAlpha * (1 - stickerAlpha)) / alpha
    output[o] = mix(data[o], red)
    output[o + 1] = mix(data[o + 1], green)
    output[o + 2] = mix(data[o + 2], blue)
    output[o + 3] = alpha * 255
  }

  return { data: output, width, height }
}
