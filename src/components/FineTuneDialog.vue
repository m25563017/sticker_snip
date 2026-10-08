<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useEventListener } from '@vueuse/core'
import { useEditorStore } from '@/stores/editor'
import { cropSelection } from '@/lib/cropSelection'
import type { PixelBuffer } from '@/lib/pixelBuffer'
import type { PreviewBackdrop } from '@/types/preview'
import type { Selection } from '@/types/selection'
import PixelCanvas from '@/components/PixelCanvas.vue'
import BackdropToggle from '@/components/BackdropToggle.vue'
import ManualEditPanel from '@/components/ManualEditPanel.vue'
import AppIcon from '@/components/AppIcon.vue'

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

// ======== 快照：打開彈窗時的設定，「還原到打開前」用 ========
type TuningSnapshot = Pick<Selection, 'threshold' | 'manualEdits'>

function takeSnapshot(source: TuningSnapshot): TuningSnapshot {
  return {
    threshold: source.threshold,
    // 手動修改是多層的純資料（陣列裡有物件、物件裡又有陣列），用 JSON 來回轉一次做完整複製，
    // 快照才不會和目前的資料共用同一份陣列、被之後的修改連帶改掉
    manualEdits: JSON.parse(JSON.stringify(source.manualEdits)),
  }
}

/** 只在打開時拍一次；之後的修改都是即時套用，還原時整組蓋回去 */
const snapshot = takeSnapshot(props.selection)

/** 範圍的原圖（去背前），只供對照；origin 用來把手動修改的位置換回原圖座標 */
const originalRegion = computed(() => {
  const source = editorStore.sourcePixels
  return source ? cropSelection(source, props.selection) : null
})
const originalImage = computed(() => originalRegion.value?.image ?? null)

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

/**
 * 自己管理 debounce 的計時器，而不用 useDebounceFn：
 * 「還原」時必須能取消還沒送出的滑桿值，否則 0.1 秒後它會把剛還原的閾值又蓋掉；
 * 關閉彈窗時則要立刻送出，不能讓最後一次調整消失。
 */
let pendingThreshold: number | null = null
let thresholdTimer: ReturnType<typeof setTimeout> | undefined

function flushThreshold(): void {
  clearTimeout(thresholdTimer)
  if (pendingThreshold === null) return
  editorStore.updateSelection(props.selection.id, { threshold: pendingThreshold })
  pendingThreshold = null
}

function cancelPendingThreshold(): void {
  clearTimeout(thresholdTimer)
  pendingThreshold = null
}

function handleThresholdInput(event: Event): void {
  const value = Number((event.target as HTMLInputElement).value)
  thresholdDraft.value = value
  pendingThreshold = value
  clearTimeout(thresholdTimer)
  thresholdTimer = setTimeout(flushThreshold, THRESHOLD_DEBOUNCE_MS)
}

onBeforeUnmount(flushThreshold)

// ======== 還原 ========
const hasChanges = computed(() => {
  const current = { ...takeSnapshot(props.selection), threshold: thresholdDraft.value }
  return JSON.stringify(current) !== JSON.stringify(snapshot)
})

function handleRevert(): void {
  cancelPendingThreshold()
  editorStore.updateSelection(props.selection.id, takeSnapshot(snapshot))
  thresholdDraft.value = snapshot.threshold
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
            <button type="button" class="fine-tune-dialog__close" aria-label="關閉" @click="handleClose">
              <AppIcon name="close" :size="20" />
            </button>
          </div>
        </header>

        <!-- ======== 原圖（只供對照、不可編輯）與去背結果 ======== -->
        <div class="grid grid-cols-2 gap-4">
          <figure class="flex flex-col gap-1">
            <!--
              原圖不接受任何點擊：所有會改變結果的操作都集中在右邊的去背結果上，
              才都會記在同一個步驟清單裡，「復原上一步」退得回來
            -->
            <figcaption class="text-sm opacity-70">原圖（去背前，僅供對照）</figcaption>
            <div class="fine-tune-dialog__image preview-backdrop preview-backdrop--checker">
              <template v-if="originalImage">
                <PixelCanvas :image="originalImage" fit="contain" />
              </template>
            </div>
          </figure>
          <ManualEditPanel
            :selection="props.selection"
            :preview="props.preview"
            :origin="originalRegion?.origin ?? null"
            :backdrop="props.backdrop"
          />
        </div>

        <!-- ======== 背景色 ======== -->
        <div class="flex items-center gap-3">
          <span class="text-sm w-16">背景色</span>
          <span class="fine-tune-dialog__swatch" :style="{ backgroundColor: props.selection.backgroundColor ?? 'transparent' }"></span>
          <code class="text-sm">{{ props.selection.backgroundColor ?? '—' }}</code>
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

        <!-- ======== 底部操作：修改即時套用，這裡只提供整組還原與明確的完成 ======== -->
        <footer class="flex items-center justify-between">
          <button
            type="button"
            class="fine-tune-dialog__button inline-flex items-center gap-1"
            :disabled="!hasChanges"
            @click="handleRevert"
          >
            <AppIcon name="undo" />還原到打開前
          </button>
          <button type="button" class="fine-tune-dialog__done" @click="handleClose">完成</button>
        </footer>
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

  .fine-tune-dialog__done {
    padding: 6px 20px;
    color: #fff;
    background-color: rgb(37, 99, 235);
    border-radius: 6px;

    &:hover {
      background-color: rgb(29, 78, 216);
    }
  }

  .fine-tune-dialog__close {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    border-radius: 50%;

    &:hover {
      background-color: rgba(0, 0, 0, 0.08);
    }
  }
}
</style>
