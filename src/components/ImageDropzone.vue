<script setup lang="ts">
import { ref } from "vue";
import { useI18n } from "vue-i18n";
import { useImageUpload } from "@/composables/useImageUpload";

const { t } = useI18n();
const { isLoading, loadImageFile } = useImageUpload();
const isDraggingOver = ref(false);
const fileInputRef = ref<HTMLInputElement | null>(null);

function handleDrop(event: DragEvent): void {
    isDraggingOver.value = false;
    const file = event.dataTransfer?.files?.[0];
    if (file) loadImageFile(file);
}

function handleFileInputChange(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file) loadImageFile(file);
}

function handleClickZone(): void {
    fileInputRef.value?.click();
}
</script>

<template>
    <div
        class="image-dropzone"
        :class="{ 'image-dropzone--dragging': isDraggingOver }"
        @dragover.prevent="isDraggingOver = true"
        @dragleave.prevent="isDraggingOver = false"
        @drop.prevent="handleDrop"
        @click="handleClickZone"
    >
        <input
            ref="fileInputRef"
            type="file"
            accept="image/*"
            hidden
            @change="handleFileInputChange"
        />

        <!-- 整片區域都能拖放、點擊；中間的卡片只是視覺焦點 -->
        <div class="image-dropzone__card hand-panel">
            <p v-if="isLoading" class="text-2xl">{{ t("upload.loading") }}</p>
            <template v-else>
                <p class="text-3xl">{{ t("upload.drop") }}</p>
                <!-- 整片都能點，這裡不用真的 button，避免點一下觸發兩次選檔 -->
                <span class="hand-button hand-button--primary">{{ t("upload.browse") }}</span>
                <p class="text-sm">{{ t("upload.tagline") }}</p>
            </template>
        </div>
    </div>
</template>

<style scoped>
.image-dropzone {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 0.75rem;
    height: 100%;
    width: 100%;
    cursor: pointer;
    /* 平常不顯示外框，拖曳檔案進來時才出現虛線，提示「可以放開了」 */
    border: 3px dashed transparent;

    &.image-dropzone--dragging {
        border-color: var(--color-ink);
    }

    .image-dropzone__card {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 12px;
        padding: 20px 32px;
        box-shadow: 5px 5px 0 var(--color-ink);
    }
}
</style>
