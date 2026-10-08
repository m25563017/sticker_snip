import { hexToRgb } from './color'
import { drawUnder } from './compositing'
import type { PixelBuffer } from './pixelBuffer'

/** 實色背景設定（需求 4.2）：整張輸出畫布鋪一張圓角卡片，圓角單位是輸出圖片的 px */
export interface BackgroundSettings {
  enabled: boolean
  color: string
  radius: number
}

export const DEFAULT_BACKGROUND: BackgroundSettings = {
  enabled: false,
  color: '#ffffff',
  // 256×256 輸出時約 6%，是常見 App 圖示、卡片的圓角比例
  radius: 16,
}

/**
 * 填滿整張畫布的圓角矩形，每格的覆蓋程度（0–1）。
 *
 * 用「有正負號的距離」：像素中心在形狀外是正的、在形狀內是負的，
 * 邊界上保留 1 px 過渡，圓弧才不會有鋸齒。距離要帶正負號，
 * 最外圈像素（中心在邊界內側 0.5 px）才會算成完整覆蓋，而不是只覆蓋一半。
 */
export function roundedRectCoverage(width: number, height: number, radius: number): Float32Array {
  // 圓角最大到短邊的一半（變成膠囊形），再大就沒有意義
  const r = Math.min(Math.max(0, radius), width / 2, height / 2)
  const halfWidth = width / 2
  const halfHeight = height / 2
  const coverage = new Float32Array(width * height)

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      // 以中心為原點、扣掉「直邊」的長度：正數代表超出直邊的範圍，進入圓角或外面
      const qx = Math.abs(x + 0.5 - halfWidth) - (halfWidth - r)
      const qy = Math.abs(y + 0.5 - halfHeight) - (halfHeight - r)
      // 在外面：到圓角圓心的距離減掉半徑；在裡面：離最近直邊多遠（負數）
      const outsideDistance = Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) - r
      const insideDistance = Math.min(Math.max(qx, qy), 0)
      const signedDistance = outsideDistance + insideDistance
      coverage[y * width + x] = Math.min(1, Math.max(0, 0.5 - signedDistance))
    }
  }
  return coverage
}

/**
 * 把圓角卡片墊在最底下（陰影、白邊、貼紙之下）。回傳新的 PixelBuffer，不修改傳入的 image。
 */
export function applyBackground(image: PixelBuffer, background: BackgroundSettings): PixelBuffer {
  const { width, height, data } = image
  if (!background.enabled) return { data: new Uint8ClampedArray(data), width, height }
  return drawUnder(image, roundedRectCoverage(width, height, background.radius), hexToRgb(background.color))
}
