/**
 * 跟瀏覽器原生 `ImageData` 結構相容（同樣是 data / width / height），
 * 但刻意不直接用 `ImageData` 型別──`lib/` 底下的純函式因此不依賴 DOM，
 * 在 Node 測試環境（沒有瀏覽器、沒有 canvas）也能直接餵資料進去測試。
 */
export interface PixelBuffer {
  /**
   * 明確標成一般 ArrayBuffer（而非可能是多執行緒共用的 SharedArrayBuffer），
   * 瀏覽器的 `new ImageData()` 只接受前者，畫縮圖時才能直接把資料交給 canvas。
   */
  data: Uint8ClampedArray<ArrayBuffer>
  width: number
  height: number
}
