<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useEditorStore } from '@/stores/editor'
import { computeContainSize } from '@/lib/canvas'
import { clampPoint, displayToSource, sourceToDisplay } from '@/lib/coordinates'
import { isRectTooSmall, rectFromPoints } from '@/lib/rect'
import type { Bounds, Point } from '@/types/selection'

/** 拖曳小於這個「螢幕像素」就當成誤點。用螢幕像素而非原圖像素，手感才不會隨縮放比例改變 */
const MIN_DRAG_DISPLAY_SIZE = 5

const FRAME_COLOR = 'rgba(37, 99, 235, 0.9)'
const FRAME_FILL = 'rgba(37, 99, 235, 0.12)'
const ACTIVE_FRAME_COLOR = 'rgba(234, 88, 12, 1)'
const ACTIVE_FRAME_FILL = 'rgba(234, 88, 12, 0.18)'
const LABEL_TEXT_COLOR = '#ffffff'
const LABEL_FONT = 'bold 13px sans-serif'

const editorStore = useEditorStore()
const containerRef = ref<HTMLDivElement | null>(null)
const canvasRef = ref<HTMLCanvasElement | null>(null)
/** 疊在底圖上的透明畫布，只畫框線與編號，重畫它不必重畫整張底圖 */
const overlayRef = ref<HTMLCanvasElement | null>(null)

/**
 * 目前的顯示縮放比例（顯示尺寸 / 原圖尺寸）。
 * 這是「畫面怎麼呈現」的資訊，不是編輯資料，所以留在元件裡而不放進 store；
 * 框選時要靠它把滑鼠座標換算成原圖座標（見 lib/coordinates）。
 */
const displayScale = ref(0)

/** 拖曳中的起點與目前位置（原圖座標）；沒在拖曳時為 null */
const dragStart = ref<Point | null>(null)
const dragCurrent = ref<Point | null>(null)

let resizeObserver: ResizeObserver | null = null

/**
 * 重畫顯示用的畫布：把底圖依容器大小等比縮放後畫上去。
 * canvas 的實際像素尺寸（width/height 屬性）就設成縮放後的顯示尺寸，
 * 而不是用 CSS 硬壓，這樣之後處理滑鼠事件時，事件座標可以直接對應到
 * canvas 像素，不用再另外換算 devicePixelRatio。
 */
function redraw(): void {
  const canvas = canvasRef.value
  const overlay = overlayRef.value
  const container = containerRef.value
  const bitmap = editorStore.sourceBitmap
  if (!canvas || !overlay || !container || !bitmap) return

  const { width, height, scale } = computeContainSize(
    bitmap.width,
    bitmap.height,
    container.clientWidth,
    container.clientHeight,
  )
  if (width === 0 || height === 0) return

  displayScale.value = scale
  canvas.width = width
  canvas.height = height
  // overlay 必須跟底圖一樣大，框線才會疊在正確的位置
  overlay.width = width
  overlay.height = height

  const ctx = canvas.getContext('2d')
  if (!ctx) return
  ctx.clearRect(0, 0, width, height)
  ctx.drawImage(bitmap, 0, 0, width, height)

  redrawOverlay()
}

/** 把一個原圖座標的矩形轉成畫面座標，才能畫到 overlay 上 */
function toDisplayBounds(bounds: Bounds): Bounds {
  const topLeft = sourceToDisplay({ x: bounds.x, y: bounds.y }, displayScale.value)
  return {
    x: topLeft.x,
    y: topLeft.y,
    width: bounds.width * displayScale.value,
    height: bounds.height * displayScale.value,
  }
}

function drawFrame(ctx: CanvasRenderingContext2D, bounds: Bounds, isActive: boolean): void {
  const display = toDisplayBounds(bounds)
  ctx.fillStyle = isActive ? ACTIVE_FRAME_FILL : FRAME_FILL
  ctx.fillRect(display.x, display.y, display.width, display.height)
  ctx.strokeStyle = isActive ? ACTIVE_FRAME_COLOR : FRAME_COLOR
  ctx.lineWidth = isActive ? 2.5 : 1.5
  ctx.strokeRect(display.x, display.y, display.width, display.height)
}

/** 在框的左上角畫一個實心小方塊 + 編號，讓使用者對得上左側縮圖 */
function drawLabel(ctx: CanvasRenderingContext2D, bounds: Bounds, displayNumber: number, isActive: boolean): void {
  const display = toDisplayBounds(bounds)
  const text = String(displayNumber)
  ctx.font = LABEL_FONT
  const paddingX = 5
  const labelWidth = ctx.measureText(text).width + paddingX * 2
  const labelHeight = 18

  ctx.fillStyle = isActive ? ACTIVE_FRAME_COLOR : FRAME_COLOR
  ctx.fillRect(display.x, display.y, labelWidth, labelHeight)
  ctx.fillStyle = LABEL_TEXT_COLOR
  ctx.textBaseline = 'middle'
  ctx.fillText(text, display.x + paddingX, display.y + labelHeight / 2)
}

