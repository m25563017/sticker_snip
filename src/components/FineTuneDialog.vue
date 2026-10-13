<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useEventListener } from '@vueuse/core'
import { useEditorStore } from '@/stores/editor'
import { useUndoHistory } from '@/composables/useUndoHistory'
import { useDebouncedDraft } from '@/composables/useDebouncedDraft'
import { useIsTouchDevice } from '@/composables/useIsTouchDevice'
import { cropSelection } from '@/lib/cropSelection'
import type { PixelBuffer } from '@/lib/pixelBuffer'
import { FIT_VIEW, type ZoomView } from '@/lib/zoomView'
import type { PreviewBackdrop } from '@/types/preview'
import type { ManualEdit, Selection } from '@/types/selection'
import PixelCanvas from '@/components/PixelCanvas.vue'
import ZoomViewport from '@/components/ZoomViewport.vue'
import BackdropToggle from '@/components/BackdropToggle.vue'
import ManualEditPanel from '@/components/ManualEditPanel.vue'
import AppIcon from '@/components/AppIcon.vue'

const { t } = useI18n()
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

// ======== 手動修改：復原／重做 ========
/**
 * 歷史紀錄放在彈窗而不是 ManualEditPanel：「還原到打開前」也在這裡，
 * 兩種「回到過去」的操作要一起管理（還原後清空歷史，避免復原到還原前的狀態）。
 * 只在彈窗打開期間有效，關閉就消失。
 */
const history = useUndoHistory<ManualEdit[]>()

function handleAddEdit(edit: ManualEdit): void {
  history.record(props.selection.manualEdits)
  editorStore.addManualEdit(props.selection.id, edit)
}

function handleUndo(): void {
  const previous = history.undo(props.selection.manualEdits)
  if (previous) editorStore.updateSelection(props.selection.id, { manualEdits: previous })
}

function handleRedo(): void {
  const next = history.redo(props.selection.manualEdits)
  if (next) editorStore.updateSelection(props.selection.id, { manualEdits: next })
}

// ======== 縮放 ========
/** 原圖和結果共用同一份視角：放大看某個角落時，兩邊停在同一個位置方便對照 */
const view = ref<ZoomView>(FIT_VIEW)
const zoomPercent = computed(() => Math.round(view.value.scale * 100))
/** 觸控裝置的提示改成兩指手勢，滾輪和空白鍵對它們沒有意義 */
const isTouchDevice = useIsTouchDevice()

function handleFitView(): void {
  view.value = FIT_VIEW
}

// ======== 手機：原圖／結果切換 ========
/**
 * 手機螢幕並排兩張圖，每張只剩一半寬，什麼都看不清楚，所以改成切換顯示。
 * 兩張共用同一份縮放視角，切過去還是同一個位置，方便對照。預設看結果（要修的是它）。
 */
type ComparePane = 'original' | 'result'
const COMPARE_PANES: ComparePane[] = ['original', 'result']
const mobilePane = ref<ComparePane>('result')

function handleSelectPane(pane: ComparePane): void {
  mobilePane.value = pane
}

// ======== 閾值 ========
/** 拖動時數字即時跟著動，寫回 store（觸發重算去背）等停手；還原時可取消、關閉時自動送出 */
const {
  draft: thresholdDraft,
  set: setThreshold,
  cancel: cancelPendingThreshold,
} = useDebouncedDraft(
  () => props.selection.threshold,
  (threshold) => editorStore.updateSelection(props.selection.id, { threshold }),
  THRESHOLD_DEBOUNCE_MS,
)

function handleThresholdInput(event: Event): void {
  setThreshold(Number((event.target as HTMLInputElement).value))
}

// ======== 還原 ========
const hasChanges = computed(() => {
  const current = { ...takeSnapshot(props.selection), threshold: thresholdDraft.value }
  return JSON.stringify(current) !== JSON.stringify(snapshot)
})

