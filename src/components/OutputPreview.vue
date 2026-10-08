<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useDebounceFn } from '@vueuse/core'
import { trimTransparent } from '@/lib/composeOutput'
import type { PixelBuffer } from '@/lib/pixelBuffer'
import { renderOutput, type RenderSettings } from '@/lib/renderOutput'

/**
 * 檢查頁的輸出預覽：依輸出設定（裁空白、邊距、尺寸、白邊）畫出最終下載到的樣子。
 * 和匯出走同一個 renderOutput，看到的就是拿到的。
 */
const props = defineProps<{
  /** 去背後的結果（還沒裁空白） */
  image: PixelBuffer
  settings: RenderSettings
}>()

/**
 * 預覽畫布的長邊固定為這個大小：只是給人看的，不必用輸出的實際解析度。
 * 輸出 1024 時不會佔太多記憶體、白邊也算得快，輸出 64 時也不會小到看不清楚。
 */
const PREVIEW_SIDE = 400
/**
 * 拖動設定滑桿時等手停下才重畫：白邊每張預覽約 12 ms，20 張卡片每移一格都重畫會卡頓
 */
const SETTINGS_REDRAW_DEBOUNCE_MS = 120

const canvasRef = ref<HTMLCanvasElement | null>(null)

/** 只在去背結果改變時重新裁空白；調整輸出設定只需重新排版與畫白邊 */
const content = computed(() => trimTransparent(props.image))

function draw(): void {
  const canvas = canvasRef.value
  if (!canvas) return
  const rendered = renderOutput(content.value, props.settings, PREVIEW_SIDE)
  canvas.width = rendered.width
  canvas.height = rendered.height
  canvas.getContext('2d')?.putImageData(new ImageData(rendered.data, rendered.width, rendered.height), 0, 0)
}

onMounted(draw)
// 去背結果改變（例如微調後）立刻重畫；輸出設定改變則等滑桿停下
watch(content, draw)
watch(() => props.settings, useDebounceFn(draw, SETTINGS_REDRAW_DEBOUNCE_MS), { deep: true })
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
