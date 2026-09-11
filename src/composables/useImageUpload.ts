import { ref } from 'vue'
import { useNotify } from '@pieda/core'
import { useEditorStore } from '@/stores/editor'
import { imageBitmapToPixelBuffer } from '@/lib/canvas'
import { detectBackgroundColor } from '@/lib/detectBackgroundColor'
import { rgbToHex } from '@/lib/color'

/**
 * 上傳圖片的完整流程：讀檔 → 解碼成 ImageBitmap → 自動偵測背景色 → 寫入 store。
 * 這裡是 Vue 的「反應式膠水」──實際的偵測演算法在 lib/detectBackgroundColor，
 * 這個 composable 只負責串起流程、處理載入狀態與錯誤通知。
 */
export function useImageUpload() {
  const $notify = useNotify()
  const editorStore = useEditorStore()
  const isLoading = ref(false)

  async function loadImageFile(file: File): Promise<void> {
    if (!file.type.startsWith('image/')) {
      $notify.alert({
        title: '檔案格式錯誤',
        message: '請上傳圖片檔案（PNG、JPG 等），目前選到的不是圖片。',
        variant: 'error',
      })
      return
    }

    isLoading.value = true
    try {
      const bitmap = await createImageBitmap(file)
      const pixelBuffer = imageBitmapToPixelBuffer(bitmap)
      const backgroundColor = detectBackgroundColor(pixelBuffer)

      editorStore.sourceBitmap = bitmap
      editorStore.backgroundColor = rgbToHex(backgroundColor)
    } catch {
      $notify.alert({
        title: '讀取失敗',
        message: '圖片讀取時發生錯誤，請確認檔案沒有損毀，或換一張圖片再試一次。',
        variant: 'error',
      })
    } finally {
      isLoading.value = false
    }
  }

  return { isLoading, loadImageFile }
}
