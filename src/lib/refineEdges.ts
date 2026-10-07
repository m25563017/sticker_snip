import type { RgbColor } from './color'
import type { PixelBuffer } from './pixelBuffer'

/** 去背邊緣品質（需求 4.2），對應不同的邊緣處理寬度與羽化程度 */
export type EdgeQuality = 'pixel' | 'smooth' | 'ultra'

interface EdgeRefineOptions {
  /** 處理離透明區幾格以內的像素。實測光暈只有 1～2 px 寬 */
  bandWidth: number
  /** 往外找多遠來估計「純物件色」 */
  sampleRadius: number
  /** 透明度模糊的半徑（抗鋸齒），0 = 不羽化 */
  featherRadius: number
}

/**
 * - pixel：不處理，保留硬邊，適合像素風格、不希望邊緣變半透明的素材
 * - smooth：只解混色。原圖邊緣本來就是抗鋸齒過的平滑邊，解混色後自然就是平滑的半透明邊；
 *   實測再加羽化會把最外圈再磨掉一層，5～7 px 寬的小短線會整條明顯變淡
 * - ultra：解混色範圍加寬，再加 1 px 羽化，給本身邊緣就很硬（有鋸齒）的素材用
 */
const EDGE_OPTIONS: Record<EdgeQuality, EdgeRefineOptions | null> = {
  pixel: null,
  smooth: { bandWidth: 2, sampleRadius: 3, featherRadius: 0 },
  ultra: { bandWidth: 3, sampleRadius: 4, featherRadius: 1 },
}

/**
 * 物件色和背景色至少要差這麼多，才能可靠地算出混色比例。
 * 太接近時（例如貼紙本身的白色部分貼著白色背景）分不出哪些是背景混進來的，
 * 寧可不處理、保留一點白邊，也不要把貼紙本身的顏色變透明。
 */
const MIN_FOREGROUND_CONTRAST = 30

/** 透明度低於此值時，反推的顏色誤差會被放大到失真，改用估計的物件色 */
const MIN_ALPHA_FOR_UNMIX = 0.05

/**
 * 算出每個像素離最近的透明像素有幾格（上下左右步數），只算到 maxDistance 為止。
 * 0 = 本身透明；超過 maxDistance 的維持 -1，代表「物件內部，不必處理」。
 */
function distanceToTransparent(alpha: Uint8ClampedArray, width: number, height: number, maxDistance: number): Int32Array {
  const total = width * height
  const distance = new Int32Array(total).fill(-1)
  const queue = new Int32Array(total)
  let head = 0
  let tail = 0

  for (let i = 0; i < total; i++) {
    if (alpha[i * 4 + 3] === 0) {
      distance[i] = 0
      queue[tail++] = i
    }
  }

  function tryVisit(neighbor: number, nextDistance: number): void {
    if (distance[neighbor] !== -1) return
    distance[neighbor] = nextDistance
    queue[tail++] = neighbor
  }

  while (head < tail) {
    const pixelIndex = queue[head++]
    const nextDistance = distance[pixelIndex] + 1
    if (nextDistance > maxDistance) continue

    const x = pixelIndex % width
    const y = (pixelIndex - x) / width
    if (x > 0) tryVisit(pixelIndex - 1, nextDistance)
    if (x < width - 1) tryVisit(pixelIndex + 1, nextDistance)
    if (y > 0) tryVisit(pixelIndex - width, nextDistance)
    if (y < height - 1) tryVisit(pixelIndex + width, nextDistance)
  }

  return distance
}

/**
 * 邊緣處理（需求 4.7 的羽化），分兩步：
 *
 * 1. 解混色：原圖邊緣的抗鋸齒像素是「物件色 × α + 背景色 × (1 − α)」混出來的，
 *    放到深色底上就是一圈白邊。往內取樣估出純物件色後反推 α，
 *    把背景色的成分扣掉、改用透明度表達，邊緣就能貼合任何底色。
 * 2. 羽化（僅 ultra）：把邊緣一圈的透明度和周圍平均，消除去背後的鋸齒。
 *
 * 只處理離透明區 bandWidth 格以內的像素，物件內部完全不動。
 * 回傳新的 PixelBuffer，不修改傳入的 image。
 */
