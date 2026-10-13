<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useEditorStore } from '@/stores/editor'
import { useCanvasInteraction } from '@/composables/useCanvasInteraction'
import { useZoomControls } from '@/composables/useZoomControls'
import { boundsToDisplay, composeViewTransform, sourceToDisplay, type ViewTransform } from '@/lib/coordinates'
import { drawOverlay, type OverlayFrame } from '@/lib/overlayRenderer'
import { rectFromPoints } from '@/lib/rect'
import { pointsBounds, selectionBounds } from '@/lib/selectionShape'
import { FIT_VIEW, type ZoomView } from '@/lib/zoomView'
import type { Bounds, Point, Selection } from '@/types/selection'
import AppIcon from '@/components/AppIcon.vue'

/** 圖片四周預留的空間（px），放得下外框和錯位陰影，不會被容器裁掉 */
const FRAME_MARGIN = 10
/** 圖片的手繪外框：線寬與錯位陰影的距離（px），和其他面板一致 */
const FRAME_LINE_WIDTH = 2
const FRAME_SHADOW_OFFSET = 6
/** 浮動刪除按鈕和框之間的距離；框上方的空間不到這麼高時，改放到框的下方 */
const DELETE_BUTTON_GAP = 6
const DELETE_BUTTON_SPACE = 40

const { t } = useI18n()
const editorStore = useEditorStore()
const containerRef = ref<HTMLDivElement | null>(null)
const canvasRef = ref<HTMLCanvasElement | null>(null)
/** 疊在底圖上的透明畫布，只畫框線與編號，重畫它不必重畫整張底圖 */
const overlayRef = ref<HTMLCanvasElement | null>(null)

// ======== 縮放 ========
/**
 * 使用者的縮放視角（1 倍 = 整張圖塞進畫面）。
 * 這是「畫面怎麼呈現」的資訊，不是編輯資料，所以留在元件裡而不放進 store。
 */
const view = ref<ZoomView>(FIT_VIEW)
const { isSpaceHeld, isPanning } = useZoomControls(containerRef, view)
const zoomPercent = computed(() => Math.round(view.value.scale * 100))

function handleFitView(): void {
  view.value = FIT_VIEW
}

/**
 * 原圖 → 畫面的換算（適應視窗的擺放 + 縮放視角）。
 * 滑鼠互動要靠它把游標位置換算成原圖座標（見 useCanvasInteraction）。
 */
const transform = ref<ViewTransform>({ scale: 0, offsetX: 0, offsetY: 0 })

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
} = useCanvasInteraction({ overlayRef, transform, onChange: redrawOverlay })

/** 按住空白鍵時，不論游標在哪裡都顯示成手掌 */
const displayedCursor = computed(() => (isPanning.value ? 'grabbing' : isSpaceHeld.value ? 'grab' : cursor.value))

// ======== 浮動刪除按鈕 ========
/**
 * 選取中的範圍旁邊顯示「刪除」：右鍵刪除是看不到的隱藏操作，手機上也沒有右鍵。
 * 放在框的右上角外側（上方放不下就放右下角外側），拖曳中先藏起來，免得擋住視線。
 * 框被平移到畫面外時也不顯示。
 */
const deleteButtonStyle = computed(() => {
  const active = editorStore.selections.find((item) => item.id === editorStore.activeSelectionId)
  const container = containerRef.value
  if (!active || !container || interaction.value || transform.value.scale === 0) return null

  const bounds = boundsToDisplay(selectionBounds(active), transform.value)
  const width = container.clientWidth
  const height = container.clientHeight
  const isOffScreen = bounds.x + bounds.width < 0 || bounds.x > width || bounds.y + bounds.height < 0 || bounds.y > height
  if (isOffScreen) return null

  const right = Math.min(width - DELETE_BUTTON_GAP, bounds.x + bounds.width)
  const above = bounds.y >= DELETE_BUTTON_SPACE
  return {
    left: `${right}px`,
    top: `${above ? bounds.y - DELETE_BUTTON_GAP : bounds.y + bounds.height + DELETE_BUTTON_GAP}px`,
    // 以按鈕的右邊（放上方時是右下角）對齊框的右上角
    transform: above ? 'translate(-100%, -100%)' : 'translateX(-100%)',
  }
})

function handleDeleteActive(): void {
  editorStore.removeActiveSelection()
}

let resizeObserver: ResizeObserver | null = null

/**
 * 讓 canvas 跟外框一樣大，並以螢幕實際像素為單位（× devicePixelRatio），高解析度螢幕上才不會糊。
 * 之後的繪圖都先 setTransform 換回 CSS px，程式裡的座標就不必考慮螢幕密度。
 */
function prepareCanvas(canvas: HTMLCanvasElement, width: number, height: number): CanvasRenderingContext2D | null {
  const ratio = window.devicePixelRatio || 1
  const pixelWidth = Math.round(width * ratio)
  const pixelHeight = Math.round(height * ratio)
  // 設定 width／height 會清空畫布，大小沒變時不必重設
  if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
    canvas.width = pixelWidth
    canvas.height = pixelHeight
  }
  const ctx = canvas.getContext('2d')
  ctx?.setTransform(ratio, 0, 0, ratio, 0, 0)
  return ctx
}

