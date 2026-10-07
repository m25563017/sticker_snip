<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useDebounceFn } from '@vueuse/core'
import { useEditorStore } from '@/stores/editor'
import { defaultMergeDistance } from '@/lib/detectStickers'

/** 拖動滑桿時等手停下才重新偵測：偵測加上重算所有縮圖，大圖要一兩百 ms */
const REDETECT_DEBOUNCE_MS = 200
/** 滑桿上限為預設值的幾倍：再大通常整張圖都黏成一塊，沒有實用價值 */
const MAX_DISTANCE_MULTIPLIER = 3

const editorStore = useEditorStore()

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
</script>

<template>
  <div class="detect-toolbar flex flex-wrap items-center gap-x-4 gap-y-1 py-2">
    <span class="text-sm">自動偵測到 {{ autoCount }} 張</span>

    <label class="flex items-center gap-2">
      <span class="text-sm">合併距離</span>
      <input type="range" min="0" :max="maxDistance" step="1" :value="distanceDraft" @input="handleDistanceInput" />
      <span class="text-sm w-12">{{ distanceDraft }} px</span>
    </label>

    <button type="button" class="detect-toolbar__button" @click="handleRedetect">重新偵測</button>

    <p class="w-full text-xs opacity-60">
      兩張貼紙被框在一起就調小；旁邊的小裝飾被拆成另一張就調大。重新偵測只會替換自動的框，手動畫的會保留
    </p>
  </div>
</template>

<style scoped>
.detect-toolbar {
  .detect-toolbar__button {
    padding: 2px 10px;
    font-size: 0.875rem;
    border: 1px solid #999;
    border-radius: 6px;

    &:hover {
      background-color: rgba(0, 0, 0, 0.05);
    }
  }
}
</style>
