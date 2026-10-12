<script setup lang="ts">
import { ref } from 'vue'
import { useEventListener } from '@vueuse/core'
import { panBy, zoomAt, type ZoomView } from '@/lib/zoomView'

/**
 * 可縮放、平移的外框：滾輪以游標為中心縮放，按住空白鍵拖曳平移。
 * 視角由父層傳入（v-model），微調彈窗把同一份視角給原圖和結果，兩邊就會同步。
 *
 * 只用 CSS transform 放大顯示，不重新產生圖片：縮放時不必重算去背，也不佔額外記憶體。
 * 裡面的 PixelCanvas 用 getBoundingClientRect 換算座標，會自動算進縮放，點選、筆刷不用改。
 */
const view = defineModel<ZoomView>('view', { required: true })

/** 每滾一格（deltaY ≈ 100）放大約 1.2 倍；觸控板的小幅滾動也能平順縮放 */
const WHEEL_ZOOM_SPEED = 0.0018

const viewportRef = ref<HTMLElement | null>(null)

function viewportSize(): { width: number; height: number } {
  const rect = viewportRef.value?.getBoundingClientRect()
  return { width: rect?.width ?? 0, height: rect?.height ?? 0 }
}

function handleWheel(event: WheelEvent): void {
  const rect = viewportRef.value?.getBoundingClientRect()
  if (!rect) return
  const anchor = { x: event.clientX - rect.left, y: event.clientY - rect.top }
  view.value = zoomAt(view.value, anchor, Math.exp(-event.deltaY * WHEEL_ZOOM_SPEED), rect)
}

// ======== 空白鍵 + 拖曳平移 ========
const isSpaceHeld = ref(false)
const isPanning = ref(false)
let lastPointer: { x: number; y: number } | null = null

/** 在輸入框裡打空白是正常輸入，不能攔 */
function isTyping(event: KeyboardEvent): boolean {
  const target = event.target as HTMLElement | null
  return target?.tagName === 'INPUT' && (target as HTMLInputElement).type === 'text'
}

useEventListener(document, 'keydown', (event: KeyboardEvent) => {
  if (event.code !== 'Space' || isTyping(event)) return
  // 擋掉空白鍵的預設行為：捲動頁面、或「按下」目前聚焦的工具按鈕
  event.preventDefault()
  isSpaceHeld.value = true
})

useEventListener(document, 'keyup', (event: KeyboardEvent) => {
  if (event.code !== 'Space') return
  event.preventDefault()
  isSpaceHeld.value = false
})

// 切換視窗時可能收不到 keyup，空白鍵會一直被當成按住
useEventListener(window, 'blur', () => {
  isSpaceHeld.value = false
})

/**
 * 在捕獲階段攔截：按住空白鍵時，這一下是平移，不能讓裡面的筆刷、魔術棒收到。
 * 就像郵差在門口先把信收走，屋裡的人不會知道有這封信。
 */
function handlePointerDown(event: PointerEvent): void {
  if (!isSpaceHeld.value || event.button !== 0) return
  event.stopPropagation()
  viewportRef.value?.setPointerCapture(event.pointerId)
  isPanning.value = true
  lastPointer = { x: event.clientX, y: event.clientY }
}

function handlePointerMove(event: PointerEvent): void {
  if (!isPanning.value || !lastPointer) return
  view.value = panBy(view.value, event.clientX - lastPointer.x, event.clientY - lastPointer.y, viewportSize())
  lastPointer = { x: event.clientX, y: event.clientY }
}

function handlePointerUp(): void {
  isPanning.value = false
  lastPointer = null
}

/** 平移結束時放開滑鼠會觸發 click，不能被魔術棒當成一次點選 */
function handleClick(event: MouseEvent): void {
  if (isSpaceHeld.value) event.stopPropagation()
}
</script>

<template>
  <div
    ref="viewportRef"
    class="zoom-viewport"
    :class="{
      'zoom-viewport--pan': isSpaceHeld,
      'zoom-viewport--panning': isPanning,
      'zoom-viewport--zoomed': view.scale > 1,
    }"
    @wheel.prevent="handleWheel"
    @pointerdown.capture="handlePointerDown"
    @pointermove="handlePointerMove"
    @pointerup="handlePointerUp"
    @pointercancel="handlePointerUp"
    @click.capture="handleClick"
  >
    <div class="zoom-viewport__content" :style="{ transform: `translate(${view.x}px, ${view.y}px) scale(${view.scale})` }">
      <slot></slot>
    </div>
  </div>
</template>

<style scoped>
.zoom-viewport {
  position: relative;
  overflow: hidden;

  .zoom-viewport__content {
    width: 100%;
    height: 100%;
    transform-origin: 0 0;
  }

  /* 放大後每個像素清楚呈現成方格，看得出邊緣到底有沒有去乾淨 */
  &.zoom-viewport--zoomed :deep(canvas) {
    image-rendering: pixelated;
  }

  /* 按住空白鍵時，不論底下是什麼工具，游標都換成手掌 */
  /* 多加一層 class 提高權重，蓋過筆刷模式的 cursor: none */
  &.zoom-viewport--pan .zoom-viewport__content :deep(*) {
    cursor: grab;
  }

  &.zoom-viewport--panning .zoom-viewport__content :deep(*) {
    cursor: grabbing;
  }
}
</style>
