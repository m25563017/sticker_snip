/** RGB 顏色（0–255），不含 alpha */
export interface RgbColor {
  r: number
  g: number
  b: number
}

function toHexByte(value: number): string {
  return Math.max(0, Math.min(255, Math.round(value))).toString(16).padStart(2, '0')
}

/** RGB 轉成 `<input type="color">` 和 CSS 都吃的 `#rrggbb` 格式 */
export function rgbToHex({ r, g, b }: RgbColor): string {
  return `#${toHexByte(r)}${toHexByte(g)}${toHexByte(b)}`
}

/** `#rrggbb`（可省略 #）轉回 RGB，格式錯誤時視為黑色 */
export function hexToRgb(hex: string): RgbColor {
  const normalized = hex.replace('#', '')
  const value = Number.parseInt(normalized, 16)
  if (normalized.length !== 6 || Number.isNaN(value)) {
    return { r: 0, g: 0, b: 0 }
  }
  return {
    r: (value >> 16) & 0xff,
    g: (value >> 8) & 0xff,
    b: value & 0xff,
  }
}
