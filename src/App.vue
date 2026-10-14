<script setup lang="ts">
import { computed } from 'vue'
import { useNotify } from '@pieda/core'
import { useI18n } from 'vue-i18n'
import { useEditorStore } from '@/stores/editor'
import ImageDropzone from '@/components/ImageDropzone.vue'
import AppIcon from '@/components/AppIcon.vue'
import LocaleToggle from '@/components/LocaleToggle.vue'
import HandDrawnFilter from '@/components/HandDrawnFilter.vue'
import HelpDialog from '@/components/HelpDialog.vue'
import { useHelpDialog } from '@/composables/useHelpDialog'
import { useInAppBrowser } from '@/composables/useInAppBrowser'
import OpenInBrowserDialog from '@/components/OpenInBrowserDialog.vue'
import EditorCanvas from '@/components/EditorCanvas.vue'
import ThumbnailList from '@/components/ThumbnailList.vue'
import ReviewGrid from '@/components/ReviewGrid.vue'
import SelectToolbar from '@/components/SelectToolbar.vue'
import { useExport } from '@/composables/useExport'
import { useSelectionPreviews } from '@/composables/useSelectionPreviews'
import { useOutputSettingsSheet } from '@/composables/useOutputSettingsSheet'

const { t } = useI18n()
const $notify = useNotify()
const editorStore = useEditorStore()
const { isExporting, exportedCount, exportStickers } = useExport()
/**
 * 去背預覽在這裡建立一次，再傳給縮圖列表與檢查頁：
 * 兩邊各自建立的話，切換階段時會把所有範圍重算一遍。
 */
const { previews } = useSelectionPreviews()
/** 手機版：輸出設定收在底部面板，按鈕在操作列 */
const outputSettingsSheet = useOutputSettingsSheet()
/** 使用說明：第一次打開網站時自動顯示教學，之後從頂列的 ? 打開 */
const help = useHelpDialog()
/** 從 LINE、Facebook 等 App 開啟時，先引導改用瀏覽器；處理完才顯示第一次使用的教學 */
const inAppBrowser = useInAppBrowser(help.openGuideOnFirstVisit)

function handleOpenHelp(): void {
  help.open('guide')
}

/** 只有一張時直接下載 PNG，按鈕文字跟著說清楚會拿到什麼 */
const exportLabel = computed(() => {
  const count = editorStore.selectionCount
  if (isExporting.value) return t('app.exporting', { done: exportedCount.value, total: count })
  return count === 1 ? t('app.downloadPng') : t('app.downloadZip', { count })
})

function handleEnterReview(): void {
  editorStore.stage = 'review'
}

