import { ref } from "vue";
import { useNotify } from "@pieda/core";
import { useEditorStore } from "@/stores/editor";
import { imageBitmapToPixelBuffer } from "@/lib/canvas";
/**
 * 上傳圖片的流程：讀檔 → 解碼成 ImageBitmap → 讀出像素 → 交給 store。
 * 這裡只負責瀏覽器端的讀檔與錯誤通知；換圖後的重設與自動偵測由 store.loadImage 處理。
 */
export function useImageUpload() {
    const $notify = useNotify();
    const editorStore = useEditorStore();
    const isLoading = ref(false);

    async function loadImageFile(file: File): Promise<void> {
        if (!file.type.startsWith("image/")) {
            $notify.alert({
                title: "檔案格式錯誤",
                message: "請上傳圖片檔案（PNG、JPG 等），目前選到的不是圖片。",
                variant: "error",
            });
            return;
        }

        isLoading.value = true;
        try {
            const bitmap = await createImageBitmap(file);
            editorStore.loadImage(bitmap, imageBitmapToPixelBuffer(bitmap));
        } catch {
            $notify.alert({
                title: "讀取失敗",
                message: "圖片讀取時發生錯誤，請再試一次。",
                variant: "error",
            });
        } finally {
            isLoading.value = false;
        }
    }

    return { isLoading, loadImageFile };
}
