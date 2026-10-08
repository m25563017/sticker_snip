<script setup lang="ts">
import { computed, watch } from 'vue'
import { useEditorStore } from '@/stores/editor'
import { EXPORT_SIZES, type ExportSize } from '@/lib/composeOutput'
import { buildFileName } from '@/lib/fileNaming'
import type { EdgeQuality } from '@/lib/refineEdges'
import BorderControls from '@/components/BorderControls.vue'
import ShadowControls from '@/components/ShadowControls.vue'

/**
 * 輸出設定（需求 4.2）：檔名前綴、輸出尺寸、邊距、邊緣品質，以及白邊等輸出效果。
 * 放在檢查頁右側而不是上傳後：這些只影響最後的輸出，框選時用不到；
 * 在檢查頁調整，左邊的預覽卡片會即時反映結果。
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
  <aside class="output-settings-panel flex flex-col gap-3" aria-label="輸出設定">
    <h2 class="text-sm opacity-70">輸出設定</h2>

    <!-- ======== 基本設定 ======== -->
    <div class="flex flex-col gap-1">
      <label class="output-settings-panel__row">
        <span>檔名前綴</span>
        <input
          type="text"
          class="output-settings-panel__input"
          :maxlength="MAX_PREFIX_LENGTH"
          :value="settings.filePrefix"
          @input="handlePrefixInput"
        />
      </label>
      <!-- 固定寬度並以「…」省略：範例檔名長短不一，不固定的話版面會跟著跳動 -->
      <span class="output-settings-panel__example text-xs opacity-60" :title="fileNameExample">
        → {{ fileNameExample }}
      </span>
    </div>

    <label class="output-settings-panel__row">
      <span>輸出尺寸</span>
      <select class="output-settings-panel__input" :value="settings.exportSize" @change="handleSizeChange">
        <template v-for="size in EXPORT_SIZES" :key="size">
          <option :value="size">{{ sizeLabel(size) }}</option>
        </template>
      </select>
    </label>

    <label class="output-settings-panel__row">
      <span>邊距</span>
      <input type="range" min="0" :max="paddingMax" step="1" :value="settings.padding" @input="handlePaddingInput" />
      <span class="w-12 text-right">{{ settings.padding }} px</span>
    </label>

    <label class="output-settings-panel__row">
      <span>邊緣品質</span>
      <select class="output-settings-panel__input" :value="settings.edgeQuality" @change="handleEdgeQualityChange">
        <template v-for="option in EDGE_QUALITY_OPTIONS" :key="option.value">
          <option :value="option.value" :title="option.hint">{{ option.label }}</option>
        </template>
      </select>
    </label>

    <!-- ======== 輸出效果 ======== -->
    <BorderControls />
    <ShadowControls />
  </aside>
</template>

<style scoped>
.output-settings-panel {
  padding: 12px;
  border: 1px solid #ddd;
  border-radius: 8px;

  /* 標籤、控制項、數值三欄對齊；select 與文字框跨過數值欄 */
  .output-settings-panel__row {
    display: grid;
    grid-template-columns: 4.5rem 1fr auto;
    align-items: center;
    gap: 8px;
    font-size: 0.875rem;
  }

  .output-settings-panel__input {
    grid-column: span 2;
    min-width: 0;
    padding: 2px 6px;
    border: 1px solid #999;
    border-radius: 4px;
    background-color: #fff;
  }

  .output-settings-panel__example {
    padding-left: calc(4.5rem + 8px);
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
  }
}
</style>
