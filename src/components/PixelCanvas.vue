<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import type { PixelBuffer } from '@/lib/pixelBuffer'
import { computeContainSize } from '@/lib/canvas'
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
    /** 有傳就進入筆刷模式（橡皮擦）：按住拖曳畫出路徑，值為筆刷半徑（圖片 px） */
    brushRadius?: number
  }>(),
  { fit: 'shrink', loupeRadius: undefined, brushRadius: undefined },
)

const emit = defineEmits<{
  /** 點到圖片上的哪個像素（圖片座標）；點在留白處不會觸發 */
  pick: [point: Point]
  /** 筆刷模式下畫完一筆（放開滑鼠），回傳整筆路徑（圖片座標） */
  stroke: [points: Point[]]
}>()

/** 拖曳中的路徑預覽色：半透明紅，看得出擦到哪裡，也看得到底下的圖 */
const BRUSH_PREVIEW_COLOR = 'rgba(239, 68, 68, 0.55)'

const canvasRef = ref<HTMLCanvasElement | null>(null)
const isBrushMode = computed(() => props.brushRadius !== undefined)

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
  // 筆刷模式下放開滑鼠也會觸發 click，不能再當成一次點選
  if (isBrushMode.value) return
  const point = eventToImagePoint(event)
  if (point) emit('pick', point)
}

// ======== 游標位置（放大鏡、筆刷圓圈共用） ========
const hover = ref<{ point: Point; clientX: number; clientY: number } | null>(null)

/** 圖片在畫面上的放大倍率，用來把筆刷半徑換算成游標圓圈的實際大小 */
function displayScale(): number {
  const rect = canvasRef.value?.getBoundingClientRect()
  if (!rect) return 1
  return computeContainSize(props.image.width, props.image.height, rect.width, rect.height).scale
}

const brushCursorSize = ref(0)

// ======== 筆刷 ========
/** 拖曳中的路徑；拖曳前後為 null */
let strokePoints: Point[] | null = null

/**
 * 直接畫在同一張 canvas 上當預覽：canvas 的像素尺寸就是圖片尺寸，用圖片座標畫即可。
 * 放開後父層重新去背、傳入新的 image，draw() 會蓋掉預覽。
 */
function drawStrokeSegment(from: Point, to: Point): void {
  const ctx = canvasRef.value?.getContext('2d')
  if (!ctx || props.brushRadius === undefined) return
  ctx.strokeStyle = BRUSH_PREVIEW_COLOR
  ctx.lineWidth = props.brushRadius * 2
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.beginPath()
  ctx.moveTo(from.x, from.y)
  ctx.lineTo(to.x, to.y)
  ctx.stroke()
}

function handlePointerDown(event: PointerEvent): void {
  if (!isBrushMode.value || event.button !== 0) return
  const point = eventToImagePoint(event)
  if (!point) return
  canvasRef.value?.setPointerCapture(event.pointerId)
  strokePoints = [point]
  drawStrokeSegment(point, point)
}

function handlePointerMove(event: PointerEvent): void {
  const point = eventToImagePoint(event)
  hover.value = point ? { point, clientX: event.clientX, clientY: event.clientY } : null
  if (isBrushMode.value) brushCursorSize.value = (props.brushRadius ?? 0) * 2 * displayScale()

  if (strokePoints && point) {
    drawStrokeSegment(strokePoints[strokePoints.length - 1], point)
    strokePoints.push(point)
  }
}

function handlePointerUp(): void {
  if (!strokePoints) return
  emit('stroke', strokePoints)
  strokePoints = null
}

function handlePointerCancel(): void {
  strokePoints = null
  draw() // 清掉畫到一半的預覽
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
    :class="{ 'pixel-canvas--contain': props.fit === 'contain', 'pixel-canvas--brush': isBrushMode }"
    @click="handleClick"
    @pointerdown="handlePointerDown"
    @pointermove="handlePointerMove"
    @pointerup="handlePointerUp"
    @pointercancel="handlePointerCancel"
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
  <!-- 筆刷模式用圓圈取代游標，圓圈大小就是實際會擦到的範圍 -->
  <template v-if="hover && isBrushMode">
    <Teleport to="body">
      <span
        class="pixel-canvas__brush-cursor"
        :style="{
          left: `${hover.clientX}px`,
          top: `${hover.clientY}px`,
          width: `${brushCursorSize}px`,
          height: `${brushCursorSize}px`,
        }"
      ></span>
    </Teleport>
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

  &.pixel-canvas--brush {
    cursor: none;
    touch-action: none;
  }
}

.pixel-canvas__brush-cursor {
  position: fixed;
  z-index: 60;
  pointer-events: none;
  transform: translate(-50%, -50%);
  /* 黑白雙圈：不論底下是深色還是淺色都看得到 */
  border: 1px solid #fff;
  border-radius: 50%;
  box-shadow: 0 0 0 1px #000;
}
</style>
