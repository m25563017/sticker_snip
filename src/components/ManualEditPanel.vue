<script setup lang="ts">
import { ref } from 'vue'
import { useEditorStore } from '@/stores/editor'
import type { PixelBuffer } from '@/lib/pixelBuffer'
import type { PreviewBackdrop } from '@/types/preview'
import type { Point, Selection } from '@/types/selection'
import PixelCanvas from '@/components/PixelCanvas.vue'
import AppIcon, { type IconName } from '@/components/AppIcon.vue'

/**
 * 微調彈窗中的「手動修改」：在去背結果上用魔術棒或橡皮擦修正。
 * 兩種工具的操作記在同一個步驟清單（selection.manualEdits），所以只有一組復原／清除。
 */
const props = defineProps<{
  selection: Selection
  preview: PixelBuffer | undefined
  /** 裁切結果左上角在原圖的位置，用來把點選位置換回原圖座標 */
  origin: Point | null
  backdrop: PreviewBackdrop
}>()

type EditTool = 'wand' | 'erase'
const TOOLS: { value: EditTool; label: string; icon: IconName }[] = [
  { value: 'wand', label: '魔術棒', icon: 'wand' },
  { value: 'erase', label: '橡皮擦', icon: 'eraser' },
]
/** 筆刷大小（直徑）預設為範圍短邊的 5%，範圍 300 px 約 15 px */
const BRUSH_SIZE_RATIO = 0.05
const BRUSH_SIZE_MIN = 2

const editorStore = useEditorStore()
const activeTool = ref<EditTool>('wand')
const brushSize = ref(
  Math.max(
    BRUSH_SIZE_MIN,
    Math.round(Math.min(props.preview?.width ?? 0, props.preview?.height ?? 0) * BRUSH_SIZE_RATIO),
  ),
)
const brushSizeMax = Math.max(60, brushSize.value * 3)

/** 裁切後座標 → 原圖座標：手動修改一律存原圖座標，調整範圍大小後位置才不會跑掉 */
function toSourcePoint(point: Point): Point | null {
  return props.origin ? { x: point.x + props.origin.x, y: point.y + props.origin.y } : null
}

/**
 * 在去背結果上點選沒去乾淨的區塊。點到已經透明的地方不算一次操作，
 * 否則「復原」會多出一些看不出效果的步驟，讓使用者困惑。
 */
function handleWandPick(point: Point): void {
  const preview = props.preview
  const sourcePoint = toSourcePoint(point)
  if (!preview || !sourcePoint) return
  const index = (Math.round(point.y) * preview.width + Math.round(point.x)) * 4
  if (preview.data[index + 3] === 0) return

  editorStore.addManualEdit(props.selection.id, { tool: 'wand', point: sourcePoint })
}

function handleEraseStroke(points: Point[]): void {
  const sourcePoints = points.map(toSourcePoint).filter((point): point is Point => point !== null)
  if (sourcePoints.length === 0) return
  editorStore.addManualEdit(props.selection.id, { tool: 'erase', points: sourcePoints, radius: brushSize.value / 2 })
}

function handleSelectTool(tool: EditTool): void {
  activeTool.value = tool
}

function handleBrushSizeInput(event: Event): void {
  brushSize.value = Number((event.target as HTMLInputElement).value)
}

/** 復原上一步：不分工具，拿掉最後一筆修改 */
function handleUndoEdit(): void {
  editorStore.undoManualEdit(props.selection.id)
}

function handleClearEdits(): void {
  editorStore.clearManualEdits(props.selection.id)
}
</script>

<template>
  <figure class="manual-edit-panel flex flex-col gap-1">
    <!-- ======== 工具切換：魔術棒點一下去掉同色區塊；橡皮擦拖曳直接擦掉 ======== -->
    <!-- 文字一律不折行（中文會被擠成一字一行）；空間不夠時讓筆刷滑桿整組換到下一行 -->
    <figcaption class="flex flex-wrap items-center gap-2 text-sm whitespace-nowrap">
      <span class="opacity-70">去背結果</span>
      <template v-for="tool in TOOLS" :key="tool.value">
        <button
          type="button"
          class="manual-edit-panel__tool inline-flex items-center gap-1 shrink-0 whitespace-nowrap"
          :class="{ 'manual-edit-panel__tool--active': activeTool === tool.value }"
          :aria-pressed="activeTool === tool.value"
          @click="handleSelectTool(tool.value)"
        >
          <AppIcon :name="tool.icon" />{{ tool.label }}
        </button>
      </template>
      <template v-if="activeTool === 'erase'">
        <label class="flex items-center gap-1 ml-auto">
          <span class="opacity-70">筆刷</span>
          <input
            type="range"
            :min="BRUSH_SIZE_MIN"
            :max="brushSizeMax"
            step="1"
            :value="brushSize"
            @input="handleBrushSizeInput"
          />
          <span class="w-12 text-right">{{ brushSize }} px</span>
        </label>
      </template>
    </figcaption>

    <!-- ======== 去背結果（在上面點選或擦除） ======== -->
    <div class="manual-edit-panel__image preview-backdrop" :class="`preview-backdrop--${props.backdrop}`">
      <template v-if="props.preview">
        <PixelCanvas
          :image="props.preview"
          fit="contain"
          :loupe-radius="activeTool === 'wand' ? 0 : undefined"
          :brush-radius="activeTool === 'erase' ? brushSize / 2 : undefined"
          @pick="handleWandPick"
          @stroke="handleEraseStroke"
        />
      </template>
    </div>

    <!-- ======== 復原：魔術棒、橡皮擦共用同一個步驟記錄 ======== -->
    <div class="flex items-center gap-2">
      <button
        type="button"
        class="manual-edit-panel__button inline-flex items-center gap-1 whitespace-nowrap"
        :disabled="props.selection.manualEdits.length === 0"
        @click="handleUndoEdit"
      >
        <AppIcon name="undo" />復原上一步
      </button>
      <button
        type="button"
        class="manual-edit-panel__button inline-flex items-center gap-1 whitespace-nowrap"
        :disabled="props.selection.manualEdits.length === 0"
        @click="handleClearEdits"
      >
        <AppIcon name="trash" />全部清除
      </button>
    </div>
  </figure>
</template>

<style scoped>
.manual-edit-panel {
  .manual-edit-panel__image {
    height: 360px;
    cursor: crosshair;
  }

  .manual-edit-panel__tool {
    padding: 1px 10px;
    border: 1px solid #ccc;
    border-radius: 999px;

    &.manual-edit-panel__tool--active {
      color: #fff;
      background-color: #111;
      border-color: #111;
    }
  }

  .manual-edit-panel__button {
    padding: 2px 10px;
    font-size: 0.875rem;
    border: 1px solid #999;
    border-radius: 6px;

    &:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }
  }
}
</style>
