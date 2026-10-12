<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useDebounceFn } from '@vueuse/core'
import { useEditorStore } from '@/stores/editor'
import { defaultMergeDistance } from '@/lib/detectStickers'
import type { SelectionType } from '@/types/selection'
import AppIcon, { type IconName } from '@/components/AppIcon.vue'

/** 拖動滑桿時等手停下才重新偵測：偵測加上重算所有縮圖，大圖要一兩百 ms */
const REDETECT_DEBOUNCE_MS = 200
/** 滑桿上限為預設值的幾倍：再大通常整張圖都黏成一塊，沒有實用價值 */
const MAX_DISTANCE_MULTIPLIER = 3

/**
 * 手動框選的形狀；名稱與說明在翻譯檔 selectToolbar.shapes.<value>。
 * 套索畫完不能調整大小，只能刪掉重畫，所以說明文字特別提到
 */
const SHAPES: { value: SelectionType; icon: IconName }[] = [
  { value: 'rect', icon: 'rect' },
  { value: 'ellipse', icon: 'ellipse' },
  { value: 'lasso', icon: 'lasso' },
]

const { t } = useI18n()
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
    <div class="flex items-center gap-1" role="radiogroup" :aria-label="t('selectToolbar.shapeGroup')">
      <span class="text-sm mr-1">{{ t('selectToolbar.shape') }}</span>
      <template v-for="shape in SHAPES" :key="shape.value">
        <button
          type="button"
          role="radio"
          class="select-toolbar__shape inline-flex items-center gap-1 whitespace-nowrap"
          :class="{ 'select-toolbar__shape--active': editorStore.drawShape === shape.value }"
          :aria-checked="editorStore.drawShape === shape.value"
          :title="t(`selectToolbar.shapes.${shape.value}.hint`)"
          @click="handleSelectShape(shape.value)"
        >
          <AppIcon :name="shape.icon" />{{ t(`selectToolbar.shapes.${shape.value}.label`) }}
        </button>
      </template>
    </div>

    <!-- ======== 自動偵測 ======== -->
    <span class="text-sm">{{ t('selectToolbar.autoCount', { count: autoCount }, autoCount) }}</span>

    <label class="flex items-center gap-2">
      <span class="text-sm">{{ t('selectToolbar.mergeDistance') }}</span>
      <input type="range" min="0" :max="maxDistance" step="1" :value="distanceDraft" @input="handleDistanceInput" />
      <span class="text-sm w-12">{{ distanceDraft }} px</span>
    </label>

    <button type="button" class="select-toolbar__button inline-flex items-center gap-1 whitespace-nowrap" @click="handleRedetect">
      <AppIcon name="refresh" />{{ t('selectToolbar.redetect') }}
    </button>
    <button
      type="button"
      class="select-toolbar__button inline-flex items-center gap-1 whitespace-nowrap"
      :disabled="autoCount === 0"
      @click="handleClearAuto"
    >
      <AppIcon name="trash" />{{ t('selectToolbar.clearAuto') }}
    </button>

    <p class="w-full text-xs opacity-60">
      {{ t('selectToolbar.hint') }}
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
