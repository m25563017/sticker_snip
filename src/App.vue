<script setup lang="ts">
import { computed } from 'vue'
import { useNotify } from '@pieda/core'
import { useI18n } from 'vue-i18n'
import { useEditorStore } from '@/stores/editor'
import ImageDropzone from '@/components/ImageDropzone.vue'
import AppIcon from '@/components/AppIcon.vue'
import LocaleToggle from '@/components/LocaleToggle.vue'
import HandDrawnFilter from '@/components/HandDrawnFilter.vue'
import EditorCanvas from '@/components/EditorCanvas.vue'
import ThumbnailList from '@/components/ThumbnailList.vue'
import ReviewGrid from '@/components/ReviewGrid.vue'
import SelectToolbar from '@/components/SelectToolbar.vue'
import { useExport } from '@/composables/useExport'
import { useSelectionPreviews } from '@/composables/useSelectionPreviews'

const { t } = useI18n()
const $notify = useNotify()
const editorStore = useEditorStore()
const { isExporting, exportStickers } = useExport()
/**
 * 去背預覽在這裡建立一次，再傳給縮圖列表與檢查頁：
 * 兩邊各自建立的話，切換階段時會把所有範圍重算一遍。
 */
const { previews } = useSelectionPreviews()

/** 只有一張時直接下載 PNG，按鈕文字跟著說清楚會拿到什麼 */
const exportLabel = computed(() => {
  if (isExporting.value) return t('app.exporting')
  const count = editorStore.selectionCount
  return count === 1 ? t('app.downloadPng') : t('app.downloadZip', { count })
})

function handleEnterReview(): void {
  editorStore.stage = 'review'
}

function handleBackToSelect(): void {
  editorStore.stage = 'select'
}

/** 已經有範圍時先確認：重新上傳會清掉所有框，包含手動補畫與微調的結果 */
async function handleReupload(): Promise<void> {
  if (editorStore.selectionCount > 0) {
    const result = await $notify.alert({
      title: t('app.reuploadConfirm.title'),
      message: t('app.reuploadConfirm.message'),
      variant: 'warning',
      confirm: true,
      // @pieda/core 的按鈕文字固定，要自己傳才會跟著語言切換
      confirmButtonText: t('common.ok'),
      cancelButtonText: t('common.cancel'),
    })
    if (!result.isConfirmed) return
  }
  editorStore.reset()
}
</script>

<template>
  <!-- 整個工具像一扇擺在灰色桌面上的視窗：粗黑框＋錯位陰影 -->
  <main class="app-shell hand-panel flex flex-col">
    <!-- ======== 頂列 ======== -->
    <header class="app-shell__header flex items-center justify-between px-4 py-3">
      <h1 class="text-xl">{{ t('app.title') }}</h1>
      <!-- 右側：依階段切換的操作按鈕 + 語言切換（每個階段都在） -->
      <div class="flex items-center gap-4">
        <template v-if="editorStore.hasImage && editorStore.stage === 'select'">
          <div class="flex items-center gap-2">
            <button type="button" class="hand-button" @click="handleReupload">
              <AppIcon name="upload" />{{ t('app.reupload') }}
            </button>
            <button
              type="button"
              class="hand-button hand-button--primary"
              :disabled="editorStore.selectionCount === 0"
              @click="handleEnterReview"
            >
              {{ t('app.preview', { count: editorStore.selectionCount }, editorStore.selectionCount) }}<AppIcon name="arrowRight" />
            </button>
          </div>
        </template>
        <template v-if="editorStore.hasImage && editorStore.stage === 'review'">
          <div class="flex items-center gap-2">
            <button type="button" class="hand-button" @click="handleBackToSelect">
              <AppIcon name="arrowLeft" />{{ t('app.backToSelect') }}
            </button>
            <button type="button" class="hand-button hand-button--primary" :disabled="isExporting || editorStore.selectionCount === 0" @click="exportStickers">
              <AppIcon name="download" />{{ exportLabel }}
            </button>
          </div>
        </template>
        <LocaleToggle />
      </div>
    </header>

    <!-- ======== 主工作區：上傳 → 框選 → 檢查 ======== -->
    <section class="app-shell__workspace hand-dots flex flex-1 gap-4 min-h-0 px-4 pb-4">
      <template v-if="!editorStore.hasImage">
        <ImageDropzone class="flex-1" />
      </template>
      <template v-else-if="editorStore.stage === 'select'">
        <ThumbnailList class="w-56 shrink-0 mt-4" :previews="previews" />
        <!-- min-w-0／min-h-0：讓畫布區可以比內容小，縮放視窗時才不會被 canvas 撐住 -->
        <div class="flex flex-col flex-1 min-w-0">
          <SelectToolbar />
          <div class="flex-1 min-h-0">
            <EditorCanvas />
          </div>
        </div>
      </template>
      <template v-else>
        <ReviewGrid class="flex-1 min-w-0" :previews="previews" />
      </template>
    </section>

    <!-- 圖示的手繪抖動濾鏡，全站共用一份 -->
    <HandDrawnFilter />
  </main>
</template>

<style scoped>
.app-shell {
  /* 四周留出桌面，右下多留一點給陰影 */
  height: calc(100% - 28px);
  margin: 10px 18px 18px 10px;
  box-shadow: 6px 6px 0 var(--color-ink);

  .app-shell__header {
    border-bottom: 3px solid var(--color-ink);
  }
}
</style>
