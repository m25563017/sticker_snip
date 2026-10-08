<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useDebounceFn } from '@vueuse/core'
import { useEditorStore } from '@/stores/editor'
import { defaultMergeDistance } from '@/lib/detectStickers'
import type { SelectionType } from '@/types/selection'
import AppIcon, { type IconName } from '@/components/AppIcon.vue'

/** 拖動滑桿時等手停下才重新偵測：偵測加上重算所有縮圖，大圖要一兩百 ms */
const REDETECT_DEBOUNCE_MS = 200
/** 滑桿上限為預設值的幾倍：再大通常整張圖都黏成一塊，沒有實用價值 */
const MAX_DISTANCE_MULTIPLIER = 3

/** 手動框選的形狀；套索畫完不能調整大小，只能刪掉重畫，所以提示文字特別說明 */
const SHAPES: { value: SelectionType; label: string; icon: IconName; hint: string }[] = [
  { value: 'rect', label: '矩形', icon: 'rect', hint: '拖曳對角線畫出矩形' },
  { value: 'ellipse', label: '橢圓', icon: 'ellipse', hint: '拖曳對角線畫出內切的橢圓' },
  {
    value: 'lasso',
    label: '套索',
    icon: 'lasso',
    hint: '按住滑鼠描出形狀，放開時自動以直線連回起點；畫好後無法調整大小',
  },
]

const editorStore = useEditorStore()

function handleSelectShape(shape: SelectionType): void {
  editorStore.drawShape = shape
}

const autoCount = computed(() => editorStore.selections.filter((item) => item.createdBy === 'auto').length)
const maxDistance = computed(() => {
  const pixels = editorStore.sourcePixels
  return pixels ? Math.max(10, defaultMergeDistance(pixels.width, pixels.height) * MAX_DISTANCE_MULTIPLIER) : 10
})

/** 滑桿顯示值與 store 分開：數字即時跟著手動，重新偵測等停手後才做 */
const distanceDraft = ref(editorStore.mergeDistance)
watch(
  () => editorStore.mergeDistance,
  (value) => {
    distanceDraft.value = value
  },
)

const commitDistance = useDebounceFn((value: number) => {
  editorStore.mergeDistance = value
  editorStore.autoDetect()
}, REDETECT_DEBOUNCE_MS)

function handleDistanceInput(event: Event): void {
  const value = Number((event.target as HTMLInputElement).value)
  distanceDraft.value = value
  commitDistance(value)
}

function handleRedetect(): void {
  editorStore.autoDetect()
}

function handleClearAuto(): void {
  editorStore.clearAutoSelections()
}
</script>

<template>
  <div class="select-toolbar flex flex-wrap items-center gap-x-4 gap-y-1 py-2">
    <!-- ======== 手動框選的形狀 ======== -->
    <div class="flex items-center gap-1" role="radiogroup" aria-label="框選形狀">
      <span class="text-sm mr-1">形狀</span>
      <template v-for="shape in SHAPES" :key="shape.value">
        <button
          type="button"
          role="radio"
          class="select-toolbar__shape inline-flex items-center gap-1"
          :class="{ 'select-toolbar__shape--active': editorStore.drawShape === shape.value }"
          :aria-checked="editorStore.drawShape === shape.value"
          :title="shape.hint"
          @click="handleSelectShape(shape.value)"
        >
          <AppIcon :name="shape.icon" />{{ shape.label }}
        </button>
      </template>
    </div>

    <!-- ======== 自動偵測 ======== -->
    <span class="text-sm">自動偵測到 {{ autoCount }} 張</span>

    <label class="flex items-center gap-2">
      <span class="text-sm">合併距離</span>
      <input type="range" min="0" :max="maxDistance" step="1" :value="distanceDraft" @input="handleDistanceInput" />
      <span class="text-sm w-12">{{ distanceDraft }} px</span>
    </label>

    <button type="button" class="select-toolbar__button inline-flex items-center gap-1" @click="handleRedetect">
      <AppIcon name="refresh" />重新偵測
    </button>
    <button
      type="button"
      class="select-toolbar__button inline-flex items-center gap-1"
      :disabled="autoCount === 0"
      @click="handleClearAuto"
    >
      <AppIcon name="trash" />清除自動框（改用手動）
    </button>

    <p class="w-full text-xs opacity-60">
      兩張貼紙被框在一起就調小；旁邊的小裝飾被拆成另一張就調大。點框可選取，矩形與橢圓可拖曳控制點調整大小；調整過或手動畫的框，重新偵測時都會保留
    </p>
  </div>
</template>

<style scoped>
.select-toolbar {
  .select-toolbar__shape {
    padding: 1px 10px;
    font-size: 0.875rem;
    border: 1px solid #ccc;
    border-radius: 999px;

    &.select-toolbar__shape--active {
      color: #fff;
      background-color: #111;
      border-color: #111;
    }
  }

  .select-toolbar__button {
    padding: 2px 10px;
    font-size: 0.875rem;
    border: 1px solid #999;
    border-radius: 6px;

    &:hover:not(:disabled) {
      background-color: rgba(0, 0, 0, 0.05);
    }

    &:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }
  }
}
</style>
