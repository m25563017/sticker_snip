<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import type { PixelBuffer } from '@/lib/pixelBuffer'
import { containedPointToImage } from '@/lib/coordinates'
import type { Point } from '@/types/selection'
import PixelLoupe from '@/components/PixelLoupe.vue'

const props = withDefaults(
  defineProps<{
    image: PixelBuffer
    /**
     * shrink：只縮不放，適合空間小的縮圖列表。
     * contain：等比放大填滿外框，適合要看清楚邊緣的檢查頁與微調彈窗。
     */
    fit?: 'shrink' | 'contain'
    /**
     * 有傳才會在游標旁顯示放大鏡，值為「點下去會用到的範圍半徑」
     * （滴管取 3×3 平均 → 1，魔術棒只看一格 → 0）。
     */
    loupeRadius?: number
  }>(),
  { fit: 'shrink', loupeRadius: undefined },
)

const emit = defineEmits<{
  /** 點到圖片上的哪個像素（圖片座標）；點在留白處不會觸發 */
  pick: [point: Point]
}>()

const canvasRef = ref<HTMLCanvasElement | null>(null)

/**
 * canvas 的像素尺寸設成原始大小、再由 CSS 縮放顯示，
 * 而不是先把像素縮放：縮放交給瀏覽器處理，品質較好，程式也簡單。
 */
function draw(): void {
  const canvas = canvasRef.value
  const { data, width, height } = props.image
  if (!canvas || width === 0 || height === 0) return

  canvas.width = width
  canvas.height = height
  canvas.getContext('2d')?.putImageData(new ImageData(data, width, height), 0, 0)
}

/** 滑鼠事件 → 圖片像素座標；指在留白處回傳 null */
function eventToImagePoint(event: MouseEvent): Point | null {
  const canvas = canvasRef.value
  if (!canvas) return null
  const rect = canvas.getBoundingClientRect()
  return containedPointToImage(
    { x: event.clientX - rect.left, y: event.clientY - rect.top },
    rect.width,
    rect.height,
    props.image.width,
    props.image.height,
  )
}

function handleClick(event: MouseEvent): void {
  const point = eventToImagePoint(event)
  if (point) emit('pick', point)
}

// ======== 放大鏡 ========
const hover = ref<{ point: Point; clientX: number; clientY: number } | null>(null)

function handlePointerMove(event: PointerEvent): void {
  if (props.loupeRadius === undefined) return
  const point = eventToImagePoint(event)
  hover.value = point ? { point, clientX: event.clientX, clientY: event.clientY } : null
}

function handlePointerLeave(): void {
  hover.value = null
}

onMounted(draw)
// 快取命中時傳進來的是同一個物件，不會重畫；只有重新去背產生新結果才會觸發
watch(() => props.image, draw)
</script>

<template>
  <canvas
    ref="canvasRef"
    class="pixel-canvas block"
    :class="{ 'pixel-canvas--contain': props.fit === 'contain' }"
    @click="handleClick"
    @pointermove="handlePointerMove"
    @pointerleave="handlePointerLeave"
  ></canvas>
  <template v-if="hover && props.loupeRadius !== undefined">
    <PixelLoupe
      :image="props.image"
      :point="hover.point"
      :client-x="hover.clientX"
      :client-y="hover.clientY"
      :select-radius="props.loupeRadius"
    />
  </template>
</template>

<style scoped>
.pixel-canvas {
  max-width: 100%;
  max-height: 100%;

  /* 寬高撐滿外框，再用 object-fit 等比縮放置中，小圖也會被放大 */
  &.pixel-canvas--contain {
    width: 100%;
    height: 100%;
    object-fit: contain;
  }
}
</style>
