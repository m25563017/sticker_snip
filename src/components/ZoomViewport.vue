<script setup lang="ts">
import { ref } from 'vue'
import type { ZoomView } from '@/lib/zoomView'
import { useZoomControls } from '@/composables/useZoomControls'

/**
 * 可縮放、平移的外框：電腦用滾輪縮放、按住空白鍵拖曳平移；手機用兩指縮放、平移（見 useZoomControls）。
 * 視角由父層傳入（v-model），微調彈窗把同一份視角給原圖和結果，兩邊就會同步。
 *
 * 只用 CSS transform 放大顯示，不重新產生圖片：縮放時不必重算去背，也不佔額外記憶體。
 * 裡面的 PixelCanvas 用 getBoundingClientRect 換算座標，會自動算進縮放，點選、筆刷不用改。
 */
const view = defineModel<ZoomView>('view', { required: true })

const viewportRef = ref<HTMLElement | null>(null)
const { isSpaceHeld, isPanning } = useZoomControls(viewportRef, view)
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
  /* 觸控手勢全部自己處理，不讓瀏覽器把兩指捏合當成整頁放大、把拖曳當成捲動 */
  touch-action: none;

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
