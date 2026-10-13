import { ref } from "vue";
import { useNotify } from "@pieda/core";
import { useI18n } from "vue-i18n";
import { useEditorStore } from "@/stores/editor";
import { downscaleBitmap, imageBitmapToPixelBuffer, MAX_IMAGE_SIDE } from "@/lib/canvas";
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
            const original = await createImageBitmap(file);
            const originalWidth = original.width;
            const bitmap = await downscaleBitmap(original, MAX_IMAGE_SIDE);
            editorStore.loadImage(bitmap, imageBitmapToPixelBuffer(bitmap));
            // 縮小過要告訴使用者，不然下載的貼紙比預期小會不知道為什麼
            if (bitmap.width !== originalWidth) {
                $notify.toast({
                    title: t("upload.downscaled", { width: bitmap.width, height: bitmap.height }),
                    variant: "info",
                    timer: 5000,
                });
            }
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
