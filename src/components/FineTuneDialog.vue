<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useDebounceFn, useEventListener } from '@vueuse/core'
import { useEditorStore } from '@/stores/editor'
import { cropSelection } from '@/lib/cropSelection'
import { rgbToHex } from '@/lib/color'
import type { PixelBuffer } from '@/lib/pixelBuffer'
import { sampleColor } from '@/lib/sampleColor'
import type { PreviewBackdrop } from '@/types/preview'
import type { Point, Selection } from '@/types/selection'
import PixelCanvas from '@/components/PixelCanvas.vue'
import BackdropToggle from '@/components/BackdropToggle.vue'

const props = defineProps<{
  selection: Selection
  /** 畫面上的編號（排列順序），和檢查頁、匯出檔名一致 */
  displayNumber: number
  preview: PixelBuffer | undefined
  backdrop: PreviewBackdrop
}>()

const emit = defineEmits<{
  close: []
  'update:backdrop': [value: PreviewBackdrop]
}>()

const THRESHOLD_MIN = 0
/** 顏色距離最大到 441，但超過 100 幾乎所有淺色都會被當背景，沒有實用價值 */
const THRESHOLD_MAX = 100
/** 拖動滑桿時等手停下這麼久才重算去背：大範圍去背要上百 ms，每移一格都算會卡 */
const THRESHOLD_DEBOUNCE_MS = 100

const editorStore = useEditorStore()

/** 範圍的原圖（去背前），讓使用者在上面點選背景取色 */
const originalImage = computed(() => {
  const source = editorStore.sourcePixels
  return source ? cropSelection(source, props.selection).image : null
})

// ======== 背景色 ========
function handlePickColor(point: Point): void {
  if (!originalImage.value) return
  const color = sampleColor(originalImage.value, point.x, point.y)
  editorStore.setManualBackgroundColor(props.selection.id, rgbToHex(color))
}

function handleResetColor(): void {
  editorStore.resetToAutoBackgroundColor(props.selection.id)
}

// ======== 閾值 ========
/**
 * 滑桿顯示的值與 store 分開：拖動時數字即時跟著動，
 * 但寫回 store（觸發重算去背）要 debounce，兩者不能共用同一個值。
 */
const thresholdDraft = ref(props.selection.threshold)
watch(
  () => props.selection.threshold,
  (value) => {
    thresholdDraft.value = value
  },
)

const commitThreshold = useDebounceFn((value: number) => {
  editorStore.updateSelection(props.selection.id, { threshold: value })
}, THRESHOLD_DEBOUNCE_MS)

function handleThresholdInput(event: Event): void {
  const value = Number((event.target as HTMLInputElement).value)
  thresholdDraft.value = value
  commitThreshold(value)
}

// ======== 關閉 ========
function handleClose(): void {
  emit('close')
}

function handleBackdropChange(value: PreviewBackdrop): void {
  emit('update:backdrop', value)
}

useEventListener(document, 'keydown', (event: KeyboardEvent) => {
  if (event.key === 'Escape') handleClose()
})
</script>

<template>
  <Teleport to="body">
    <div class="fine-tune-dialog" role="dialog" aria-modal="true" @click.self="handleClose">
      <section class="fine-tune-dialog__panel">
        <!-- ======== 標題列 ======== -->
        <header class="flex items-center justify-between gap-4">
          <h2 class="text-lg">#{{ props.displayNumber }} 微調</h2>
          <div class="flex items-center gap-3">
            <BackdropToggle :model-value="props.backdrop" @update:model-value="handleBackdropChange" />
            <button type="button" class="fine-tune-dialog__close" aria-label="關閉" @click="handleClose">✕</button>
          </div>
        </header>

        <!-- ======== 原圖（取色）與去背結果 ======== -->
        <div class="grid grid-cols-2 gap-4">
          <figure class="flex flex-col gap-1">
            <figcaption class="text-sm opacity-70">原圖：點選背景處重新取色</figcaption>
            <div class="fine-tune-dialog__image fine-tune-dialog__image--pickable preview-backdrop preview-backdrop--checker">
              <template v-if="originalImage">
                <PixelCanvas :image="originalImage" fit="contain" @pick="handlePickColor" />
              </template>
            </div>
          </figure>
          <figure class="flex flex-col gap-1">
            <figcaption class="text-sm opacity-70">去背結果</figcaption>
            <div class="fine-tune-dialog__image preview-backdrop" :class="`preview-backdrop--${props.backdrop}`">
              <template v-if="props.preview">
                <PixelCanvas :image="props.preview" fit="contain" />
              </template>
            </div>
          </figure>
        </div>

        <!-- ======== 背景色 ======== -->
        <div class="flex items-center gap-3">
          <span class="text-sm w-16">背景色</span>
          <span class="fine-tune-dialog__swatch" :style="{ backgroundColor: props.selection.backgroundColor ?? 'transparent' }"></span>
          <code class="text-sm">{{ props.selection.backgroundColor ?? '—' }}</code>
          <span class="text-sm opacity-60">{{ props.selection.isManualColor ? '（手動取色）' : '（自動偵測）' }}</span>
          <button
            type="button"
            class="fine-tune-dialog__button"
            :disabled="!props.selection.isManualColor"
            @click="handleResetColor"
          >
            恢復自動偵測
          </button>
        </div>

        <!-- ======== 閾值 ======== -->
        <div class="flex flex-col gap-1">
          <label class="flex items-center gap-3">
            <span class="text-sm w-16">閾值</span>
            <input
              type="range"
              class="flex-1"
              :min="THRESHOLD_MIN"
              :max="THRESHOLD_MAX"
              step="1"
              :value="thresholdDraft"
              @input="handleThresholdInput"
            />
            <span class="text-sm w-8 text-right">{{ thresholdDraft }}</span>
          </label>
          <p class="text-xs opacity-60 pl-19">數值越大，越多「接近背景色」的像素會被去除；背景沒去乾淨就調高，貼紙被吃掉就調低</p>
        </div>
      </section>
    </div>
  </Teleport>
</template>

<style scoped>
.fine-tune-dialog {
  position: fixed;
  inset: 0;
  z-index: 50;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background-color: rgba(0, 0, 0, 0.45);

  .fine-tune-dialog__panel {
    display: flex;
    flex-direction: column;
    gap: 16px;
    width: min(960px, 100%);
    max-height: 100%;
    overflow-y: auto;
    padding: 20px;
    background-color: var(--color-paper);
    border-radius: 12px;
  }

  .fine-tune-dialog__image {
    height: 360px;

    &.fine-tune-dialog__image--pickable {
      cursor: crosshair;
    }
  }

  .fine-tune-dialog__swatch {
    width: 24px;
    height: 24px;
    border: 1px solid #999;
    border-radius: 4px;
  }

  .fine-tune-dialog__button {
    padding: 2px 10px;
    font-size: 0.875rem;
    border: 1px solid #999;
    border-radius: 6px;

    &:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }
  }

  .fine-tune-dialog__close {
    width: 32px;
    height: 32px;
    border-radius: 50%;

    &:hover {
      background-color: rgba(0, 0, 0, 0.08);
    }
  }
}
</style>
