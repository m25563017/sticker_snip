<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useDebounceFn, useResizeObserver } from '@vueuse/core'
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
 * 預覽畫布長邊的上限（實際像素）：只是給人看的，不必用輸出的實際解析度。
 * 輸出 1024 時不會佔太多記憶體、白邊也算得快，輸出 64 時也不會小到看不清楚。
 */
const MAX_PREVIEW_SIDE = 400
/**
 * 拖動設定滑桿時等手停下才重畫：三種效果全開時每張預覽約 10～30 ms，20 張卡片每移一格都重畫會卡頓
 */
const SETTINGS_REDRAW_DEBOUNCE_MS = 120

const canvasRef = ref<HTMLCanvasElement | null>(null)

/**
 * 預覽長邊 = 外框在畫面上的大小 × 螢幕密度，畫得剛好夠清楚就好：
 * 卡片只有約 200 px 高，一般螢幕上用 400 px 計算是白做 4 倍的工；
 * 高解析度螢幕（手機、Retina）每個 CSS px 有 2～3 個實際像素，才需要畫得更細。
 * 0 代表還沒量到大小，先不畫。
 */
const previewSide = ref(0)
const container = computed(() => canvasRef.value?.parentElement ?? null)

useResizeObserver(container, ([entry]) => {
  const { width, height } = entry.contentRect
  previewSide.value = Math.min(MAX_PREVIEW_SIDE, Math.ceil(Math.max(width, height) * window.devicePixelRatio))
})

/** 只在去背結果改變時重新裁空白；調整輸出設定只需重新排版與畫白邊 */
const content = computed(() => trimTransparent(props.image))

function draw(): void {
  const canvas = canvasRef.value
  if (!canvas || previewSide.value === 0) return
  const rendered = renderOutput(content.value, props.settings, previewSide.value)
  canvas.width = rendered.width
  canvas.height = rendered.height
  canvas.getContext('2d')?.putImageData(new ImageData(rendered.data, rendered.width, rendered.height), 0, 0)
}

const drawLater = useDebounceFn(draw, SETTINGS_REDRAW_DEBOUNCE_MS)

// 第一次量到大小時立刻畫；之後縮放視窗造成的大小變化，等停下來再重畫
watch(previewSide, (_side, previous) => (previous === 0 ? draw() : drawLater()))
// 去背結果改變（例如微調後）立刻重畫；輸出設定改變則等滑桿停下
watch(content, draw)
watch(() => props.settings, drawLater, { deep: true })
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
