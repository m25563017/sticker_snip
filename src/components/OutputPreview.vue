<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { outputLayout, trimTransparent, type ExportSize } from '@/lib/composeOutput'
import type { PixelBuffer } from '@/lib/pixelBuffer'

/**
 * 檢查頁的輸出預覽：依輸出設定（裁空白、邊距、尺寸）畫出最終下載到的構圖。
 * 和匯出用同一套 outputLayout，看到的就是拿到的。
 */
const props = defineProps<{
  /** 去背後的結果（還沒裁空白） */
  image: PixelBuffer
  size: ExportSize
  padding: number
}>()

/**
 * 預覽畫布的長邊固定為這個大小：只是給人看的，不必用輸出的實際解析度。
 * 輸出 1024 時不會佔太多記憶體，輸出 64 時也不會小到看不清楚。
 */
const PREVIEW_SIDE = 400

const canvasRef = ref<HTMLCanvasElement | null>(null)

/** 只在去背結果改變時重新裁空白；調整尺寸、邊距只影響排版，不必重裁 */
const content = computed(() => trimTransparent(props.image))
const layout = computed(() => outputLayout(content.value.width, content.value.height, props.size, props.padding))

function draw(): void {
  const canvas = canvasRef.value
  const ctx = canvas?.getContext('2d')
  if (!canvas || !ctx) return

  const { canvasWidth, canvasHeight, x, y, width, height } = layout.value
  const scale = PREVIEW_SIDE / Math.max(canvasWidth, canvasHeight)
  canvas.width = Math.round(canvasWidth * scale)
  canvas.height = Math.round(canvasHeight * scale)

  // putImageData 不能縮放，先放到暫存 canvas，再用 drawImage 縮放到排版位置
  const source = document.createElement('canvas')
  source.width = content.value.width
  source.height = content.value.height
  source.getContext('2d')?.putImageData(new ImageData(content.value.data, source.width, source.height), 0, 0)

  ctx.clearRect(0, 0, canvas.width, canvas.height)
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(source, x * scale, y * scale, width * scale, height * scale)
}

onMounted(draw)
watch(layout, draw)
watch(content, draw)
</script>

<template>
  <canvas ref="canvasRef" class="output-preview block"></canvas>
</template>

<style scoped>
.output-preview {
  max-width: 100%;
  max-height: 100%;
  /* 標出輸出圖片的邊界，才看得出邊距留了多少；半透明灰在深色、淺色底上都看得到 */
  box-shadow: 0 0 0 1px rgba(128, 128, 128, 0.6);
}
</style>
