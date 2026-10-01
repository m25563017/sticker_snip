import type { RgbColor } from './color'
import type { ShapeMask } from './cropSelection'
import type { PixelBuffer } from './pixelBuffer'
import { isInsideMask, isMaskBorder } from './shapeMask'

/**
 * 從範圍邊界做 flood fill 去背（需求 4.7），行為同 Photoshop 魔術棒的「連續」選取：
 * 只有「和範圍外部背景相連、且顏色在閾值內」的像素才變透明。
 * 物件內部就算有和背景同色的區塊（例如白色反光），只要被物件的輪廓包住、
 * 沒有一條同色路徑通到邊界，就會保留下來。
 *
 * 形狀外的像素（mask = 0）不屬於這個範圍，一律變透明。
 * 回傳新的 PixelBuffer，不修改傳入的 image。
 */
export function floodFillRemove(
  image: PixelBuffer,
  mask: ShapeMask | undefined,
  backgroundColor: RgbColor,
  threshold: number,
): PixelBuffer {
  const { width, height } = image
  const total = width * height
  const data = new Uint8ClampedArray(image.data)

  // 比較平方距離，省掉每個像素都要算一次開根號
  const thresholdSquared = threshold * threshold
  function isBackgroundLike(pixelIndex: number): boolean {
    const offset = pixelIndex * 4
    const dr = data[offset] - backgroundColor.r
    const dg = data[offset + 1] - backgroundColor.g
    const db = data[offset + 2] - backgroundColor.b
    return dr * dr + dg * dg + db * db <= thresholdSquared
  }

  /**
   * visited 記錄「已經排進佇列過」的像素，確保每個像素最多處理一次。
   * 佇列用預先配置好的 Int32Array 而非一般陣列：每個像素最多進佇列一次，
   * 長度 total 一定夠用，也避免一般陣列塞上百萬個元素時反覆擴充記憶體。
   */
  const visited = new Uint8Array(total)
  const queue = new Int32Array(total)
  let head = 0
  let tail = 0

  function enqueue(pixelIndex: number): void {
    visited[pixelIndex] = 1
    queue[tail++] = pixelIndex
  }

  /** 鄰居沒走過、在形狀內、顏色接近背景，才排進佇列 */
  function tryVisit(neighbor: number): void {
    if (visited[neighbor]) return
    if (mask !== undefined && mask[neighbor] !== 1) return
    if (!isBackgroundLike(neighbor)) return
    enqueue(neighbor)
  }

  // ======== 1. 播種：形狀邊界上、顏色接近背景的像素就是起點 ========
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const pixelIndex = y * width + x
      if (!isInsideMask(mask, width, x, y)) {
        data[pixelIndex * 4 + 3] = 0
        continue
      }
      if (isMaskBorder(mask, width, height, x, y) && isBackgroundLike(pixelIndex)) {
        enqueue(pixelIndex)
      }
    }
  }

  // ======== 2. BFS：從起點往上下左右擴散，只走進形狀內、顏色接近背景的像素 ========
  while (head < tail) {
    const pixelIndex = queue[head++]
    data[pixelIndex * 4 + 3] = 0

    // 一維索引換回 (x, y)，用來判斷是否貼著圖片邊緣、哪個方向不能再走
    const x = pixelIndex % width
    const y = (pixelIndex - x) / width
    if (x > 0) tryVisit(pixelIndex - 1)
    if (x < width - 1) tryVisit(pixelIndex + 1)
    if (y > 0) tryVisit(pixelIndex - width)
    if (y < height - 1) tryVisit(pixelIndex + width)
  }

  return { data, width, height }
}
