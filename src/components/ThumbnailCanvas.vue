<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import type { PixelBuffer } from '@/lib/pixelBuffer'

const props = defineProps<{
  image: PixelBuffer
}>()

const canvasRef = ref<HTMLCanvasElement | null>(null)

/**
 * canvas 的像素尺寸設成原始大小、再由 CSS 縮小顯示，
 * 而不是先把像素縮小：縮放交給瀏覽器處理，品質較好，程式也簡單。
 */
function draw(): void {
  const canvas = canvasRef.value
  const { data, width, height } = props.image
  if (!canvas || width === 0 || height === 0) return

  canvas.width = width
  canvas.height = height
  canvas.getContext('2d')?.putImageData(new ImageData(data, width, height), 0, 0)
}

onMounted(draw)
// 快取命中時傳進來的是同一個物件，不會重畫；只有重新去背產生新結果才會觸發
watch(() => props.image, draw)
</script>

<template>
  <canvas ref="canvasRef" class="thumbnail-canvas block"></canvas>
</template>

<style scoped>
.thumbnail-canvas {
  max-width: 100%;
  max-height: 100%;
}
</style>
