<script setup lang="ts">
import { useEditorStore } from '@/stores/editor'
import type { PixelBuffer } from '@/lib/pixelBuffer'
import PixelCanvas from '@/components/PixelCanvas.vue'

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
  <aside class="thumbnail-list flex flex-col gap-2 h-full overflow-y-auto">
    <h2 class="text-sm opacity-70">範圍（{{ editorStore.selectionCount }}）</h2>

    <template v-if="editorStore.selectionCount === 0">
      <p class="text-sm opacity-60">在右側圖片上拖曳，框出每一張貼紙</p>
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
                :title="`背景色 ${selection.backgroundColor}`"
              ></span>
            </template>
          </div>

          <!-- ======== 去背結果（棋盤格底代表透明）======== -->
          <div class="thumbnail-list__preview preview-backdrop preview-backdrop--checker flex items-center justify-center">
            <template v-if="props.previews.get(selection.id)">
              <PixelCanvas :image="props.previews.get(selection.id)!" />
            </template>
          </div>

          <button type="button" class="thumbnail-list__delete" @click.stop="handleDelete(selection.id)">
            刪除
          </button>
        </li>
      </template>
    </ul>
  </aside>
</template>

<style scoped>
.thumbnail-list {
  .thumbnail-list__item {
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding: 8px;
    border: 2px solid #ddd;
    border-radius: 8px;
    cursor: pointer;
  }

  /* 與畫布上高亮框同色，讓使用者一眼對得上 */
  .thumbnail-list__item--active {
    border-color: rgb(234, 88, 12);
  }

  .thumbnail-list__swatch {
    width: 16px;
    height: 16px;
    border: 1px solid #999;
    border-radius: 4px;
  }

  .thumbnail-list__preview {
    height: 120px;
  }

  .thumbnail-list__delete {
    padding: 2px 0;
    font-size: 0.875rem;
    color: #b91c1c;
    border: 1px solid #fca5a5;
    border-radius: 4px;

    &:hover {
      background-color: #fef2f2;
    }
  }
}
</style>