export function refineEdges(image: PixelBuffer, backgroundColor: RgbColor, quality: EdgeQuality): PixelBuffer {
  const { width, height } = image
  const data = new Uint8ClampedArray(image.data)
  const options = EDGE_OPTIONS[quality]
  if (!options) return { data, width, height }

  const { bandWidth, sampleRadius, featherRadius } = options
  const source = image.data
  const distance = distanceToTransparent(source, width, height, bandWidth)
  const isInBand = (pixelIndex: number) => distance[pixelIndex] >= 1
  /** -1 = 超出處理範圍的物件內部，可以當作「純物件色」的取樣來源 */
  const isInterior = (pixelIndex: number) => distance[pixelIndex] === -1
  const background = [backgroundColor.r, backgroundColor.g, backgroundColor.b]
  const minContrastSquared = MIN_FOREGROUND_CONTRAST * MIN_FOREGROUND_CONTRAST

  const distanceToBackgroundSquared = (pixelIndex: number) => {
    const dr = source[pixelIndex * 4] - background[0]
    const dg = source[pixelIndex * 4 + 1] - background[1]
    const db = source[pixelIndex * 4 + 2] - background[2]
    return dr * dr + dg * dg + db * db
  }

  /**
   * 細線條（短線、汗滴、抖動線）只有 1～2 px 寬，整條都是邊緣、沒有內部。
   * 若照樣羽化，周圍幾乎都是透明，平均下來整條會變淡，所以標記起來跳過羽化。
   */
  const isThinStroke = new Uint8Array(width * height)

  // ======== 1. 解混色 ========
  for (let pixelIndex = 0; pixelIndex < width * height; pixelIndex++) {
    if (!isInBand(pixelIndex)) continue
    const x = pixelIndex % width
    const y = (pixelIndex - x) / width

    /**
     * 估計純物件色：優先用附近物件內部像素的平均。
     * 細線條沒有內部，退而改用附近「最不像背景」的像素，通常就是線條的中心。
     */
    let sumR = 0
    let sumG = 0
    let sumB = 0
    let count = 0
    let purest = -1
    let purestDistance = -1
    for (let ny = Math.max(0, y - sampleRadius); ny <= Math.min(height - 1, y + sampleRadius); ny++) {
      for (let nx = Math.max(0, x - sampleRadius); nx <= Math.min(width - 1, x + sampleRadius); nx++) {
        const neighbor = ny * width + nx
        if (isInterior(neighbor)) {
          sumR += source[neighbor * 4]
          sumG += source[neighbor * 4 + 1]
          sumB += source[neighbor * 4 + 2]
          count++
        } else if (isInBand(neighbor) && distanceToBackgroundSquared(neighbor) > purestDistance) {
          purest = neighbor
          purestDistance = distanceToBackgroundSquared(neighbor)
        }
      }
    }

    let foreground: number[]
    if (count > 0) {
      foreground = [sumR / count, sumG / count, sumB / count]
    } else {
      isThinStroke[pixelIndex] = 1
      foreground = [source[purest * 4], source[purest * 4 + 1], source[purest * 4 + 2]]
    }
    const toForeground = foreground.map((value, c) => value - background[c])
    const contrastSquared = toForeground.reduce((sum, value) => sum + value * value, 0)
    if (contrastSquared < minContrastSquared) continue

    /**
     * α = 這個像素「從背景色往物件色走了多遠」的比例：
     * 把 (像素色 − 背景色) 投影到 (物件色 − 背景色) 這條線上。
     */
    const offset = pixelIndex * 4
    const toPixel = [0, 1, 2].map((c) => source[offset + c] - background[c])
    const projection = toPixel.reduce((sum, value, c) => sum + value * toForeground[c], 0)
    const alpha = Math.min(1, Math.max(0, projection / contrastSquared))

    for (let c = 0; c < 3; c++) {
      // 由「看到的色 = 物件色 × α + 背景色 × (1 − α)」反推物件色
      data[offset + c] =
        alpha > MIN_ALPHA_FOR_UNMIX ? (source[offset + c] - (1 - alpha) * background[c]) / alpha : foreground[c]
    }
    data[offset + 3] = Math.round(alpha * source[offset + 3])
  }

  if (featherRadius === 0) return { data, width, height }

  // ======== 2. 羽化：邊緣透明度取周圍平均，只會變得更透明、不會變得更不透明 ========
  const unmixedAlpha = new Uint8ClampedArray(width * height)
  for (let i = 0; i < width * height; i++) unmixedAlpha[i] = data[i * 4 + 3]

  for (let pixelIndex = 0; pixelIndex < width * height; pixelIndex++) {
    if (!isInBand(pixelIndex) || isThinStroke[pixelIndex]) continue
    const x = pixelIndex % width
    const y = (pixelIndex - x) / width

    let sum = 0
    let count = 0
    for (let dy = -featherRadius; dy <= featherRadius; dy++) {
      for (let dx = -featherRadius; dx <= featherRadius; dx++) {
        /**
         * 超出圖片的位置改讀最靠近的邊緣像素（延伸邊緣）：
         * 物件貼著裁切邊界時，不該因為「圖片到底了」而被羽化得比其他地方更淡或更濃。
         */
        const nx = Math.min(width - 1, Math.max(0, x + dx))
        const ny = Math.min(height - 1, Math.max(0, y + dy))
        sum += unmixedAlpha[ny * width + nx]
        count++
      }
    }
    data[pixelIndex * 4 + 3] = Math.min(unmixedAlpha[pixelIndex], Math.round(sum / count))
  }

  return { data, width, height }
}