/** 清空 overlay，再把所有已存的範圍與拖曳中的框重新畫一次 */
function redrawOverlay(): void {
  const overlay = overlayRef.value
  const ctx = overlay?.getContext('2d')
  if (!overlay || !ctx) return
  ctx.clearRect(0, 0, overlay.width, overlay.height)

  editorStore.selections.forEach((selection, index) => {
    // M1 只有矩形，橢圓／套索之後的里程碑再補畫法
    if (selection.type !== 'rect') return
    const isActive = selection.id === editorStore.activeSelectionId
    drawFrame(ctx, selection.bounds, isActive)
    // 顯示「排在第幾個」而非 id：刪除後後面的自動往前遞補，與縮圖列表、匯出檔名一致
    drawLabel(ctx, selection.bounds, index + 1, isActive)
  })

  if (dragStart.value && dragCurrent.value) {
    ctx.setLineDash([6, 4])
    drawFrame(ctx, rectFromPoints(dragStart.value, dragCurrent.value), false)
    ctx.setLineDash([])
  }
}

/**
 * 滑鼠事件座標 → 原圖座標。
 * 用 clientX 減掉 canvas 在視窗中的位置，而不是 offsetX：
 * 拖到 canvas 外時 offsetX 會改以別的元素為基準，clientX 則永遠可靠。
 */
function eventToSourcePoint(event: PointerEvent): Point {
  const overlay = overlayRef.value
  const bitmap = editorStore.sourceBitmap
  if (!overlay || !bitmap) return { x: 0, y: 0 }

  const rect = overlay.getBoundingClientRect()
  const displayPoint = { x: event.clientX - rect.left, y: event.clientY - rect.top }
  const sourcePoint = displayToSource(displayPoint, displayScale.value)
  return clampPoint(sourcePoint, bitmap.width, bitmap.height)
}

function handlePointerDown(event: PointerEvent): void {
  // 只接受左鍵，避免右鍵開選單時意外開始框選
  if (event.button !== 0) return
  // 捕捉指標：之後就算滑鼠移出 canvas，move/up 事件仍會送到這裡，不會「放開了卻沒收到」
  overlayRef.value?.setPointerCapture(event.pointerId)
  const point = eventToSourcePoint(event)
  dragStart.value = point
  dragCurrent.value = point
}

function handlePointerMove(event: PointerEvent): void {
  if (!dragStart.value) return
  dragCurrent.value = eventToSourcePoint(event)
  redrawOverlay()
}

function handlePointerUp(event: PointerEvent): void {
  if (!dragStart.value) return
  const bounds = rectFromPoints(dragStart.value, eventToSourcePoint(event))
  dragStart.value = null
  dragCurrent.value = null

  // 門檻用畫面像素比較：換算回原圖單位後再判斷
  const minSourceSize = MIN_DRAG_DISPLAY_SIZE / displayScale.value
  if (isRectTooSmall(bounds, minSourceSize)) {
    redrawOverlay()
    return
  }

  const created = editorStore.addSelection({ type: 'rect', bounds })
  editorStore.activeSelectionId = created.id
  // selections 改變會觸發下方 watch 重畫 overlay，這裡不用再手動呼叫
}

onMounted(() => {
  redraw()
  // 容器大小改變（例如視窗縮放）時要重新計算縮放比例並重畫，
  // 否則選取框之後會跟畫面對不上
  resizeObserver = new ResizeObserver(() => redraw())
  if (containerRef.value) resizeObserver.observe(containerRef.value)
})

onBeforeUnmount(() => {
  resizeObserver?.disconnect()
})

watch(() => editorStore.sourceBitmap, redraw)
// deep：範圍內部欄位（例如 bounds）被修改時也要重畫，不只是新增／刪除
watch(() => [editorStore.selections, editorStore.activeSelectionId], redrawOverlay, { deep: true })
</script>

<template>
  <div ref="containerRef" class="editor-canvas flex items-center justify-center h-full w-full overflow-hidden">
    <!-- ======== 底圖 + 框選疊層 ======== -->
    <div class="editor-canvas__stage relative">
      <canvas ref="canvasRef" class="block"></canvas>
      <canvas
        ref="overlayRef"
        class="editor-canvas__overlay absolute inset-0"
        @pointerdown="handlePointerDown"
        @pointermove="handlePointerMove"
        @pointerup="handlePointerUp"
        @pointercancel="handlePointerUp"
      ></canvas>
    </div>
  </div>
</template>

<style scoped>
.editor-canvas {
  .editor-canvas__overlay {
    cursor: crosshair;
    /* 觸控裝置上拖曳時，不讓瀏覽器把手勢當成捲動頁面 */
    touch-action: none;
  }
}
</style>
