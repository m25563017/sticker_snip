<script setup lang="ts">
import { ref } from "vue";
import { useImageUpload } from "@/composables/useImageUpload";

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

        <p v-if="isLoading" class="text-lg">讀取圖片中…</p>
        <template v-else>
            <p class="text-lg">拖曳合成圖到這裡</p>
            <p class="opacity-60">或點擊選擇檔案</p>
        </template>
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
    border: 2px dashed #999;
    border-radius: 8px;

    &--dragging {
        border-color: #111;
        background: rgba(0, 0, 0, 0.04);
    }
}
</style>
