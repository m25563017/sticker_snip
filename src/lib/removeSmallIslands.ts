import { forEachComponent } from './connectedComponents'
import type { PixelBuffer } from './pixelBuffer'

/** 孤島面積門檻的下限：再小的範圍，1～2 px 的雜點也一定要清掉 */
const MIN_ISLAND_AREA = 8

/**
 * 孤島面積門檻佔範圍面積的比例。
 * 以實際素材（約 13 萬 px 的範圍）量測：JPG 壓縮雜點都 ≤ 5 px，
 * 最小的正常裝飾（汗滴、短線）約 50 px 以上，萬分之一 ≈ 13 px 落在兩者之間。
 * 用比例而非固定值，是因為解析度越高，壓縮雜點也會跟著變大。
 */
const ISLAND_AREA_RATIO = 0.0001

/** 依範圍大小算出「小於多少 px 的孤島要清掉」 */
export function minIslandArea(width: number, height: number): number {
  return Math.max(MIN_ISLAND_AREA, Math.round(width * height * ISLAND_AREA_RATIO))
}

/**
 * 去背後清除孤立的小雜點：把不透明像素依「是否相連」分成一座座島，
 * 面積小於 minArea 的島變透明。
 *
 * 不採用「只保留最大一塊」：貼紙常有和主體分開的小裝飾（愛心、短線、小道具），
 * 那些也是貼紙的一部分，所以只用面積判斷，小到像雜點的才清掉。
 *
 * 回傳新的 PixelBuffer，不修改傳入的 image。
 */
export function removeSmallIslands(image: PixelBuffer, minArea: number): PixelBuffer {
  const { width, height } = image
  const data = new Uint8ClampedArray(image.data)

  forEachComponent(
    width,
    height,
    (pixelIndex) => data[pixelIndex * 4 + 3] !== 0,
    (pixels) => {
      if (pixels.length >= minArea) return
      for (const pixelIndex of pixels) data[pixelIndex * 4 + 3] = 0
    },
  )

  return { data, width, height }
}
