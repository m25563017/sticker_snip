<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { rgbToHex } from '@/lib/color'
import type { PixelBuffer } from '@/lib/pixelBuffer'
import { readPatch, sampleColor } from '@/lib/sampleColor'
import type { Point } from '@/types/selection'

const props = defineProps<{
  image: PixelBuffer
  /** 游標指到的圖片像素座標 */
  point: Point
  /** 游標在視窗中的位置，決定放大鏡要顯示在哪 */
  clientX: number
  clientY: number
  /**
   * 點下去實際會用到的範圍半徑（魔術棒只看點到的那一格 → 0）。
   * 中央方框與下方色碼都依這個範圍呈現，讓使用者看到的就是點下去會發生的事。
   */
  selectRadius: number
}>()

/** 放大鏡顯示游標周圍 11×11 像素 */
const PATCH_RADIUS = 5
const PATCH_SIZE = PATCH_RADIUS * 2 + 1
/** 每個像素放大成 12×12 的方格 */
const CELL_SIZE = 12
const LOUPE_SIZE = PATCH_SIZE * CELL_SIZE
/** 放大鏡和游標保持距離，避免擋住正要點的位置 */
const CURSOR_GAP = 20
const LABEL_HEIGHT = 28

const canvasRef = ref<HTMLCanvasElement | null>(null)

const pickedColor = computed(() => {
  const { image, point, selectRadius } = props
  const centerIndex = (Math.round(point.y) * image.width + Math.round(point.x)) * 4
  if (image.data[centerIndex + 3] === 0) return null
  return rgbToHex(sampleColor(image, point.x, point.y, selectRadius))
})

/** 靠近視窗右緣或下緣時，翻到游標的另一側，避免放大鏡被切掉 */
const position = computed(() => {
  const fitsRight = props.clientX + CURSOR_GAP + LOUPE_SIZE < window.innerWidth
  const fitsBelow = props.clientY + CURSOR_GAP + LOUPE_SIZE + LABEL_HEIGHT < window.innerHeight
  return {
    left: `${fitsRight ? props.clientX + CURSOR_GAP : props.clientX - CURSOR_GAP - LOUPE_SIZE}px`,
    top: `${fitsBelow ? props.clientY + CURSOR_GAP : props.clientY - CURSOR_GAP - LOUPE_SIZE - LABEL_HEIGHT}px`,
  }
})

/**
 * 逐格畫成色塊而非用 drawImage 放大：drawImage 放大會被瀏覽器平滑處理成模糊的漸層，
 * 看不出一格一格的像素邊界，就失去放大鏡「看清楚點到哪一格」的意義。
 */
function draw(): void {
  const ctx = canvasRef.value?.getContext('2d')
  if (!ctx) return
  const patch = readPatch(props.image, props.point.x, props.point.y, PATCH_RADIUS)

  ctx.clearRect(0, 0, LOUPE_SIZE, LOUPE_SIZE)
  for (let row = 0; row < PATCH_SIZE; row++) {
    for (let column = 0; column < PATCH_SIZE; column++) {
      const i = (row * PATCH_SIZE + column) * 4
      const alpha = patch.data[i + 3]
      // 透明的格子不畫，讓底下的棋盤格透出來
      if (alpha === 0) continue
      ctx.fillStyle = `rgba(${patch.data[i]}, ${patch.data[i + 1]}, ${patch.data[i + 2]}, ${alpha / 255})`
      ctx.fillRect(column * CELL_SIZE, row * CELL_SIZE, CELL_SIZE, CELL_SIZE)
    }
  }

  // 中央方框：黑白雙線，不論底下是深色還是淺色都看得到
  const boxStart = (PATCH_RADIUS - props.selectRadius) * CELL_SIZE
  const boxSize = (props.selectRadius * 2 + 1) * CELL_SIZE
  ctx.lineWidth = 2
  ctx.strokeStyle = '#000'
  ctx.strokeRect(boxStart, boxStart, boxSize, boxSize)
  ctx.lineWidth = 1
  ctx.strokeStyle = '#fff'
  ctx.strokeRect(boxStart + 1.5, boxStart + 1.5, boxSize - 3, boxSize - 3)
}

onMounted(draw)
watch(() => [props.image, props.point.x, props.point.y, props.selectRadius], draw)
</script>

<template>
  <Teleport to="body">
    <div class="pixel-loupe" :style="position" aria-hidden="true">
      <div class="pixel-loupe__lens preview-backdrop preview-backdrop--checker">
        <canvas ref="canvasRef" :width="LOUPE_SIZE" :height="LOUPE_SIZE" class="block"></canvas>
      </div>
      <div class="pixel-loupe__label flex items-center justify-center gap-2">
        <template v-if="pickedColor">
          <span class="pixel-loupe__swatch" :style="{ backgroundColor: pickedColor }"></span>
          <code>{{ pickedColor }}</code>
        </template>
        <template v-else>
          <span>透明</span>
        </template>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.pixel-loupe {
  position: fixed;
  z-index: 60;
  /* 放大鏡只負責顯示，滑鼠事件要穿透到底下的圖片 */
  pointer-events: none;

  .pixel-loupe__lens {
    overflow: hidden;
    border: 2px solid #111;
    border-radius: 50%;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  }

  .pixel-loupe__label {
    margin-top: 4px;
    padding: 2px 8px;
    font-size: 0.8rem;
    color: #fff;
    background-color: rgba(0, 0, 0, 0.75);
    border-radius: 999px;
  }

  .pixel-loupe__swatch {
    width: 12px;
    height: 12px;
    border: 1px solid #fff;
    border-radius: 3px;
  }
}
</style>
