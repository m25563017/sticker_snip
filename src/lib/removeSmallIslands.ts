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
 * 相連採 8 方向（含斜角）：手繪的細斜線在像素上常常只靠斜角相連，
 * 若只看上下左右，一條斜線會被拆成很多個 1 px 的小島而被誤刪。
 *
 * 回傳新的 PixelBuffer，不修改傳入的 image。
 */
export function removeSmallIslands(image: PixelBuffer, minArea: number): PixelBuffer {
  const { width, height } = image
  const total = width * height
  const data = new Uint8ClampedArray(image.data)

  const isOpaque = (pixelIndex: number) => data[pixelIndex * 4 + 3] !== 0
  const visited = new Uint8Array(total)
  /**
   * 每座島 BFS 時，佇列從 0 開始重複使用：處理完一座島，佇列 [0, tail) 剛好就是
   * 這座島的所有像素，面積不夠時直接拿來逐一設成透明，不必再另外記錄。
   */
  const queue = new Int32Array(total)

  for (let start = 0; start < total; start++) {
    if (visited[start] || !isOpaque(start)) continue

    let head = 0
    let tail = 0
    visited[start] = 1
    queue[tail++] = start

    while (head < tail) {
      const pixelIndex = queue[head++]
      const x = pixelIndex % width
      const y = (pixelIndex - x) / width

      for (let dy = -1; dy <= 1; dy++) {
        const ny = y + dy
        if (ny < 0 || ny >= height) continue
        for (let dx = -1; dx <= 1; dx++) {
          const nx = x + dx
          if ((dx === 0 && dy === 0) || nx < 0 || nx >= width) continue
          const neighbor = ny * width + nx
          if (visited[neighbor] || !isOpaque(neighbor)) continue
          visited[neighbor] = 1
          queue[tail++] = neighbor
        }
      }
    }

    // tail 就是這座島的面積
    if (tail < minArea) {
      for (let i = 0; i < tail; i++) data[queue[i] * 4 + 3] = 0
    }
  }

  return { data, width, height }
}
