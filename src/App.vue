<script setup lang="ts">
import { useEditorStore } from '@/stores/editor'
import ImageDropzone from '@/components/ImageDropzone.vue'
import EditorCanvas from '@/components/EditorCanvas.vue'

const editorStore = useEditorStore()
</script>

<template>
  <main class="app-shell flex flex-col h-screen">
    <!-- ======== 頂列 ======== -->
    <header class="app-shell__header flex items-center justify-between px-4 py-3">
      <h1 class="text-xl">貼紙裁切去背工具</h1>
    </header>

    <!-- ======== 主工作區：還沒有圖時顯示上傳區，有圖之後顯示畫布 ======== -->
    <section class="app-shell__workspace flex-1 min-h-0 px-4 pb-4">
      <ImageDropzone v-if="!editorStore.hasImage" />
      <EditorCanvas v-else />
    </section>
  </main>
</template>

<style scoped>
.app-shell {
  &__header {
    border-bottom: 1px solid #ddd;
  }
}
</style>
