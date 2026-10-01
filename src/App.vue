<script setup lang="ts">
import { useEditorStore } from '@/stores/editor'
import ImageDropzone from '@/components/ImageDropzone.vue'
import EditorCanvas from '@/components/EditorCanvas.vue'
import ThumbnailList from '@/components/ThumbnailList.vue'

const editorStore = useEditorStore()
</script>

<template>
  <main class="app-shell flex flex-col h-screen">
    <!-- ======== 頂列 ======== -->
    <header class="app-shell__header flex items-center justify-between px-4 py-3">
      <h1 class="text-xl">貼紙裁切去背工具</h1>
    </header>

    <!-- ======== 主工作區：還沒有圖時顯示上傳區，有圖之後顯示縮圖列表 + 畫布 ======== -->
    <section class="app-shell__workspace flex flex-1 gap-4 min-h-0 px-4 pb-4">
      <template v-if="!editorStore.hasImage">
        <ImageDropzone class="flex-1" />
      </template>
      <template v-else>
        <ThumbnailList class="w-56 shrink-0 pt-4" />
        <!-- min-w-0：讓畫布區可以比內容窄，縮放視窗時才不會被 canvas 撐住 -->
        <div class="flex-1 min-w-0">
          <EditorCanvas />
        </div>
      </template>
    </section>
  </main>
</template>

<style scoped>
.app-shell {
  .app-shell__header {
    border-bottom: 1px solid #ddd;
  }
}
</style>
