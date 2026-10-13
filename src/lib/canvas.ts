import type { PixelBuffer } from './pixelBuffer'

/**
 * 上傳圖片的長邊上限。iPhone Safari 單張畫布最多約 1677 萬像素（4096 × 4096），
 * 超過就畫不出來；這個大小對素材圖也綽綽有餘，裡面的貼紙輸出 1024 px 仍然清楚。
 */
export const MAX_IMAGE_SIDE = 4096

/** 長邊超過上限時等比縮小到剛好等於上限；沒超過就原樣回傳 */
export function limitImageSize(width: number, height: number, maxSide: number): { width: number; height: number } {
  const scale = maxSide / Math.max(width, height)
  if (scale >= 1) return { width, height }
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) }
}

/**
 * 太大的圖先縮小再處理。縮小用 canvas 畫一次（瀏覽器內建的高品質縮放），
 * 原本的大 bitmap 用完就釋放，不佔著記憶體。沒超過上限時原樣回傳同一個 bitmap。
 */
export async function downscaleBitmap(bitmap: ImageBitmap, maxSide: number): Promise<ImageBitmap> {
  const { width, height } = limitImageSize(bitmap.width, bitmap.height, maxSide)
  if (width === bitmap.width && height === bitmap.height) return bitmap

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('無法建立 2D canvas context，瀏覽器可能不支援')
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(bitmap, 0, 0, width, height)
  bitmap.close()
  return createImageBitmap(canvas)
}

/**
 * 把 ImageBitmap 畫到一張隱藏的 canvas 上，再讀出原始像素資料。
 * 這是唯一需要真的碰瀏覽器 Canvas API 的地方──
 * 之後 detectBackgroundColor／flood fill 去背都只操作這個純資料結構，
 * 才能在不需要瀏覽器的 Vitest（node 環境）裡直接測試。
 */
export function imageBitmapToPixelBuffer(bitmap: ImageBitmap): PixelBuffer {
  const canvas = document.createElement('canvas')
  canvas.width = bitmap.width
  canvas.height = bitmap.height

  const ctx = canvas.getContext('2d')
  if (!ctx) {
    throw new Error('無法建立 2D canvas context，瀏覽器可能不支援')
  }

  ctx.drawImage(bitmap, 0, 0)
  const { data, width, height } = ctx.getImageData(0, 0, canvas.width, canvas.height)
  return { data, width, height }
}

/**
 * 把像素資料編碼成 PNG 檔。PNG 才保留得住去背後的透明度（JPG 沒有 alpha）。
 * canvas.toBlob 是回呼式 API，這裡包成 Promise，呼叫端才能用 await 依序處理。
 */
export function pixelBufferToPngBlob(image: PixelBuffer): Promise<Blob> {
  const canvas = document.createElement('canvas')
  canvas.width = image.width
  canvas.height = image.height
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    return Promise.reject(new Error('無法建立 2D canvas context，瀏覽器可能不支援'))
  }
  ctx.putImageData(new ImageData(image.data, image.width, image.height), 0, 0)

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob)
      else reject(new Error('PNG 編碼失敗'))
    }, 'image/png')
  })
}

export interface ContainSize {
  width: number
  height: number
  /** 顯示尺寸 / 原始尺寸 的縮放比例，之後把螢幕座標換算回原圖座標時會用到 */
  scale: number
}

/**
 * 計算把原圖等比例塞進容器的顯示尺寸（概念同 CSS `object-fit: contain`）。
 *
 * 不限制只能縮小──素材圖常常比工作區小很多，硬是照原始尺寸顯示會讓選取
 * 目標小到很難點，所以這裡允許放大到填滿容器，方便使用者操作。最終輸出
 * 的圖仍然是從原始解析度的 PixelBuffer 裁切，畫面上的放大只影響好不好選。
 */
export function computeContainSize(
  sourceWidth: number,
  sourceHeight: number,
  maxWidth: number,
  maxHeight: number,
): ContainSize {
  if (sourceWidth <= 0 || sourceHeight <= 0 || maxWidth <= 0 || maxHeight <= 0) {
    return { width: 0, height: 0, scale: 0 }
  }

  const scale = Math.min(maxWidth / sourceWidth, maxHeight / sourceHeight)
  return {
    width: Math.round(sourceWidth * scale),
    height: Math.round(sourceHeight * scale),
    scale,
  }
}
