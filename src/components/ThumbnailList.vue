<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { useEditorStore } from '@/stores/editor'
import type { PixelBuffer } from '@/lib/pixelBuffer'
import PixelCanvas from '@/components/PixelCanvas.vue'
import AppIcon from '@/components/AppIcon.vue'

const { t } = useI18n()
const props = defineProps<{
  /** 每個範圍的去背結果（以 id 查詢），由 App 統一計算，檢查頁共用同一份快取 */
  previews: Map<number, PixelBuffer>
}>()

const editorStore = useEditorStore()

function handleSelect(id: number): void {
  editorStore.activeSelectionId = id
}

function handleDelete(id: number): void {
  // 畫布監聽同一份 selections，刪除後框線會自動消失，這裡不必另外通知畫布
  editorStore.removeSelection(id)
}
</script>

<template>
  <aside class="thumbnail-list hand-panel flex flex-col min-h-0">
    <h2 class="hand-panel-title">{{ t('thumbnails.title', { count: editorStore.selectionCount }) }}</h2>

    <div class="hand-dots flex flex-col flex-1 gap-2 min-h-0 overflow-y-auto p-2">
      <template v-if="editorStore.selectionCount === 0">
        <p class="thumbnail-list__note text-sm">{{ t('thumbnails.empty') }}</p>
      </template>
      <template v-else>
        <!-- 右鍵刪除沒有任何視覺線索，不提示的話使用者不會知道 -->
        <p class="thumbnail-list__note text-xs">{{ t('thumbnails.rightClickHint') }}</p>
      </template>

      <ul class="flex flex-col gap-2">
        <!-- key 用穩定的 id，畫面編號用 index：刪除時編號遞補，但 Vue 仍認得每一張是誰 -->
        <template v-for="(selection, index) in editorStore.selections" :key="selection.id">
          <li
            class="thumbnail-list__item"
            :class="{ 'thumbnail-list__item--active': selection.id === editorStore.activeSelectionId }"
            @click="handleSelect(selection.id)"
          >
            <!-- ======== 編號 + 偵測到的背景色 ======== -->
            <div class="flex items-center justify-between">
              <span class="text-sm">#{{ index + 1 }}</span>
              <template v-if="selection.backgroundColor">
                <span
                  class="thumbnail-list__swatch"
                  :style="{ backgroundColor: selection.backgroundColor }"
                  :title="t('thumbnails.backgroundColor', { color: selection.backgroundColor })"
                ></span>
              </template>
            </div>

            <!-- ======== 去背結果（棋盤格底代表透明）======== -->
            <div class="thumbnail-list__preview preview-backdrop preview-backdrop--checker flex items-center justify-center">
              <template v-if="props.previews.get(selection.id)">
                <PixelCanvas :image="props.previews.get(selection.id)!" />
              </template>
            </div>

            <button
              type="button"
              class="hand-button justify-center text-sm"
              @click.stop="handleDelete(selection.id)"
            >
              <AppIcon name="trash" :size="14" />{{ t('common.delete') }}
            </button>
          </li>
        </template>
      </ul>
    </div>
  </aside>
</template>

<style scoped>
.thumbnail-list {
  /* 提示文字放在虛線框裡，和參考圖一樣像貼在桌上的便條 */
  .thumbnail-list__note {
    padding: 6px 8px;
    background-color: var(--color-paper);
    border: 2px dashed var(--color-ink);
  }

  .thumbnail-list__item {
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding: 8px;
    background-color: var(--color-paper);
    border: var(--hand-border);
    border-radius: var(--hand-radius);
    cursor: pointer;
  }

  /* 與畫布上高亮框同色，讓使用者一眼對得上：這是功能用的顏色，所以保留 */
  .thumbnail-list__item--active {
    border-color: rgb(234, 88, 12);
    box-shadow: 3px 3px 0 rgb(234, 88, 12);
  }

  .thumbnail-list__swatch {
    width: 16px;
    height: 16px;
    border: var(--hand-border);
    border-radius: 2px;
  }

  .thumbnail-list__preview {
    height: 120px;
  }
}
</style>
