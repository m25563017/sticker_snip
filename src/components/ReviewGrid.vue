<script setup lang="ts">
import { computed, ref } from 'vue'
import { useStorage } from '@vueuse/core'
import { useEditorStore } from '@/stores/editor'
import type { PixelBuffer } from '@/lib/pixelBuffer'
import { DEFAULT_THRESHOLD, type Selection } from '@/types/selection'
import type { PreviewBackdrop } from '@/types/preview'
import PixelCanvas from '@/components/PixelCanvas.vue'
import BackdropToggle from '@/components/BackdropToggle.vue'
import FineTuneDialog from '@/components/FineTuneDialog.vue'

const props = defineProps<{
  /** 每個範圍的去背結果（以 id 查詢），和縮圖列表共用同一份快取 */
  previews: Map<number, PixelBuffer>
}>()

const editorStore = useEditorStore()

/** 記住使用者偏好的預覽背景，下次開啟不用重選 */
const backdrop = useStorage<PreviewBackdrop>('sticker-snip:preview-backdrop', 'checker')

// ======== 微調彈窗 ========
const fineTuneId = ref<number | null>(null)
const fineTuneIndex = computed(() => editorStore.selections.findIndex((item) => item.id === fineTuneId.value))
const fineTuneTarget = computed(() => editorStore.selections[fineTuneIndex.value])

/** 調整過的範圍加上標記，使用者回到檢查頁時一眼看出哪些已經處理過 */
function isAdjusted(selection: Selection): boolean {
  return (
    selection.isManualColor || selection.threshold !== DEFAULT_THRESHOLD || selection.removalSeeds.length > 0
  )
}

function handleOpenFineTune(id: number): void {
  fineTuneId.value = id
}

function handleCloseFineTune(): void {
  fineTuneId.value = null
}
</script>

<template>
  <section class="review-grid flex flex-col gap-4 h-full">
    <!-- ======== 說明 + 背景切換 ======== -->
    <div class="flex items-center justify-between gap-4 pt-4">
      <p class="text-sm opacity-70">確認每一張的去背效果，不滿意的點一下進入微調</p>
      <BackdropToggle v-model="backdrop" />
    </div>

    <!-- ======== 所有結果 ======== -->
    <ul class="review-grid__list">
      <template v-for="(selection, index) in editorStore.selections" :key="selection.id">
        <li>
          <button type="button" class="review-grid__card" @click="handleOpenFineTune(selection.id)">
            <span class="flex items-center justify-between w-full text-sm">
              #{{ index + 1 }}
              <template v-if="isAdjusted(selection)">
                <span class="review-grid__badge">已微調</span>
              </template>
            </span>
            <span class="review-grid__image preview-backdrop" :class="`preview-backdrop--${backdrop}`">
              <template v-if="props.previews.get(selection.id)">
                <PixelCanvas :image="props.previews.get(selection.id)!" fit="contain" />
              </template>
            </span>
          </button>
        </li>
      </template>
    </ul>

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
  .review-grid__list {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
    gap: 16px;
    overflow-y: auto;
    padding-bottom: 8px;
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
    display: block;
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
