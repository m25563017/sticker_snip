<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useDebounceFn } from '@vueuse/core'
import { useEditorStore } from '@/stores/editor'
import { useIsTouchDevice } from '@/composables/useIsTouchDevice'
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
/** 觸控裝置看不到滑過才出現的按鈕說明，改把目前形狀的用法直接寫在畫面上 */
const isTouchDevice = useIsTouchDevice()

/** 手機版：偵測設定（合併距離、重新偵測、清除、說明）平常收起來，畫布才有足夠的高度；電腦版一直顯示 */
const isDetectOpen = ref(false)

function handleToggleDetect(): void {
  isDetectOpen.value = !isDetectOpen.value
}

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
  <div class="select-toolbar hand-panel flex flex-wrap items-center gap-x-4 gap-y-1 mt-4 mb-3 px-3 py-2 text-sm max-md:mt-2 max-md:mb-0">
    <!-- ======== 手動框選的形狀 ======== -->
    <div class="flex items-center gap-1" role="radiogroup" :aria-label="t('selectToolbar.shapeGroup')">
      <span class="mr-1 max-md:hidden">{{ t('selectToolbar.shape') }}</span>
      <template v-for="shape in SHAPES" :key="shape.value">
        <button
          type="button"
          role="radio"
          class="hand-button"
          :aria-checked="editorStore.drawShape === shape.value"
          :title="t(`selectToolbar.shapes.${shape.value}.hint`)"
          :aria-label="t(`selectToolbar.shapes.${shape.value}.label`)"
          @click="handleSelectShape(shape.value)"
        >
          <!-- 手機上只留圖示，省下的寬度讓工具列維持一行 -->
          <AppIcon :name="shape.icon" /><span class="max-md:hidden">{{ t(`selectToolbar.shapes.${shape.value}.label`) }}</span>
        </button>
      </template>
    </div>

    <!-- ======== 自動偵測 ======== -->
    <span>{{ t('selectToolbar.autoCount', { count: autoCount }, autoCount) }}</span>

    <button
      type="button"
      class="hand-button ml-auto md:hidden"
      :aria-pressed="isDetectOpen"
      :aria-label="t('selectToolbar.detectSettings')"
      @click="handleToggleDetect"
    >
      <AppIcon name="sliders" />
    </button>

    <template v-if="isTouchDevice">
      <p class="w-full text-xs">{{ t(`selectToolbar.shapes.${editorStore.drawShape}.hint`) }}</p>
    </template>

    <!--
      偵測設定：電腦版用 md:contents 讓這層包裝「消失」，裡面的元素照常排在工具列同一行；
      手機版收合時整組隱藏，展開時另起一行
    -->
    <div
      class="md:contents"
      :class="isDetectOpen ? 'flex flex-wrap items-center gap-x-4 gap-y-2 w-full pt-1' : 'max-md:hidden'"
    >
      <label class="flex items-center gap-2">
        <span>{{ t('selectToolbar.mergeDistance') }}</span>
        <input type="range" min="0" :max="maxDistance" step="1" :value="distanceDraft" @input="handleDistanceInput" />
        <span class="w-12">{{ distanceDraft }} px</span>
      </label>

      <button type="button" class="hand-button" @click="handleRedetect">
        <AppIcon name="refresh" />{{ t('selectToolbar.redetect') }}
      </button>
      <button
        type="button"
        class="hand-button"
        :disabled="autoCount === 0"
        @click="handleClearAuto"
      >
        <AppIcon name="trash" />{{ t('selectToolbar.clearAuto') }}
      </button>

      <p class="w-full text-xs opacity-60">
        {{ t('selectToolbar.hint') }}
      </p>
    </div>
  </div>
</template>

