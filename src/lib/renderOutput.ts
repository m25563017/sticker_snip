import { outputLayout, type ExportSize, type OutputLayout } from './composeOutput'
import type { PixelBuffer } from './pixelBuffer'
import { applyBorder, type BorderSettings } from './stickerBorder'

/** 輸出時會用到的設定（OutputSettings 的一部分），只列這裡需要的，避免 lib 依賴 store 的型別 */
export interface RenderSettings {
  exportSize: ExportSize
  padding: number
  border: BorderSettings
}

/** 白邊往貼紙外延伸多寬：排版要預留這麼多空間，白邊才不會被畫布切掉 */
function effectMargin(settings: RenderSettings): number {
  return settings.border.enabled ? settings.border.thickness : 0
}

/**
 * 把裁好空白的貼紙依排版縮放、擺到輸出畫布上。
 * 縮放交給瀏覽器的 canvas（高品質模式），所以這一步需要 DOM，無法在 node 測試環境執行。
 */
function placeOnCanvas(content: PixelBuffer, layout: OutputLayout, scale: number): PixelBuffer {
  const source = document.createElement('canvas')
  source.width = content.width
  source.height = content.height
  source.getContext('2d')?.putImageData(new ImageData(content.data, content.width, content.height), 0, 0)

  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(layout.canvasWidth * scale))
  canvas.height = Math.max(1, Math.round(layout.canvasHeight * scale))
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('無法建立 2D canvas context，瀏覽器可能不支援')

  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(source, layout.x * scale, layout.y * scale, layout.width * scale, layout.height * scale)
  const { data, width, height } = ctx.getImageData(0, 0, canvas.width, canvas.height)
  return { data, width, height }
}

/**
 * 產生最終輸出的圖：排版（尺寸、邊距、預留白邊空間）→ 縮放擺放 → 白邊。
 * 預覽與匯出都走這一條，看到的就是下載到的。
 *
 * @param content 已經裁掉透明空白的貼紙（trimTransparent 的結果）
 * @param maxSide 預覽用：把整張輸出等比縮到長邊不超過這個值，白邊粗細也跟著縮放，比例和實際輸出一致。
 *   匯出時不傳，以實際輸出尺寸計算。
 */
export function renderOutput(content: PixelBuffer, settings: RenderSettings, maxSide?: number): PixelBuffer {
  const layout = outputLayout(content.width, content.height, settings.exportSize, settings.padding, effectMargin(settings))
  const scale = maxSide ? maxSide / Math.max(layout.canvasWidth, layout.canvasHeight) : 1
  const placed = placeOnCanvas(content, layout, scale)
  return applyBorder(placed, { ...settings.border, thickness: settings.border.thickness * scale })
}
