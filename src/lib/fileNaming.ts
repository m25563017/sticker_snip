/** 流水號最少位數，需求文件範例為 sticker_01.png */
const MIN_SEQUENCE_DIGITS = 2

/**
 * Windows／macOS 檔名不允許的字元，以及 `/`：
 * 放進 zip 時 `/` 會被當成資料夾分隔，解壓縮後檔案會跑進奇怪的子資料夾。
 */
const INVALID_FILENAME_CHARS = /[\\/:*?"<>|]/g

/** 前綴來自使用者輸入，換掉不能出現在檔名裡的字元 */
export function sanitizePrefix(prefix: string): string {
  return prefix.replace(INVALID_FILENAME_CHARS, '_')
}

/**
 * 依需求 4.2 的命名規則產生檔名：`{前綴}{補零流水號}.png`。
 *
 * 補零位數依總數決定（至少 2 位）：總共 120 張時要用 3 位數，
 * 否則 sticker_100 在檔案總管依名稱排序時會夾在 sticker_10 與 sticker_11 之間。
 *
 * @param index 從 0 開始的順序（即畫面上的編號 - 1）
 * @param total 本次匯出的總張數
 */
export function buildFileName(prefix: string, index: number, total: number): string {
  const digits = Math.max(MIN_SEQUENCE_DIGITS, String(total).length)
  const sequence = String(index + 1).padStart(digits, '0')
  return `${sanitizePrefix(prefix)}${sequence}.png`
}