/**
 * 重畫底圖：依目前的縮放視角，把看得到的那一塊直接用原圖畫出來。
 * 不是把縮小後的圖再用 CSS 放大，所以放大到 8 倍也一樣清楚（像用放大鏡看原稿，而不是放大影印本）。
 * 圖片的手繪黑框與錯位陰影也畫在 canvas 上，才會跟著縮放、平移。
 */
function redraw(): void {
  const canvas = canvasRef.value
  const overlay = overlayRef.value
  const container = containerRef.value
  const bitmap = editorStore.sourceBitmap
  if (!canvas || !overlay || !container || !bitmap) return

  const width = container.clientWidth
  const height = container.clientHeight
  if (width === 0 || height === 0) return
  transform.value = composeViewTransform(bitmap.width, bitmap.height, width, height, FRAME_MARGIN, view.value)

  const ctx = prepareCanvas(canvas, width, height)
  prepareCanvas(overlay, width, height)
  if (!ctx) return

  const { scale, offsetX, offsetY } = transform.value
  const imageWidth = bitmap.width * scale
  const imageHeight = bitmap.height * scale
  const ink = getComputedStyle(container).getPropertyValue('--color-ink')

  ctx.clearRect(0, 0, width, height)
  ctx.fillStyle = ink
  ctx.fillRect(offsetX + FRAME_SHADOW_OFFSET, offsetY + FRAME_SHADOW_OFFSET, imageWidth, imageHeight)
  // 放大檢視時像素以方格清楚呈現（和微調彈窗一致），看得出框到底有沒有貼齊邊緣
  ctx.imageSmoothingEnabled = view.value.scale <= 1
  ctx.drawImage(bitmap, offsetX, offsetY, imageWidth, imageHeight)
  ctx.lineWidth = FRAME_LINE_WIDTH
  ctx.strokeStyle = ink
  ctx.strokeRect(offsetX - FRAME_LINE_WIDTH / 2, offsetY - FRAME_LINE_WIDTH / 2, imageWidth + FRAME_LINE_WIDTH, imageHeight + FRAME_LINE_WIDTH)

  redrawOverlay()
}

const toDisplayBounds = (bounds: Bounds) => boundsToDisplay(bounds, transform.value)
const toDisplayPoints = (points: Point[]) => points.map((point) => sourceToDisplay(point, transform.value))

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
  // 容器大小改變（例如視窗縮放）時要重新計算換算方式並重畫，
  // 否則選取框之後會跟畫面對不上
  resizeObserver = new ResizeObserver(() => redraw())
  if (containerRef.value) resizeObserver.observe(containerRef.value)
})

onBeforeUnmount(() => {
  resizeObserver?.disconnect()
})

// 換新圖時回到整張顯示，舊圖的放大位置對新圖沒有意義
watch(
  () => editorStore.sourceBitmap,
  () => {
    view.value = FIT_VIEW
    redraw()
  },
)
watch(view, redraw)
// deep：範圍內部欄位（例如 bounds）被修改時也要重畫，不只是新增／刪除
watch(() => [editorStore.selections, editorStore.activeSelectionId], redrawOverlay, { deep: true })
</script>

<template>
  <!-- 縮放、平移的操作掛在外框上，底圖與疊層都跟著同一份視角重畫 -->
  <div ref="containerRef" class="editor-canvas relative h-full w-full overflow-hidden">
    <!-- ======== 底圖 + 框選疊層 ======== -->
    <canvas ref="canvasRef" class="editor-canvas__layer"></canvas>
    <canvas
      ref="overlayRef"
      class="editor-canvas__layer editor-canvas__overlay"
      :style="{ cursor: displayedCursor }"
      @pointerdown="handlePointerDown"
      @pointermove="handlePointerMove"
      @pointerup="handlePointerUp"
      @pointercancel="handlePointerCancel"
      @contextmenu.prevent="handleContextMenu"
    ></canvas>

    <!-- ======== 選取中的範圍：浮動刪除按鈕 ======== -->
    <template v-if="deleteButtonStyle">
      <button type="button" class="editor-canvas__delete hand-button text-sm" :style="deleteButtonStyle" @click="handleDeleteActive">
        <AppIcon name="trash" />{{ t('common.delete') }}
      </button>
    </template>

    <!-- ======== 放大時才出現：顯示倍率，點了回到整張 ======== -->
    <template v-if="view.scale > 1">
      <button type="button" class="editor-canvas__fit hand-button text-sm" :title="t('common.fitView')" @click="handleFitView">
        <AppIcon name="fit" />{{ zoomPercent }}%
      </button>
    </template>
  </div>
</template>

<style scoped>
.editor-canvas {
  /* 觸控手勢（拖曳框選、兩指縮放）全部自己處理，不讓瀏覽器當成捲動或整頁放大 */
  touch-action: none;

  /* 兩層 canvas 疊在一起、跟外框一樣大；不參與排版，外框大小只由版面決定 */
  .editor-canvas__layer {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
  }

  .editor-canvas__delete {
    position: absolute;
    box-shadow: 2px 2px 0 var(--color-ink);
  }

  .editor-canvas__fit {
    position: absolute;
    right: 12px;
    bottom: 12px;
  }
}
</style>
