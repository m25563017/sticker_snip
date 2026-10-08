<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useEditorStore } from '@/stores/editor'
import { useCanvasInteraction } from '@/composables/useCanvasInteraction'
import { computeContainSize } from '@/lib/canvas'
import { boundsToDisplay, sourceToDisplay } from '@/lib/coordinates'
import { drawOverlay, type OverlayFrame } from '@/lib/overlayRenderer'
import { rectFromPoints } from '@/lib/rect'
import { pointsBounds, selectionBounds } from '@/lib/selectionShape'
import type { Bounds, Point, Selection } from '@/types/selection'

const editorStore = useEditorStore()
const containerRef = ref<HTMLDivElement | null>(null)
const canvasRef = ref<HTMLCanvasElement | null>(null)
/** 疊在底圖上的透明畫布，只畫框線與編號，重畫它不必重畫整張底圖 */
const overlayRef = ref<HTMLCanvasElement | null>(null)

/**
 * 目前的顯示縮放比例（顯示尺寸 / 原圖尺寸）。
 * 這是「畫面怎麼呈現」的資訊，不是編輯資料，所以留在元件裡而不放進 store；
 * 滑鼠互動要靠它把游標位置換算成原圖座標（見 useCanvasInteraction）。
 */
const displayScale = ref(0)

/** 滑鼠互動（畫框、點選、調整大小、右鍵）在 composable 裡，這個元件只負責把畫面畫出來 */
const {
  interaction,
  cursor,
  activeResizable,
  displayedSelection,
  handlePointerDown,
  handlePointerMove,
  handlePointerUp,
  handlePointerCancel,
  handleContextMenu,
} = useCanvasInteraction({ overlayRef, displayScale, onChange: redrawOverlay })

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

const toDisplayBounds = (bounds: Bounds) => boundsToDisplay(bounds, displayScale.value)
const toDisplayPoints = (points: Point[]) => points.map((point) => sourceToDisplay(point, displayScale.value))

function toFrame(stored: Selection, index: number): OverlayFrame {
  // 拖曳中（移動、調整大小）的範圍顯示暫存的位置與大小
  const selection = displayedSelection(stored)
  const isActive = selection.id === editorStore.activeSelectionId
  // 顯示「排在第幾個」而非 id：刪除後後面的自動往前遞補，與縮圖列表、匯出檔名一致
  const label = index + 1
  if (selection.type === 'lasso') {
    const bounds = toDisplayBounds(selectionBounds(selection))
    return { shape: 'lasso', bounds, points: toDisplayPoints(selection.points), isActive, label }
  }
  return { shape: selection.type, bounds: toDisplayBounds(selection.bounds), isActive, label }
}

/** 清空 overlay，再把所有已存的範圍、拖曳中的框與控制點重新畫一次 */
function redrawOverlay(): void {
  const ctx = overlayRef.value?.getContext('2d')
  if (!ctx) return

  const frames = editorStore.selections.map(toFrame)
  const active = interaction.value
  if (active?.kind === 'draw') {
    const bounds = toDisplayBounds(rectFromPoints(active.start, active.current))
    frames.push({ shape: active.shape, bounds, isActive: false, isDraft: true })
  } else if (active?.kind === 'lasso') {
    const bounds = toDisplayBounds(pointsBounds(active.points))
    frames.push({ shape: 'lasso', bounds, points: toDisplayPoints(active.points), isActive: false, isDraft: true })
  }
  const resizable = activeResizable.value && displayedSelection(activeResizable.value)
  const handleBounds = resizable && resizable.type !== 'lasso' ? toDisplayBounds(resizable.bounds) : null

  drawOverlay(ctx, frames, handleBounds)
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
        :style="{ cursor }"
        @pointerdown="handlePointerDown"
        @pointermove="handlePointerMove"
        @pointerup="handlePointerUp"
        @pointercancel="handlePointerCancel"
        @contextmenu.prevent="handleContextMenu"
      ></canvas>
    </div>
  </div>
</template>

<style scoped>
.editor-canvas {
  .editor-canvas__overlay {
    /* 觸控裝置上拖曳時，不讓瀏覽器把手勢當成捲動頁面 */
    touch-action: none;
  }
}
</style>
