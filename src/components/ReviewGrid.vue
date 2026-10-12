<script setup lang="ts">
import { computed, ref } from 'vue'
import { useStorage } from '@vueuse/core'
import { useEditorStore } from '@/stores/editor'
import type { PixelBuffer } from '@/lib/pixelBuffer'
import { DEFAULT_THRESHOLD, type Selection } from '@/types/selection'
import type { PreviewBackdrop } from '@/types/preview'
import OutputPreview from '@/components/OutputPreview.vue'
import OutputSettingsPanel from '@/components/OutputSettingsPanel.vue'
import BackdropToggle from '@/components/BackdropToggle.vue'
import FineTuneDialog from '@/components/FineTuneDialog.vue'
import AppIcon from '@/components/AppIcon.vue'

const props = defineProps<{
  /** 每個範圍的去背結果（以 id 查詢），和縮圖列表共用同一份快取 */
  previews: Map<number, PixelBuffer>
}>()

const editorStore = useEditorStore()

/**
 * 只把會影響畫面的設定傳給預覽：檔名前綴、邊緣品質不在這裡，
 * 在前綴欄位打字時，才不會每打一個字就把所有卡片的白邊重算一遍
 */
const renderSettings = computed(() => {
  const { exportSize, padding, border, shadow, background } = editorStore.outputSettings
  return { exportSize, padding, border, shadow, background }
})

/** 記住使用者偏好的預覽背景，下次開啟不用重選 */
const backdrop = useStorage<PreviewBackdrop>('sticker-snip:preview-backdrop', 'checker')

// ======== 微調彈窗 ========
const fineTuneId = ref<number | null>(null)
const fineTuneIndex = computed(() => editorStore.selections.findIndex((item) => item.id === fineTuneId.value))
const fineTuneTarget = computed(() => editorStore.selections[fineTuneIndex.value])

/** 調整過的範圍加上標記，使用者回到檢查頁時一眼看出哪些已經處理過 */
function isAdjusted(selection: Selection): boolean {
  return selection.threshold !== DEFAULT_THRESHOLD || selection.manualEdits.length > 0
}

function handleOpenFineTune(id: number): void {
  fineTuneId.value = id
}

function handleCloseFineTune(): void {
  fineTuneId.value = null
}

/** 不要的直接刪：刪錯了回框選頁重框就好，不跳確認視窗打斷節奏 */
function handleRemove(id: number): void {
  editorStore.removeSelection(id)
}
</script>

<template>
  <section class="review-grid flex gap-4 h-full pt-4">
    <!-- ======== 左：預覽卡片 ======== -->
    <div class="flex flex-col flex-1 gap-4 min-w-0">
      <!-- ======== 說明 + 背景切換 ======== -->
      <div class="flex items-center justify-between gap-4">
        <p class="text-sm opacity-70">確認每一張的去背與輸出效果，不滿意的點一下進入微調</p>
        <BackdropToggle v-model="backdrop" />
      </div>

      <!-- ======== 所有結果 ======== -->
      <template v-if="editorStore.selectionCount === 0">
        <p class="review-grid__empty">沒有貼紙了，回上一步重新框選</p>
      </template>
      <ul class="review-grid__list">
        <template v-for="(selection, index) in editorStore.selections" :key="selection.id">
          <li class="review-grid__item">
            <button type="button" class="review-grid__card" @click="handleOpenFineTune(selection.id)">
              <span class="flex items-center justify-between w-full pr-8 text-sm">
                #{{ index + 1 }}
                <template v-if="isAdjusted(selection)">
                  <span class="review-grid__badge">已微調</span>
                </template>
              </span>
              <span class="review-grid__image preview-backdrop" :class="`preview-backdrop--${backdrop}`">
                <!-- 依輸出設定排版後的樣子（外圍淡框是輸出圖片的邊界） -->
                <template v-if="props.previews.get(selection.id)">
                  <OutputPreview :image="props.previews.get(selection.id)!" :settings="renderSettings" />
                </template>
              </span>
            </button>
            <!-- 按鈕裡不能再放按鈕，所以刪除鈕放在卡片旁邊，再用定位疊到右上角 -->
            <button type="button" class="review-grid__remove" :aria-label="`刪除 #${index + 1}`" title="刪除" @click="handleRemove(selection.id)">
              <AppIcon name="trash" />
            </button>
          </li>
        </template>
      </ul>
    </div>

    <!-- ======== 右：輸出設定，調整後左邊的預覽即時反映 ======== -->
    <OutputSettingsPanel class="review-grid__settings" />

    <template v-if="fineTuneTarget">
      <FineTuneDialog
        v-model:backdrop="backdrop"
        :selection="fineTuneTarget"
        :display-number="fineTuneIndex + 1"
        :preview="props.previews.get(fineTuneTarget.id)"
        @close="handleCloseFineTune"
      />
    </template>
  </section>
</template>

<style scoped>
.review-grid {
  .review-grid__settings {
    flex-shrink: 0;
    width: 18rem;
    overflow-y: auto;
  }

  .review-grid__list {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
    gap: 16px;
    overflow-y: auto;
    padding-bottom: 8px;
  }

  .review-grid__empty {
    padding: 48px 0;
    text-align: center;
    opacity: 0.6;
  }

  .review-grid__item {
    position: relative;

    /* 滑鼠移到卡片上才出現，平常不干擾檢查畫面 */
    &:hover .review-grid__remove,
    .review-grid__remove:focus-visible {
      opacity: 1;
    }
  }

  .review-grid__remove {
    position: absolute;
    top: 6px;
    right: 6px;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    color: rgb(220, 38, 38);
    background-color: var(--color-paper);
    border: 1px solid #ddd;
    border-radius: 50%;
    opacity: 0;

    &:hover {
      color: #fff;
      background-color: rgb(220, 38, 38);
      border-color: rgb(220, 38, 38);
    }
  }

  .review-grid__card {
    display: flex;
    flex-direction: column;
    gap: 6px;
    width: 100%;
    padding: 8px;
    border: 2px solid #ddd;
    border-radius: 8px;
    text-align: left;

    &:hover {
      border-color: rgb(37, 99, 235);
    }
  }

  .review-grid__image {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 200px;
  }

  .review-grid__badge {
    padding: 0 6px;
    font-size: 0.75rem;
    color: rgb(234, 88, 12);
    border: 1px solid rgb(234, 88, 12);
    border-radius: 999px;
  }
}
</style>
