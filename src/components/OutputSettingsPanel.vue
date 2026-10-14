<script setup lang="ts">
import { computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useEditorStore } from '@/stores/editor'
import { EXPORT_SIZES, type ExportSize } from '@/lib/composeOutput'
import { buildFileName } from '@/lib/fileNaming'
import type { EdgeQuality } from '@/lib/refineEdges'
import BorderControls from '@/components/BorderControls.vue'
import ShadowControls from '@/components/ShadowControls.vue'
import BackgroundControls from '@/components/BackgroundControls.vue'
import AppIcon from '@/components/AppIcon.vue'

/**
 * 輸出設定（需求 4.2）：檔名前綴、輸出尺寸、邊距、邊緣品質，以及白邊等輸出效果。
 * 放在檢查頁右側而不是上傳後：這些只影響最後的輸出，框選時用不到；
 * 在檢查頁調整，左邊的預覽卡片會即時反映結果。
 */

/** 邊距滑桿上限（px）；正方形輸出時還會再受「邊長一半」限制 */
const MAX_PADDING = 64
/** 檔名前綴最多幾個字：太長的檔名在檔案總管裡不好讀，也會讓範例檔名把版面撐開 */
const MAX_PREFIX_LENGTH = 10

/** 名稱與說明在翻譯檔 outputSettings.edgeQualities.<value> */
const EDGE_QUALITIES: EdgeQuality[] = ['pixel', 'smooth', 'ultra']

const { t } = useI18n()
const emit = defineEmits<{
  /** 手機版的底部面板按了關閉（電腦版的設定欄一直顯示，不會有關閉按鈕） */
  close: []
}>()

function handleClose(): void {
  emit('close')
}
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
  return size === 'original' ? t('outputSettings.originalSize') : `${size} × ${size}`
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
  <aside class="output-settings-panel hand-panel flex flex-col min-h-0" :aria-label="t('outputSettings.title')">
    <header class="output-settings-panel__title hand-panel-title">
      <h2>{{ t('outputSettings.title') }}</h2>
      <button type="button" class="output-settings-panel__close" :aria-label="t('common.close')" @click="handleClose">
        <AppIcon name="close" :size="18" />
      </button>
    </header>

    <!-- 標題列固定，設定多到放不下時只捲動下面的內容 -->
    <div class="flex flex-col gap-3 min-h-0 overflow-y-auto p-3">
      <!-- ======== 基本設定 ======== -->
      <div class="flex flex-col gap-1">
        <label class="output-settings-panel__row">
          <span>{{ t('outputSettings.filePrefix') }}</span>
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
        <span>{{ t('outputSettings.exportSize') }}</span>
        <select class="output-settings-panel__input" :value="settings.exportSize" @change="handleSizeChange">
          <template v-for="size in EXPORT_SIZES" :key="size">
            <option :value="size">{{ sizeLabel(size) }}</option>
          </template>
        </select>
      </label>

      <label class="output-settings-panel__row">
        <span>{{ t('outputSettings.padding') }}</span>
        <input type="range" min="0" :max="paddingMax" step="1" :value="settings.padding" @input="handlePaddingInput" />
        <span class="w-12 text-right">{{ settings.padding }} px</span>
      </label>

      <label class="output-settings-panel__row">
        <span>{{ t('outputSettings.edgeQuality') }}</span>
        <select class="output-settings-panel__input" :value="settings.edgeQuality" @change="handleEdgeQualityChange">
          <template v-for="quality in EDGE_QUALITIES" :key="quality">
            <option :value="quality" :title="t(`outputSettings.edgeQualities.${quality}.hint`)">
              {{ t(`outputSettings.edgeQualities.${quality}.label`) }}
            </option>
          </template>
        </select>
      </label>

      <!-- ======== 輸出效果 ======== -->
      <BorderControls />
      <ShadowControls />
      <BackgroundControls />
    </div>
  </aside>
</template>

<style scoped>
.output-settings-panel {
  .output-settings-panel__title {
    position: relative;
    flex-shrink: 0;
  }

  /* 疊在標題列右側，標題文字維持置中 */
  .output-settings-panel__close {
    position: absolute;
    top: 50%;
    right: 8px;
    display: flex;
    transform: translateY(-50%);

    /* 電腦版設定欄一直顯示，不需要關閉鈕（不用 md:hidden：會被上面的 display: flex 蓋過） */
    @media (min-width: 768px) {
      display: none;
    }
  }

  /* 標籤、控制項、數值三欄對齊；select 與文字框跨過數值欄 */
  .output-settings-panel__row {
    display: grid;
    grid-template-columns: 4.5rem 1fr auto;
    align-items: center;
    gap: 8px;
    font-size: 0.875rem;
  }

  /* 外框樣式由全站的手繪表單元件提供，這裡只管排版 */
  .output-settings-panel__input {
    grid-column: span 2;
    min-width: 0;
    padding: 2px 6px;
  }

  .output-settings-panel__example {
    padding-left: calc(4.5rem + 8px);
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
  }
}
</style>