function handleRevert(): void {
  cancelPendingThreshold()
  editorStore.updateSelection(props.selection.id, takeSnapshot(snapshot))
  thresholdDraft.value = snapshot.threshold
  history.clear()
}

// ======== 關閉 ========
function handleClose(): void {
  emit('close')
}

function handleBackdropChange(value: PreviewBackdrop): void {
  emit('update:backdrop', value)
}

/** 快捷鍵：Esc 關閉；Ctrl（Mac 為 Cmd）+ Z 復原，加 Shift 或改按 Y 為重做 */
useEventListener(document, 'keydown', (event: KeyboardEvent) => {
  if (event.key === 'Escape') {
    handleClose()
    return
  }
  if (!event.ctrlKey && !event.metaKey) return
  const key = event.key.toLowerCase()
  if (key === 'z' || key === 'y') {
    // 擋掉瀏覽器自己的復原（例如對輸入框的復原），避免兩邊同時作用
    event.preventDefault()
    if (key === 'y' || event.shiftKey) handleRedo()
    else handleUndo()
  }
})
</script>

<template>
  <Teleport to="body">
    <div class="fine-tune-dialog" role="dialog" aria-modal="true" @click.self="handleClose">
      <section class="fine-tune-dialog__panel">
        <!-- ======== 標題列：黑底白字，和其他面板一致 ======== -->
        <header class="fine-tune-dialog__titlebar hand-panel-title flex items-center justify-between gap-4">
          <h2 class="text-lg">{{ t('fineTune.title', { number: props.displayNumber }) }}</h2>
          <button type="button" class="fine-tune-dialog__close" :aria-label="t('fineTune.close')" @click="handleClose">
            <AppIcon name="close" :size="20" />
          </button>
        </header>

        <div class="fine-tune-dialog__body">
          <!-- ======== 檢視：縮放、預覽背景 ======== -->
          <div class="flex flex-wrap items-center justify-end gap-3">
            <span class="text-xs opacity-60">{{ isTouchDevice ? t('fineTune.zoomHintTouch') : t('fineTune.zoomHint') }}</span>
            <button
              type="button"
              class="hand-button text-sm"
              :disabled="view.scale === 1"
              :title="t('common.fitView')"
              @click="handleFitView"
            >
              <AppIcon name="fit" />{{ zoomPercent }}%
            </button>
            <BackdropToggle :model-value="props.backdrop" @update:model-value="handleBackdropChange" />
          </div>

          <!-- ======== 手機：原圖／結果切換（電腦版兩張並排，不需要） ======== -->
          <div class="flex gap-2 md:hidden" role="radiogroup">
            <template v-for="pane in COMPARE_PANES" :key="pane">
              <button
                type="button"
                role="radio"
                class="hand-button flex-1 justify-center"
                :aria-checked="mobilePane === pane"
                @click="handleSelectPane(pane)"
              >
                {{ t(`fineTune.panes.${pane}`) }}
              </button>
            </template>
          </div>

          <!-- ======== 原圖（只供對照、不可編輯）與去背結果 ======== -->
          <div class="fine-tune-dialog__compare">
            <figure class="fine-tune-dialog__figure" :class="{ 'max-md:hidden': mobilePane !== 'original' }">
              <!--
                原圖不接受任何點擊：所有會改變結果的操作都集中在右邊的去背結果上，
                才都會記在同一份歷史紀錄裡，復原、重做都退得回來
              -->
              <figcaption class="text-sm opacity-70">{{ t('fineTune.original') }}</figcaption>
              <div class="fine-tune-dialog__image preview-backdrop preview-backdrop--checker">
                <template v-if="originalImage">
                  <ZoomViewport v-model:view="view" class="w-full h-full">
                    <PixelCanvas :image="originalImage" fit="contain" />
                  </ZoomViewport>
                </template>
              </div>
            </figure>
            <ManualEditPanel
              class="fine-tune-dialog__figure"
              :class="{ 'max-md:hidden': mobilePane !== 'result' }"
              :selection="props.selection"
              :preview="props.preview"
              v-model:view="view"
              :origin="originalRegion?.origin ?? null"
              :backdrop="props.backdrop"
              :can-undo="history.canUndo.value"
              :can-redo="history.canRedo.value"
              @edit="handleAddEdit"
              @undo="handleUndo"
              @redo="handleRedo"
            />
          </div>

          <!-- ======== 背景色 ======== -->
          <div class="flex items-center gap-3">
            <span class="text-sm w-20">{{ t('fineTune.backgroundColor') }}</span>
            <span class="fine-tune-dialog__swatch" :style="{ backgroundColor: props.selection.backgroundColor ?? 'transparent' }"></span>
            <code class="text-sm">{{ props.selection.backgroundColor ?? '—' }}</code>
          </div>

          <!-- ======== 閾值 ======== -->
          <div class="flex flex-col gap-1">
            <label class="flex items-center gap-3">
              <span class="text-sm w-20">{{ t('fineTune.threshold') }}</span>
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
            <p class="text-xs opacity-60 pl-23">{{ t('fineTune.thresholdHint') }}</p>
          </div>

          <!-- ======== 底部操作：修改即時套用，這裡只提供整組還原與明確的完成 ======== -->
          <footer class="flex items-center justify-between">
            <button type="button" class="hand-button text-sm" :disabled="!hasChanges" @click="handleRevert">
              <AppIcon name="undo" />{{ t('fineTune.revert') }}
            </button>
            <button type="button" class="hand-button hand-button--primary" @click="handleClose">{{ t('fineTune.done') }}</button>
          </footer>
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
    width: min(960px, 100%);
    max-height: 100%;
    background-color: var(--color-paper);
    border: 3px solid var(--color-ink);
    box-shadow: 8px 8px 0 var(--color-ink);
  }

  /* 標題列固定在上方，內容太高時只捲動下面 */
  .fine-tune-dialog__titlebar {
    flex-shrink: 0;
    text-align: left;
  }

  .fine-tune-dialog__body {
    display: flex;
    flex-direction: column;
    gap: 16px;
    min-height: 0;
    overflow-y: auto;
    padding: 16px 20px 20px;
  }

  /*
   * 原圖與結果並排比較：兩欄共用同一組列（標題、圖片、下方按鈕），
   * 每個 figure 用 subgrid 套用這組列，哪一邊的標題換行，兩邊的圖片都會一起往下，永遠對齊
   */
  .fine-tune-dialog__compare {
    display: grid;
    grid-template-columns: 1fr 1fr;
    grid-template-rows: auto auto auto;
    gap: 4px 16px;
  }

  .fine-tune-dialog__figure {
    display: grid;
    grid-row: span 3;
    grid-template-rows: subgrid;
    align-items: end;
  }

  .fine-tune-dialog__image {
    height: 360px;
    border: var(--hand-border);
  }

  .fine-tune-dialog__swatch {
    width: 24px;
    height: 24px;
    border: var(--hand-border);
    border-radius: 2px;
  }

  /*
   * 手機：全螢幕（彈窗外沒有空間可以點來關閉，用標題列的 ✕ 或「完成」），
   * 原圖與結果只顯示一張，圖片高度依螢幕高度調整
   */
  @media (max-width: 767px) {
    padding: 0;

    .fine-tune-dialog__panel {
      width: 100%;
      height: 100%;
      border: none;
      box-shadow: none;
    }

    .fine-tune-dialog__body {
      gap: 12px;
      padding: 12px;
    }

    .fine-tune-dialog__compare {
      grid-template-columns: minmax(0, 1fr);
    }

    .fine-tune-dialog__image {
      height: 50vh;
    }
  }

  /* 在黑色標題列上：白色叉叉，滑過時反白 */
  .fine-tune-dialog__close {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;

    &:hover {
      color: var(--color-ink);
      background-color: var(--color-paper);
    }
  }
}
</style>
