import type { Bounds } from '@/types/selection'
import type { RgbColor } from './color'
import { forEachComponent } from './connectedComponents'
import type { PixelBuffer } from './pixelBuffer'

/**
 * 整張圖自動偵測貼紙（需求 4.3）：找出背景 → 標出前景 → 相近的前景合併成一張 → 框出外框。
 *
 * 參數以 does/ 的真實素材（Canva 網格、格紋紙底、透明底 PNG 等）實測調整。
 */

/**
 * 與背景色的距離超過這個值才算前景。比去背預設的 30 高一點：
 * 偵測只需要找出物件「大概在哪」，寧可把淡色格線、JPG 色偏當背景，
 * 物件本身靠深色輪廓仍然連得起來。
 */
const FOREGROUND_THRESHOLD = 40
/** alpha 低於這個值視為透明 */
const ALPHA_CUTOFF = 128
/** 統計背景色時每邊最多取樣幾個點 */
const BACKGROUND_SAMPLE_SIDE = 200
/** 顏色分桶間距，相近的顏色算同一色 */
const QUANTIZE_STEP = 8
/** 小於整張圖面積這個比例的前景碎屑視為 JPG 雜點，合併前先清掉，避免被當成橋樑把貼紙串在一起 */
const SPECK_AREA_RATIO = 0.00002
/**
 * 面積太小的群組（零散的小星星、雜點、短文字）不算貼紙，同時看兩個標準：
 * - 小於中位數的 10%：一般網格排列的素材，貼紙大小相近，中位數就是「一般貼紙」的大小
 * - 小於最大那張的 1%：小裝飾數量比貼紙還多時（例如海洋素材滿版小星星），中位數會被拉低而失效
 */
const MIN_AREA_RATIO_TO_MEDIAN = 0.1
const MIN_AREA_RATIO_TO_LARGEST = 0.01
/**
 * 合併距離預設為長邊的 1%：以 does/ 素材實測，貓咪、新年、透明底狐狸都能剛好分對，
 * 用比例是因為同樣的「小裝飾離主體的距離」在高解析度圖上會是更多像素。
 */
const MERGE_DISTANCE_RATIO = 0.01

export function defaultMergeDistance(width: number, height: number): number {
  return Math.max(1, Math.round(Math.max(width, height) * MERGE_DISTANCE_RATIO))
}

export interface DetectOptions {
  /**
   * 前景像素相距多少 px 以內算同一張貼紙。
   * 越大越能把飄在旁邊的小裝飾併進來，但也越容易把相鄰的兩張黏在一起。
   */
  mergeDistance: number
}

/**
 * 整張圖的背景：取樣後出現最多的顏色；透明像素比任何單一顏色都多時，回傳 null 代表「背景是透明」。
 * 不像單一範圍那樣看邊緣一圈：合併圖常有橫幅、外框貼著邊緣（實測 Canva、格紋紙素材都會誤判）。
 */
export function findCanvasBackground(image: PixelBuffer): RgbColor | null {
  const { width, height, data } = image
  const step = Math.max(1, Math.ceil(Math.max(width, height) / BACKGROUND_SAMPLE_SIDE))
  const buckets = new Map<number, { count: number; color: RgbColor }>()
  let transparentCount = 0
  let best: { count: number; color: RgbColor } | null = null

  for (let y = 0; y < height; y += step) {
    for (let x = 0; x < width; x += step) {
      const i = (y * width + x) * 4
      if (data[i + 3] < ALPHA_CUTOFF) {
        transparentCount++
        continue
      }
      const key =
        (Math.round(data[i] / QUANTIZE_STEP) << 16) |
        (Math.round(data[i + 1] / QUANTIZE_STEP) << 8) |
        Math.round(data[i + 2] / QUANTIZE_STEP)
      let bucket = buckets.get(key)
      if (!bucket) {
        bucket = { count: 0, color: { r: data[i], g: data[i + 1], b: data[i + 2] } }
        buckets.set(key, bucket)
      }
      bucket.count++
      if (!best || bucket.count > best.count) best = bucket
    }
  }

  if (!best || transparentCount > best.count) return null
  return best.color
}

function buildForegroundMask(image: PixelBuffer, background: RgbColor | null): Uint8Array {
  const { width, height, data } = image
  const mask = new Uint8Array(width * height)
  const thresholdSquared = FOREGROUND_THRESHOLD * FOREGROUND_THRESHOLD

  for (let pixelIndex = 0; pixelIndex < width * height; pixelIndex++) {
    const i = pixelIndex * 4
    if (data[i + 3] < ALPHA_CUTOFF) continue
    if (!background) {
      mask[pixelIndex] = 1
      continue
    }
    const dr = data[i] - background.r
    const dg = data[i + 1] - background.g
    const db = data[i + 2] - background.b
    if (dr * dr + dg * dg + db * db > thresholdSquared) mask[pixelIndex] = 1
  }

  return mask
}

