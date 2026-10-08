import { ref } from 'vue'
import JSZip from 'jszip'
import { useNotify } from '@pieda/core'
import { useEditorStore } from '@/stores/editor'
import { pixelBufferToPngBlob } from '@/lib/canvas'
import { trimTransparent } from '@/lib/composeOutput'
import { renderOutput } from '@/lib/renderOutput'
import { buildFileName } from '@/lib/fileNaming'
import { processSelection } from '@/lib/processSelection'

const ZIP_FILE_NAME = 'stickers.zip'

/**
 * 用一個暫時的 <a download> 觸發瀏覽器下載。
 * 網頁不能直接寫檔案到使用者電腦，只能「假裝點了一個下載連結」。
 */
function triggerDownload(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  link.click()
  // 立刻釋放可能讓部分瀏覽器來不及開始下載，延後一點再收回這段記憶體
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/**
 * 匯出流程：每個範圍依畫面順序去背 → 依輸出設定排版與加上效果 → 轉 PNG → 下載。
 * 只有一張時直接下載 PNG：只為了一張圖還要解壓縮，多一個沒必要的步驟；兩張以上才打包成 zip。
 * 去背走和縮圖相同的 processSelection，確保下載結果與預覽一致。
 */
export function useExport() {
  const $notify = useNotify()
  const editorStore = useEditorStore()
  const isExporting = ref(false)

  async function exportStickers(): Promise<void> {
    const source = editorStore.sourcePixels
    const selections = editorStore.selections
    if (!source || selections.length === 0) {
      $notify.alert({
        title: '沒有可匯出的範圍',
        message: '請先在圖片上拖曳，框選至少一張貼紙。',
        variant: 'warning',
      })
      return
    }

    isExporting.value = true
    try {
      const { filePrefix, edgeQuality } = editorStore.outputSettings
      const files: { name: string; png: Blob }[] = []

      for (const [index, selection] of selections.entries()) {
        // 和檢查頁預覽走同一套排版，下載到的構圖就是預覽看到的
        const content = trimTransparent(processSelection(source, selection, edgeQuality))
        const png = await pixelBufferToPngBlob(renderOutput(content, editorStore.outputSettings))
        files.push({ name: buildFileName(filePrefix, index, selections.length), png })
      }

      if (files.length === 1) {
        triggerDownload(files[0].png, files[0].name)
        return
      }
      const zip = new JSZip()
      for (const file of files) zip.file(file.name, file.png)
      triggerDownload(await zip.generateAsync({ type: 'blob' }), ZIP_FILE_NAME)
    } catch {
      $notify.alert({
        title: '匯出失敗',
        message: '產生圖片時發生錯誤，請重新整理頁面後再試一次。',
        variant: 'error',
      })
    } finally {
      isExporting.value = false
    }
  }

  return { isExporting, exportStickers }
}
