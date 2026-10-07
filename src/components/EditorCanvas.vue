<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useEditorStore } from '@/stores/editor'
import { computeContainSize } from '@/lib/canvas'
import { clampPoint, displayToSource, sourceToDisplay } from '@/lib/coordinates'
import { drawOverlay, HANDLE_SIZE, type OverlayFrame } from '@/lib/overlayRenderer'
import { findSmallestContaining, isRectTooSmall, rectFromPoints } from '@/lib/rect'
import { HANDLE_CURSORS, hitTestHandle, resizeBounds, type ResizeHandle } from '@/lib/resizeHandles'
import type { Bounds, Point, RectLikeSelection } from '@/types/selection'

/** 拖曳小於這個「螢幕像素」就當成點擊。用螢幕像素而非原圖像素，手感才不會隨縮放比例改變 */
const MIN_DRAG_DISPLAY_SIZE = 5
/** 游標離控制點多近就算點到（畫面 px），比控制點本身大一點，比較好點 */
const HANDLE_HIT_TOLERANCE = HANDLE_SIZE

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

/**
 * 按住左鍵後進行中的操作（座標皆為原圖座標）：
 * - draw：拖曳畫新框；拖不到門檻就當成點擊，用來選取範圍
 * - resize：拖曳控制點調整大小；放開前只改這裡的 current，不寫進 store，
 *   避免每移動一下就觸發重新偵測背景色、重算縮圖
 */
type Interaction =
  | { kind: 'draw'; start: Point; current: Point }
  | { kind: 'resize'; id: number; handle: ResizeHandle; original: Bounds; current: Bounds }
const interaction = ref<Interaction | null>(null)
/** 沒在拖曳時，依游標是否在控制點上切換樣式 */
const hoverCursor = ref('crosshair')

let resizeObserver: ResizeObserver | null = null

const rectSelections = computed(() =>
  editorStore.selections.filter((item): item is RectLikeSelection => item.type === 'rect'),
)
const activeRect = computed(() => rectSelections.value.find((item) => item.id === editorStore.activeSelectionId))
const minSourceSize = computed(() => MIN_DRAG_DISPLAY_SIZE / displayScale.value)

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

/** 調整大小拖曳中的範圍，顯示拖曳中的外框，其餘顯示 store 裡的外框 */
function currentBounds(selection: RectLikeSelection): Bounds {
  const active = interaction.value
  return active?.kind === 'resize' && active.id === selection.id ? active.current : selection.bounds
}

function redrawOverlay(): void {
  const ctx = overlayRef.value?.getContext('2d')
  if (!ctx) return

  const frames: OverlayFrame[] = rectSelections.value.map((selection, index) => ({
    bounds: toDisplayBounds(currentBounds(selection)),
    isActive: selection.id === editorStore.activeSelectionId,
    // 顯示「排在第幾個」而非 id：刪除後後面的自動往前遞補，與縮圖列表、匯出檔名一致
    label: index + 1,
  }))
  const active = interaction.value
  if (active?.kind === 'draw') {
    frames.push({ bounds: toDisplayBounds(rectFromPoints(active.start, active.current)), isActive: false, isDraft: true })
  }
  const handleBounds = activeRect.value ? toDisplayBounds(currentBounds(activeRect.value)) : null

  drawOverlay(ctx, frames, handleBounds)
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

/** 游標是否在目前選取範圍的某個控制點上（在畫面座標比對，點擊的手感才不受縮放影響） */
function handleAt(sourcePoint: Point): ResizeHandle | null {
  if (!activeRect.value) return null
  const displayPoint = sourceToDisplay(sourcePoint, displayScale.value)
  return hitTestHandle(toDisplayBounds(activeRect.value.bounds), displayPoint, HANDLE_HIT_TOLERANCE)
}

function handlePointerDown(event: PointerEvent): void {
  // 只接受左鍵，避免右鍵開選單時意外開始框選
  if (event.button !== 0) return
  // 捕捉指標：之後就算滑鼠移出 canvas，move/up 事件仍會送到這裡，不會「放開了卻沒收到」
  overlayRef.value?.setPointerCapture(event.pointerId)
  const point = eventToSourcePoint(event)
  const handle = handleAt(point)

  if (activeRect.value && handle) {
    const { id, bounds } = activeRect.value
    interaction.value = { kind: 'resize', id, handle, original: bounds, current: bounds }
  } else {
    interaction.value = { kind: 'draw', start: point, current: point }
  }
}

function handlePointerMove(event: PointerEvent): void {
  const point = eventToSourcePoint(event)
  const active = interaction.value

  if (!active) {
    const handle = handleAt(point)
    hoverCursor.value = handle ? HANDLE_CURSORS[handle] : 'crosshair'
    return
  }

  if (active.kind === 'draw') {
    active.current = point
  } else {
    const resized = resizeBounds(active.original, active.handle, point)
    // 縮到比門檻小就停在上一個合法的大小，不讓框消失
    if (!isRectTooSmall(resized, minSourceSize.value)) active.current = resized
  }
  redrawOverlay()
}

function handlePointerUp(event: PointerEvent): void {
  const active = interaction.value
  if (!active) return
  interaction.value = null

  if (active.kind === 'resize') {
    // 只點了控制點沒有拖動：不算調整，否則自動範圍會被誤標成手動
    const { original, current } = active
    const changed =
      original.x !== current.x ||
      original.y !== current.y ||
      original.width !== current.width ||
      original.height !== current.height
    if (changed) editorStore.resizeSelection(active.id, current)
    return
  }

  const point = eventToSourcePoint(event)
  const bounds = rectFromPoints(active.start, point)
  if (isRectTooSmall(bounds, minSourceSize.value)) {
    // 拖不到門檻視為點擊：選取點到的範圍；點在空白處則取消選取
    const index = findSmallestContaining(rectSelections.value.map((item) => item.bounds), point)
    editorStore.activeSelectionId = index >= 0 ? rectSelections.value[index].id : null
    redrawOverlay()
    return
  }

  const created = editorStore.addSelection({ type: 'rect', bounds })
  editorStore.activeSelectionId = created.id
  // selections 改變會觸發下方 watch 重畫 overlay，這裡不用再手動呼叫
}

/** 瀏覽器中斷指標（例如觸控被系統手勢接管）時放棄這次操作，而不是把半途的結果存起來 */
function handlePointerCancel(): void {
  interaction.value = null
  redrawOverlay()
}

/**
 * 右鍵：拖曳到一半時取消這次操作；沒在拖曳時刪除目前高亮的範圍。
 * 用 contextmenu 事件而非 pointerdown：左鍵按住拖曳時再按右鍵，
 * 瀏覽器不會再送一次 pointerdown（同一支滑鼠已經是「按下」狀態），只有 contextmenu 一定收得到。
 */
function handleContextMenu(): void {
  if (interaction.value) {
    handlePointerCancel()
    return
  }
  editorStore.removeActiveSelection()
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
        :style="{ cursor: interaction?.kind === 'resize' ? HANDLE_CURSORS[interaction.handle] : hoverCursor }"
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
