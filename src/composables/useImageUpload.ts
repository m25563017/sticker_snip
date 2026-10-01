import { ref } from "vue";
import { useNotify } from "@pieda/core";
import { useEditorStore } from "@/stores/editor";
import { imageBitmapToPixelBuffer } from "@/lib/canvas";
/**
 * 上傳圖片的完整流程：讀檔 → 解碼成 ImageBitmap → 讀出像素 → 寫入 store。
 * 背景色不在這裡偵測──需求 4.6 要求每個範圍各自偵測，
 * 所以改到使用者框出範圍之後才針對該範圍做。
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
            const pixels = imageBitmapToPixelBuffer(bitmap);
            // 換新圖時，舊圖上的範圍已經沒有意義，先全部清掉
            editorStore.reset();
            editorStore.sourceBitmap = bitmap;
            editorStore.sourcePixels = pixels;
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
