import type { PixelBuffer } from './pixelBuffer'

/** 輸出尺寸（需求 4.2）：original = 依實際大小輸出、不縮放；數字 = 正方形邊長 */
export type ExportSize = 'original' | 64 | 128 | 256 | 512 | 1024
export const EXPORT_SIZES: ExportSize[] = ['original', 64, 128, 256, 512, 1024]
export const DEFAULT_EXPORT_SIZE: ExportSize = 256
/** 預設邊距 16 px：在 256×256 上約 6%，貼紙不會貼齊邊緣看起來太擠 */
export const DEFAULT_PADDING = 16

/**
 * 輸出圖片的排版（單位：輸出圖片的 px）：畫布多大、貼紙畫在哪裡、畫多大。
 *
 * 只算位置、不實際產生排好版的像素：大貼紙輸出成小尺寸時，若先在原始解析度排版，
 * 中間圖可能大到上千萬像素（例如 1000 px 的貼紙輸出 64 px、邊距 16 px，就要 2000×2000）。
 * 匯出時直接畫到目標大小的 canvas，預覽則用 CSS 依同樣比例擺放。
 */
export interface OutputLayout {
  canvasWidth: number
  canvasHeight: number
  x: number
  y: number
  width: number
  height: number
}

/**
 * 裁掉四周完全透明的空白，只留貼紙實際的範圍。
 * 框選時留的空白每張都不一樣，先裁掉再加邊距，每張貼紙在輸出圖中的比例才會一致。
 * 全部都透明時回傳 1×1 的透明圖，避免後面出現寬高為 0 的圖。
 */
export function trimTransparent(image: PixelBuffer): PixelBuffer {
  const { width, height, data } = image
  let left = width
  let top = height
  let right = -1
  let bottom = -1

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (data[(y * width + x) * 4 + 3] === 0) continue
      if (x < left) left = x
      if (x > right) right = x
      if (y < top) top = y
      if (y > bottom) bottom = y
    }
  }

  if (right < 0) return { data: new Uint8ClampedArray(4), width: 1, height: 1 }

  const trimmedWidth = right - left + 1
  const trimmedHeight = bottom - top + 1
  const trimmed = new Uint8ClampedArray(trimmedWidth * trimmedHeight * 4)
  for (let row = 0; row < trimmedHeight; row++) {
    const from = ((top + row) * width + left) * 4
    trimmed.set(data.subarray(from, from + trimmedWidth * 4), row * trimmedWidth * 4)
  }
  return { data: trimmed, width: trimmedWidth, height: trimmedHeight }
}

/**
 * 依輸出設定排版（貼紙尺寸應為 trimTransparent 之後的大小）：
 * - original：不縮放，四周加上邊距
 * - 正方形：扣掉兩側邊距後等比縮放塞進去，置中
 *
 * @param padding 邊距，單位是輸出圖片的 px，量的是「畫布邊緣到最外層效果（例如白邊外緣）」的距離
 * @param effectMargin 貼紙外圍效果（白邊）往外延伸多寬；會在邊距內側再預留這麼多空間，效果才不會被畫布切掉
 */
export function outputLayout(
  contentWidth: number,
  contentHeight: number,
  size: ExportSize,
  padding: number,
  effectMargin = 0,
): OutputLayout {
  if (size === 'original') {
    const margin = Math.max(0, Math.round(padding)) + Math.max(0, Math.ceil(effectMargin))
    return {
      canvasWidth: contentWidth + margin * 2,
      canvasHeight: contentHeight + margin * 2,
      x: margin,
      y: margin,
      width: contentWidth,
      height: contentHeight,
    }
  }

  // 邊距加效果最多到邊長的一半少 1，至少保留 1 px 給貼紙本身
  const margin = Math.min(Math.max(0, padding) + Math.max(0, effectMargin), size / 2 - 0.5)
  const available = size - margin * 2
  const scale = Math.min(available / contentWidth, available / contentHeight)
  const width = Math.max(1, Math.round(contentWidth * scale))
  const height = Math.max(1, Math.round(contentHeight * scale))
  return {
    canvasWidth: size,
    canvasHeight: size,
    x: Math.round((size - width) / 2),
    y: Math.round((size - height) / 2),
    width,
    height,
  }
}
