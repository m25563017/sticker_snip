<script setup lang="ts">
import { computed, watch } from 'vue'
import { useEditorStore } from '@/stores/editor'
import { EXPORT_SIZES, type ExportSize } from '@/lib/composeOutput'
import { buildFileName } from '@/lib/fileNaming'
import type { EdgeQuality } from '@/lib/refineEdges'

/**
 * 輸出設定（需求 4.2）：檔名前綴、輸出尺寸、邊距、邊緣品質。
 * 放在檢查頁而不是上傳後：這些只影響最後的輸出，框選時用不到；
 * 在檢查頁調整，下面的預覽卡片會即時反映結果。
 */

/** 邊距滑桿上限（px）；正方形輸出時還會再受「邊長一半」限制 */
const MAX_PADDING = 64
/** 檔名前綴最多幾個字：太長的檔名在檔案總管裡不好讀，也會讓範例檔名把版面撐開 */
const MAX_PREFIX_LENGTH = 10

const EDGE_QUALITY_OPTIONS: { value: EdgeQuality; label: string; hint: string }[] = [
  { value: 'pixel', label: '硬邊', hint: '不處理邊緣，適合像素風格的素材' },
  { value: 'smooth', label: '平滑', hint: '去除邊緣混入的背景色（建議）' },
  { value: 'ultra', label: '超平滑', hint: '處理範圍更寬，並把鋸齒羽化' },
]

const editorStore = useEditorStore()
const settings = computed(() => editorStore.outputSettings)

const fileNameExample = computed(() =>
  buildFileName(settings.value.filePrefix, 0, Math.max(1, editorStore.selectionCount)),
)

const paddingMax = computed(() => {
  const size = settings.value.exportSize
  return size === 'original' ? MAX_PADDING : Math.min(MAX_PADDING, size / 2 - 1)
})

// 換成較小的輸出尺寸時，邊距可能超過新的上限，順手夾回範圍內
watch(paddingMax, (max) => {
  if (settings.value.padding > max) editorStore.outputSettings.padding = max
})

function sizeLabel(size: ExportSize): string {
  return size === 'original' ? '原尺寸（不縮放）' : `${size} × ${size}`
}

/**
 * 除了 input 的 maxlength 再截一次：maxlength 擋得住打字，
 * 但輸入法組字、或瀏覽器裡存著舊版沒有限制時的長前綴，仍可能超過。
 */
function handlePrefixInput(event: Event): void {
  editorStore.outputSettings.filePrefix = (event.target as HTMLInputElement).value.slice(0, MAX_PREFIX_LENGTH)
}

function handleSizeChange(event: Event): void {
  const value = (event.target as HTMLSelectElement).value
  editorStore.outputSettings.exportSize = value === 'original' ? 'original' : (Number(value) as ExportSize)
}

function handlePaddingInput(event: Event): void {
  editorStore.outputSettings.padding = Number((event.target as HTMLInputElement).value)
}

function handleEdgeQualityChange(event: Event): void {
  editorStore.outputSettings.edgeQuality = (event.target as HTMLSelectElement).value as EdgeQuality
}
</script>

<template>
  <section class="output-settings-panel flex flex-wrap items-center gap-x-6 gap-y-2" aria-label="輸出設定">
    <label class="flex items-center gap-2 text-sm">
      檔名前綴
      <input
        type="text"
        class="output-settings-panel__input output-settings-panel__prefix"
        :maxlength="MAX_PREFIX_LENGTH"
        :value="settings.filePrefix"
        @input="handlePrefixInput"
      />
      <!-- 固定寬度：範例檔名長短不一，不固定的話後面的設定會跟著左右跳動 -->
      <span class="output-settings-panel__example opacity-60" :title="fileNameExample">→ {{ fileNameExample }}</span>
    </label>

    <label class="flex items-center gap-2 text-sm">
      輸出尺寸
      <select class="output-settings-panel__input" :value="settings.exportSize" @change="handleSizeChange">
        <template v-for="size in EXPORT_SIZES" :key="size">
          <option :value="size">{{ sizeLabel(size) }}</option>
        </template>
      </select>
    </label>

    <label class="flex items-center gap-2 text-sm">
      邊距
      <input type="range" min="0" :max="paddingMax" step="1" :value="settings.padding" @input="handlePaddingInput" />
      <span class="w-12">{{ settings.padding }} px</span>
    </label>

    <label class="flex items-center gap-2 text-sm">
      邊緣品質
      <select class="output-settings-panel__input" :value="settings.edgeQuality" @change="handleEdgeQualityChange">
        <template v-for="option in EDGE_QUALITY_OPTIONS" :key="option.value">
          <option :value="option.value" :title="option.hint">{{ option.label }}</option>
        </template>
      </select>
    </label>
  </section>
</template>

<style scoped>
.output-settings-panel {
  padding: 10px 12px;
  border: 1px solid #ddd;
  border-radius: 8px;

  .output-settings-panel__input {
    padding: 2px 6px;
    border: 1px solid #999;
    border-radius: 4px;
    background-color: #fff;
  }

  .output-settings-panel__prefix {
    width: 8rem;
  }

  /* 剛好放得下 10 個全形字的前綴 + 流水號；萬一更長就用「…」省略，滑鼠停上去看完整檔名 */
  .output-settings-panel__example {
    width: 14rem;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
  }
}
</style>
