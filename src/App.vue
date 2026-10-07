<script setup lang="ts">
import { useEditorStore } from '@/stores/editor'
import ImageDropzone from '@/components/ImageDropzone.vue'
import EditorCanvas from '@/components/EditorCanvas.vue'
import ThumbnailList from '@/components/ThumbnailList.vue'
import ReviewGrid from '@/components/ReviewGrid.vue'
import { useExport } from '@/composables/useExport'
import { useSelectionPreviews } from '@/composables/useSelectionPreviews'

const editorStore = useEditorStore()
const { isExporting, exportZip } = useExport()
/**
 * 去背預覽在這裡建立一次，再傳給縮圖列表與檢查頁：
 * 兩邊各自建立的話，切換階段時會把所有範圍重算一遍。
 */
const { previews } = useSelectionPreviews()

function handleEnterReview(): void {
  editorStore.stage = 'review'
}

function handleBackToSelect(): void {
  editorStore.stage = 'select'
}
</script>

<template>
  <main class="app-shell flex flex-col h-screen">
    <!-- ======== 頂列：依階段切換操作按鈕 ======== -->
    <header class="app-shell__header flex items-center justify-between px-4 py-3">
      <h1 class="text-xl">貼紙裁切去背工具</h1>
      <template v-if="editorStore.hasImage && editorStore.stage === 'select'">
        <button
          type="button"
          class="app-shell__primary"
          :disabled="editorStore.selectionCount === 0"
          @click="handleEnterReview"
        >
          預覽結果（{{ editorStore.selectionCount }} 張）
        </button>
      </template>
      <template v-if="editorStore.hasImage && editorStore.stage === 'review'">
        <div class="flex items-center gap-2">
          <button type="button" class="app-shell__secondary" @click="handleBackToSelect">返回框選</button>
          <button type="button" class="app-shell__primary" :disabled="isExporting" @click="exportZip">
            {{ isExporting ? '打包中…' : `下載 zip（${editorStore.selectionCount} 張）` }}
          </button>
        </div>
      </template>
    </header>

    <!-- ======== 主工作區：上傳 → 框選 → 檢查 ======== -->
    <section class="app-shell__workspace flex flex-1 gap-4 min-h-0 px-4 pb-4">
      <template v-if="!editorStore.hasImage">
        <ImageDropzone class="flex-1" />
      </template>
      <template v-else-if="editorStore.stage === 'select'">
        <ThumbnailList class="w-56 shrink-0 pt-4" :previews="previews" />
        <!-- min-w-0：讓畫布區可以比內容窄，縮放視窗時才不會被 canvas 撐住 -->
        <div class="flex-1 min-w-0">
          <EditorCanvas />
        </div>
      </template>
      <template v-else>
        <ReviewGrid class="flex-1 min-w-0" :previews="previews" />
      </template>
    </section>
  </main>
</template>

<style scoped>
.app-shell {
  .app-shell__header {
    border-bottom: 1px solid #ddd;
  }

  .app-shell__primary {
    padding: 6px 14px;
    color: #fff;
    background-color: rgb(37, 99, 235);
    border-radius: 6px;

    &:hover:not(:disabled) {
      background-color: rgb(29, 78, 216);
    }

    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  }

  .app-shell__secondary {
    padding: 6px 14px;
    border: 1px solid #999;
    border-radius: 6px;

    &:hover {
      background-color: rgba(0, 0, 0, 0.05);
    }
  }
}
</style>
