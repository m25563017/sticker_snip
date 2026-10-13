<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import type { ZoomView } from '@/lib/zoomView'
import type { PixelBuffer } from '@/lib/pixelBuffer'
import type { PreviewBackdrop } from '@/types/preview'
import type { ManualEdit, Point, Selection } from '@/types/selection'
import PixelCanvas from '@/components/PixelCanvas.vue'
import ZoomViewport from '@/components/ZoomViewport.vue'
import { useIsTouchDevice } from '@/composables/useIsTouchDevice'
import AppIcon, { type IconName } from '@/components/AppIcon.vue'

/**
 * 微調彈窗中的「手動修改」：在去背結果上用魔術棒、橡皮擦或保留筆刷修正。
 * 只負責工具介面；修改、復原、重做都 emit 給彈窗處理，歷史紀錄由彈窗統一管理。
 */
const { t } = useI18n()
const props = defineProps<{
  selection: Selection
  preview: PixelBuffer | undefined
  /** 裁切結果左上角在原圖的位置，用來把點選位置換回原圖座標 */
  origin: Point | null
  backdrop: PreviewBackdrop
  canUndo: boolean
  canRedo: boolean
}>()

const emit = defineEmits<{
  /** 新增一筆手動修改（座標已換成原圖座標） */
  edit: [edit: ManualEdit]
  undo: []
  redo: []
}>()

/** 縮放視角，和左邊的原圖共用，兩邊同步 */
const view = defineModel<ZoomView>('view', { required: true })

type EditTool = 'wand' | 'erase' | 'keep'
/** 名稱與說明在翻譯檔 manualEdit.tools.<value> */
const TOOLS: { value: EditTool; icon: IconName }[] = [
  { value: 'wand', icon: 'wand' },
  { value: 'erase', icon: 'eraser' },
  { value: 'keep', icon: 'brush' },
]
/** 筆刷大小（直徑，圖片 px）：預設 30，擦一般大小的殘留背景剛好；可調範圍 2～100 */
const BRUSH_SIZE_DEFAULT = 30
const BRUSH_SIZE_MIN = 2
const BRUSH_SIZE_MAX = 100

const activeTool = ref<EditTool>('wand')
/** 觸控裝置看不到滑過才出現的按鈕說明，改把目前工具的用法直接寫在畫面上 */
const isTouchDevice = useIsTouchDevice()
const brushSize = ref(BRUSH_SIZE_DEFAULT)

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

  emit('edit', { tool: 'wand', point: sourcePoint })
}

/** 橡皮擦與保留共用：差別只在記錄的工具類型 */
function handleBrushStroke(points: Point[]): void {
  const tool = activeTool.value
  if (tool === 'wand') return
  const sourcePoints = points.map(toSourcePoint).filter((point): point is Point => point !== null)
  if (sourcePoints.length === 0) return
  emit('edit', { tool, points: sourcePoints, radius: brushSize.value / 2 })
}

function handleSelectTool(tool: EditTool): void {
  activeTool.value = tool
}

function handleBrushSizeInput(event: Event): void {
  brushSize.value = Number((event.target as HTMLInputElement).value)
}

function handleUndo(): void {
  emit('undo')
}

function handleRedo(): void {
  emit('redo')
}
</script>

<template>
  <figure class="manual-edit-panel">
    <!-- ======== 工具切換：魔術棒點一下去掉同色區塊；橡皮擦拖曳直接擦掉 ======== -->
    <!-- 文字一律不折行（中文會被擠成一字一行），空間不夠時整個按鈕換行 -->
    <figcaption class="flex flex-wrap items-center gap-2 text-sm whitespace-nowrap">
      <span class="opacity-70">{{ t('manualEdit.result') }}</span>
      <template v-for="tool in TOOLS" :key="tool.value">
        <button
          type="button"
          class="hand-button shrink-0"
          :aria-pressed="activeTool === tool.value"
          :title="t(`manualEdit.tools.${tool.value}.hint`)"
          @click="handleSelectTool(tool.value)"
        >
          <AppIcon :name="tool.icon" />{{ t(`manualEdit.tools.${tool.value}.label`) }}
        </button>
      </template>
      <template v-if="isTouchDevice">
        <span class="w-full text-xs whitespace-normal opacity-70">{{ t(`manualEdit.tools.${activeTool}.hint`) }}</span>
      </template>
    </figcaption>

    <!-- ======== 去背結果（在上面點選或擦除） ======== -->
    <div class="manual-edit-panel__image preview-backdrop" :class="`preview-backdrop--${props.backdrop}`">
      <template v-if="props.preview">
        <ZoomViewport v-model:view="view" class="w-full h-full">
          <PixelCanvas
            :image="props.preview"
            fit="contain"
            :loupe-radius="activeTool === 'wand' ? 0 : undefined"
            :brush-radius="activeTool !== 'wand' ? brushSize / 2 : undefined"
            :brush-tone="activeTool === 'keep' ? 'keep' : 'erase'"
            @pick="handleWandPick"
            @stroke="handleBrushStroke"
          />
        </ZoomViewport>
      </template>
    </div>

    <!-- ======== 復原／重做（所有工具共用同一份歷史紀錄）＋ 筆刷大小 ======== -->
    <!-- 筆刷滑桿放這裡而不是標題列：標題列才不會因為切換工具忽高忽低 -->
    <div class="flex flex-wrap items-center gap-2 text-sm">
      <button
        type="button"
        class="hand-button text-sm"
        :disabled="!props.canUndo"
        title="Ctrl + Z"
        @click="handleUndo"
      >
        <AppIcon name="undo" />{{ t('manualEdit.undo') }}
      </button>
      <button
        type="button"
        class="hand-button text-sm"
        :disabled="!props.canRedo"
        title="Ctrl + Y"
        @click="handleRedo"
      >
        <AppIcon name="redo" />{{ t('manualEdit.redo') }}
      </button>
      <template v-if="activeTool !== 'wand'">
        <label class="flex items-center gap-1 ml-auto">
          <span class="opacity-70">{{ t('manualEdit.brush') }}</span>
          <input
            type="range"
            :min="BRUSH_SIZE_MIN"
            :max="BRUSH_SIZE_MAX"
            step="1"
            :value="brushSize"
            @input="handleBrushSizeInput"
          />
          <span class="w-12 text-right">{{ brushSize }} px</span>
        </label>
      </template>
    </div>
  </figure>
</template>

<style scoped>
.manual-edit-panel {
  .manual-edit-panel__image {
    height: 360px;
    cursor: crosshair;
    border: var(--hand-border);
  }

  /* 手機：和原圖同高，切換時圖片位置不會跳動 */
  @media (max-width: 767px) {
    .manual-edit-panel__image {
      height: 50vh;
    }
  }
}
</style>
