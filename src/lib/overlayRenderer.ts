import type { Bounds, Point, SelectionType } from '@/types/selection'
import { handlePositions } from './resizeHandles'

/**
 * 畫布疊層（框線、編號、控制點）的繪製。
 * 和滑鼠互動分開：EditorCanvas 決定「要畫哪些框」，這裡只管「怎麼畫」。
 * 所有座標都是畫面座標（已經乘上顯示縮放比例）。
 */

const FRAME_COLOR = 'rgba(37, 99, 235, 0.9)'
const FRAME_FILL = 'rgba(37, 99, 235, 0.12)'
const ACTIVE_FRAME_COLOR = 'rgba(234, 88, 12, 1)'
const ACTIVE_FRAME_FILL = 'rgba(234, 88, 12, 0.18)'
const LABEL_TEXT_COLOR = '#ffffff'
const LABEL_FONT = 'bold 13px sans-serif'
const LABEL_PADDING_X = 5
const LABEL_HEIGHT = 18
/** 控制點的邊長（畫面 px） */
export const HANDLE_SIZE = 8

export interface OverlayFrame {
  shape: SelectionType
  /** 外框：矩形、橢圓用它畫形狀；三種形狀都用它的左上角放編號 */
  bounds: Bounds
  /** 套索的路徑點，畫成封閉多邊形 */
  points?: Point[]
  isActive: boolean
  /** 左上角的編號；拖曳中還沒建立的框不顯示編號 */
  label?: number
  /** 拖曳中的框用虛線，和已經存在的範圍區分 */
  isDraft?: boolean
}

/**
 * 描繪中的套索只畫筆跡：不填色、不封閉。
 * 半透明的填色會蓋住正在描的圖案，使用者看不清楚邊緣該往哪裡走；放開滑鼠後才顯示成完整範圍。
 */
function isDrawingLasso(frame: OverlayFrame): boolean {
  return frame.shape === 'lasso' && frame.isDraft === true
}

/** 依形狀描出路徑，填色與描邊共用同一條路徑 */
function tracePath(ctx: CanvasRenderingContext2D, frame: OverlayFrame): void {
  const { bounds, points } = frame
  ctx.beginPath()
  if (frame.shape === 'ellipse') {
    ctx.ellipse(
      bounds.x + bounds.width / 2,
      bounds.y + bounds.height / 2,
      bounds.width / 2,
      bounds.height / 2,
      0,
      0,
      Math.PI * 2,
    )
  } else if (frame.shape === 'lasso' && points && points.length > 0) {
    ctx.moveTo(points[0].x, points[0].y)
    for (const point of points.slice(1)) ctx.lineTo(point.x, point.y)
    // 完成後沒畫回起點也自動以直線封閉，和遮罩的判斷一致
    if (!isDrawingLasso(frame)) ctx.closePath()
  } else {
    ctx.rect(bounds.x, bounds.y, bounds.width, bounds.height)
  }
}

function drawFrame(ctx: CanvasRenderingContext2D, frame: OverlayFrame): void {
  const { isActive } = frame
  tracePath(ctx, frame)
  const drawingLasso = isDrawingLasso(frame)
  // 描繪中的套索用實線：手繪筆跡的轉折很密，虛線會斷斷續續看不出路徑
  ctx.setLineDash(frame.isDraft && !drawingLasso ? [6, 4] : [])
  if (!drawingLasso) {
    ctx.fillStyle = isActive ? ACTIVE_FRAME_FILL : FRAME_FILL
    ctx.fill()
  }
  ctx.strokeStyle = isActive ? ACTIVE_FRAME_COLOR : FRAME_COLOR
  ctx.lineWidth = isActive ? 2.5 : 1.5
  ctx.stroke()
  ctx.setLineDash([])
}

/** 在框的左上角畫一個實心小方塊 + 編號，讓使用者對得上左側縮圖 */
function drawLabel(ctx: CanvasRenderingContext2D, frame: OverlayFrame): void {
  if (frame.label === undefined) return
  const text = String(frame.label)
  ctx.font = LABEL_FONT
  const labelWidth = ctx.measureText(text).width + LABEL_PADDING_X * 2

  ctx.fillStyle = frame.isActive ? ACTIVE_FRAME_COLOR : FRAME_COLOR
  ctx.fillRect(frame.bounds.x, frame.bounds.y, labelWidth, LABEL_HEIGHT)
  ctx.fillStyle = LABEL_TEXT_COLOR
  ctx.textBaseline = 'middle'
  ctx.fillText(text, frame.bounds.x + LABEL_PADDING_X, frame.bounds.y + LABEL_HEIGHT / 2)
}

/** 白底橘框的小方塊，在深色或淺色的圖上都看得清楚 */
function drawHandles(ctx: CanvasRenderingContext2D, bounds: Bounds): void {
  ctx.fillStyle = '#ffffff'
  ctx.strokeStyle = ACTIVE_FRAME_COLOR
  ctx.lineWidth = 1.5
  for (const position of Object.values(handlePositions(bounds))) {
    const x = position.x - HANDLE_SIZE / 2
    const y = position.y - HANDLE_SIZE / 2
    ctx.fillRect(x, y, HANDLE_SIZE, HANDLE_SIZE)
    ctx.strokeRect(x, y, HANDLE_SIZE, HANDLE_SIZE)
  }
}

/**
 * 清空後重畫所有框。控制點最後畫，才不會被其他框蓋住。
 * @param handleBounds 要顯示控制點的框（目前選取的範圍），沒有則為 null
 */
export function drawOverlay(
  ctx: CanvasRenderingContext2D,
  frames: OverlayFrame[],
  handleBounds: Bounds | null,
): void {
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height)
  for (const frame of frames) {
    drawFrame(ctx, frame)
    drawLabel(ctx, frame)
  }
  if (handleBounds) drawHandles(ctx, handleBounds)
}
