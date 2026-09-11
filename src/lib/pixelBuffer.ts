/**
 * 跟瀏覽器原生 `ImageData` 結構相容（同樣是 data / width / height），
 * 但刻意不直接用 `ImageData` 型別──`lib/` 底下的純函式因此不依賴 DOM，
 * 在 Node 測試環境（沒有瀏覽器、沒有 canvas）也能直接餵資料進去測試。
 */
export interface PixelBuffer {
  data: Uint8ClampedArray
  width: number
  height: number
}
