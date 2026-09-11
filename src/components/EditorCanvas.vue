<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useEditorStore } from '@/stores/editor'
import { computeContainSize } from '@/lib/canvas'

const editorStore = useEditorStore()
const containerRef = ref<HTMLDivElement | null>(null)
const canvasRef = ref<HTMLCanvasElement | null>(null)

let resizeObserver: ResizeObserver | null = null

/**
 * 重畫顯示用的畫布：把底圖依容器大小等比縮放後畫上去。
 * canvas 的實際像素尺寸（width/height 屬性）就設成縮放後的顯示尺寸，
 * 而不是用 CSS 硬壓，這樣之後處理滑鼠事件時，事件座標可以直接對應到
 * canvas 像素，不用再另外換算 devicePixelRatio。
 */
function redraw(): void {
  const canvas = canvasRef.value
  const container = containerRef.value
  const bitmap = editorStore.sourceBitmap
  if (!canvas || !container || !bitmap) return

  const { width, height } = computeContainSize(
    bitmap.width,
    bitmap.height,
    container.clientWidth,
    container.clientHeight,
  )
  if (width === 0 || height === 0) return

  canvas.width = width
  canvas.height = height

  const ctx = canvas.getContext('2d')
  if (!ctx) return
  ctx.clearRect(0, 0, width, height)
  ctx.drawImage(bitmap, 0, 0, width, height)
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
</script>

<template>
  <div ref="containerRef" class="editor-canvas flex items-center justify-center h-full w-full">
    <canvas ref="canvasRef" class="editor-canvas__surface"></canvas>
  </div>
</template>

<style scoped>
.editor-canvas {
  &__surface {
    max-width: 100%;
    max-height: 100%;
  }
}
</style>