/**
 * 方形膨脹：每個前景像素往外擴 radius 格。
 * 先橫向、再縱向，各用一次前綴和判斷「左右（上下）radius 格內有沒有前景」，
 * 耗時只和像素數有關、和 radius 無關，拖動合併距離滑桿時才不會越拉越慢。
 */
function dilate(mask: Uint8Array, width: number, height: number, radius: number): Uint8Array {
  if (radius <= 0) return mask
  const horizontal = new Uint8Array(width * height)
  const result = new Uint8Array(width * height)
  const prefix = new Int32Array(Math.max(width, height) + 1)

  for (let y = 0; y < height; y++) {
    const row = y * width
    for (let x = 0; x < width; x++) prefix[x + 1] = prefix[x] + mask[row + x]
    for (let x = 0; x < width; x++) {
      const count = prefix[Math.min(width, x + radius + 1)] - prefix[Math.max(0, x - radius)]
      if (count > 0) horizontal[row + x] = 1
    }
  }

  for (let x = 0; x < width; x++) {
    for (let y = 0; y < height; y++) prefix[y + 1] = prefix[y] + horizontal[y * width + x]
    for (let y = 0; y < height; y++) {
      const count = prefix[Math.min(height, y + radius + 1)] - prefix[Math.max(0, y - radius)]
      if (count > 0) result[y * width + x] = 1
    }
  }

  return result
}

interface Candidate extends Bounds {
  /** 群組內真正的前景像素數（不含膨脹出來的） */
  area: number
}

/**
 * 依閱讀順序排列：由上到下分列，每列由左到右。
 * 中心點的高度差在「目前這列平均高度的一半」以內就算同一列，容忍貼紙大小不一造成的上下錯位。
 */
function sortByReadingOrder(boxes: Bounds[]): Bounds[] {
  const centerY = (box: Bounds) => box.y + box.height / 2
  const sorted = [...boxes].sort((a, b) => centerY(a) - centerY(b))
  const rows: Bounds[][] = []

  for (const box of sorted) {
    const row = rows[rows.length - 1]
    const rowCenter = row && row.reduce((sum, item) => sum + centerY(item), 0) / row.length
    const rowHeight = row && row.reduce((sum, item) => sum + item.height, 0) / row.length
    if (row && Math.abs(centerY(box) - rowCenter) <= rowHeight / 2) {
      row.push(box)
    } else {
      rows.push([box])
    }
  }

  return rows.flatMap((row) => row.sort((a, b) => a.x - b.x))
}

export function detectStickers(image: PixelBuffer, options: DetectOptions): Bounds[] {
  const { width, height } = image
  const foreground = buildForegroundMask(image, findCanvasBackground(image))

  // ======== 1. 清掉 JPG 雜點 ========
  const speckArea = Math.max(4, Math.round(width * height * SPECK_AREA_RATIO))
  forEachComponent(
    width,
    height,
    (i) => foreground[i] === 1,
    (pixels) => {
      if (pixels.length >= speckArea) return
      for (const i of pixels) foreground[i] = 0
    },
  )

  // ======== 2. 膨脹後相連的算同一群；外框只用原本的前景像素計算，才不會被膨脹撐大 ========
  const merged = dilate(foreground, width, height, Math.round(options.mergeDistance / 2))
  const candidates: Candidate[] = []
  forEachComponent(
    width,
    height,
    (i) => merged[i] === 1,
    (pixels) => {
      let left = width
      let top = height
      let right = -1
      let bottom = -1
      let area = 0
      for (const i of pixels) {
        if (!foreground[i]) continue
        const x = i % width
        const y = (i - x) / width
        if (x < left) left = x
        if (x > right) right = x
        if (y < top) top = y
        if (y > bottom) bottom = y
        area++
      }
      if (area > 0) candidates.push({ x: left, y: top, width: right - left + 1, height: bottom - top + 1, area })
    },
  )

  // ======== 3. 過濾：碰到圖片邊緣的（橫幅、外框）與太小的（小星星、短文字）不算貼紙 ========
  const touchesEdge = (box: Bounds) =>
    box.x === 0 || box.y === 0 || box.x + box.width === width || box.y + box.height === height
  const inner = candidates.filter((box) => !touchesEdge(box))
  const areas = inner.map((box) => box.area).sort((a, b) => a - b)
  const medianArea = areas[Math.floor(areas.length / 2)] ?? 0
  const largestArea = areas[areas.length - 1] ?? 0
  const minArea = Math.max(medianArea * MIN_AREA_RATIO_TO_MEDIAN, largestArea * MIN_AREA_RATIO_TO_LARGEST)
  const stickers = inner.filter((box) => box.area >= minArea)

  // ======== 4. 外框加留白：去背時貼紙周圍要有背景可以「倒水」 ========
  const padding = Math.max(2, options.mergeDistance)
  const padded = stickers.map((box) => {
    const left = Math.max(0, box.x - padding)
    const top = Math.max(0, box.y - padding)
    const right = Math.min(width, box.x + box.width + padding)
    const bottom = Math.min(height, box.y + box.height + padding)
    return { x: left, y: top, width: right - left, height: bottom - top }
  })

  return sortByReadingOrder(padded)
}
