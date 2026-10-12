import { ref } from "vue";
import { useNotify } from "@pieda/core";
import { useI18n } from "vue-i18n";
import { useEditorStore } from "@/stores/editor";
import { imageBitmapToPixelBuffer } from "@/lib/canvas";
/**
 * 上傳圖片的流程：讀檔 → 解碼成 ImageBitmap → 讀出像素 → 交給 store。
 * 這裡只負責瀏覽器端的讀檔與錯誤通知；換圖後的重設與自動偵測由 store.loadImage 處理。
 */
export function useImageUpload() {
    const { t } = useI18n();
    const $notify = useNotify();
    const editorStore = useEditorStore();
    const isLoading = ref(false);

    async function loadImageFile(file: File): Promise<void> {
        if (!file.type.startsWith("image/")) {
            $notify.alert({
                title: t("upload.invalidType.title"),
                message: t("upload.invalidType.message"),
                confirmButtonText: t("common.ok"),
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
                title: t("upload.readFailed.title"),
                message: t("upload.readFailed.message"),
                confirmButtonText: t("common.ok"),
                variant: "error",
            });
        } finally {
            isLoading.value = false;
        }
    }

    return { isLoading, loadImageFile };
}