function handleBackToSelect(): void {
  outputSettingsSheet.close()
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
  <!--
    整個工具像一扇擺在灰色桌面上的視窗：粗黑框＋錯位陰影。
    用 grid 排版：同一份操作按鈕，電腦版放在頂列右側，手機版放到最下方（大拇指搆得到），不必寫兩份
  -->
  <main class="app-shell hand-panel">
    <!-- ======== 頂列：標題、語言 ======== -->
    <header class="app-shell__title flex items-center justify-between gap-4 px-4 py-3">
      <h1 class="text-xl">{{ t('app.title') }}</h1>
      <div class="flex items-center gap-2">
        <button type="button" class="hand-button app-shell__help" :aria-label="t('help.button')" :title="t('help.button')" @click="handleOpenHelp">
          <AppIcon name="help" />
        </button>
        <LocaleToggle />
      </div>
    </header>

    <!-- ======== 操作按鈕：依階段切換 ======== -->
    <nav class="app-shell__actions flex items-center gap-2 px-4 py-3" :class="{ 'max-md:hidden': !editorStore.hasImage }">
      <template v-if="editorStore.hasImage && editorStore.stage === 'select'">
        <button type="button" class="hand-button" @click="handleReupload">
          <AppIcon name="upload" />{{ t('app.reupload') }}
        </button>
        <button
          type="button"
          class="app-shell__primary hand-button hand-button--primary"
          :disabled="editorStore.selectionCount === 0"
          @click="handleEnterReview"
        >
          {{ t('app.preview', { count: editorStore.selectionCount }, editorStore.selectionCount) }}<AppIcon name="arrowRight" />
        </button>
      </template>
      <template v-if="editorStore.hasImage && editorStore.stage === 'review'">
        <!-- 手機上三顆按鈕擠一列，返回只留箭頭 -->
        <button type="button" class="hand-button" :aria-label="t('app.backToSelect')" @click="handleBackToSelect">
          <AppIcon name="arrowLeft" /><span class="max-md:hidden">{{ t('app.backToSelect') }}</span>
        </button>
        <button
          type="button"
          class="hand-button md:hidden"
          :aria-pressed="outputSettingsSheet.isOpen.value"
          @click="outputSettingsSheet.toggle"
        >
          <AppIcon name="sliders" />{{ t('app.outputSettings') }}
        </button>
        <button
          type="button"
          class="app-shell__primary hand-button hand-button--primary"
          :disabled="isExporting || editorStore.selectionCount === 0"
          @click="exportStickers"
        >
          <AppIcon name="download" />{{ exportLabel }}
        </button>
      </template>
    </nav>

    <!-- ======== 主工作區：上傳 → 框選 → 檢查 ======== -->
    <section class="app-shell__workspace hand-dots flex min-h-0 min-w-0 gap-4 px-4 pb-4">
      <template v-if="!editorStore.hasImage">
        <ImageDropzone class="flex-1" />
      </template>
      <template v-else-if="editorStore.stage === 'select'">
        <!-- 電腦：縮圖在左側一欄；手機：縮圖改成畫布下方的橫條 -->
        <ThumbnailList class="shrink-0 max-md:order-last md:w-56 md:mt-4" :previews="previews" />
        <!-- min-w-0／min-h-0：讓畫布區可以比內容小，縮放視窗時才不會被 canvas 撐住 -->
        <div class="flex flex-col flex-1 min-w-0 min-h-0">
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

    <template v-if="help.isOpen.value">
      <HelpDialog />
    </template>
    <template v-if="inAppBrowser.isNoticeOpen.value">
      <OpenInBrowserDialog :platform="inAppBrowser.platform" @close="inAppBrowser.closeNotice" />
    </template>

    <!-- 圖示的手繪抖動濾鏡，全站共用一份 -->
    <HandDrawnFilter />
  </main>
</template>

<style scoped>
.app-shell {
  display: grid;
  grid-template-columns: 1fr auto;
  grid-template-rows: auto minmax(0, 1fr);
  grid-template-areas:
    'title actions'
    'workspace workspace';
  /* 四周的桌面留白在 #app 的 padding（見 style.css） */
  height: 100%;
  box-shadow: 6px 6px 0 var(--color-ink);

  .app-shell__title {
    grid-area: title;
    border-bottom: 3px solid var(--color-ink);
  }

  /* 只有圖示的按鈕：左右內距縮小，跟語言切換一樣高 */
  .app-shell__help {
    padding: 2px 6px;
  }

  .app-shell__actions {
    grid-area: actions;
    border-bottom: 3px solid var(--color-ink);
  }

  .app-shell__workspace {
    grid-area: workspace;
  }

  /*
   * 手機：畫面全部給內容（不留桌面、不要陰影），操作按鈕移到最下方。
   * 斷點和 Tailwind 的 md（768px）一致，元件裡的 md:／max-md: class 才會同步切換
   */
  @media (max-width: 767px) {
    grid-template-columns: minmax(0, 1fr);
    grid-template-rows: auto minmax(0, 1fr) auto;
    grid-template-areas:
      'title'
      'workspace'
      'actions';
    border: none;
    box-shadow: none;

    .app-shell__workspace {
      flex-direction: column;
      gap: 8px;
      padding: 0 8px 8px;
    }

    .app-shell__actions {
      border-top: 3px solid var(--color-ink);
      border-bottom: none;
    }

    /* 主要按鈕佔滿剩下的寬度，最好按 */
    .app-shell__primary {
      flex: 1;
      justify-content: center;
    }
  }
}
</style>
