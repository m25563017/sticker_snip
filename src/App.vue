<script setup lang="ts">
import { useEditorStore } from '@/stores/editor'
import ImageDropzone from '@/components/ImageDropzone.vue'
import EditorCanvas from '@/components/EditorCanvas.vue'

const editorStore = useEditorStore()
</script>

<template>
  <main class="app-shell flex flex-col h-screen">
    <!-- ======== 頂列：標題 + 自動偵測到的背景色（先用來確認演算法有跑對）======== -->
    <header class="app-shell__header flex items-center justify-between px-4 py-3">
      <h1 class="text-xl">貼紙裁切去背工具</h1>
      <p v-if="editorStore.backgroundColor" class="app-shell__bg-preview flex items-center gap-2">
        偵測到的背景色
        <span
          class="app-shell__bg-swatch"
          :style="{ backgroundColor: editorStore.backgroundColor }"
        ></span>
        {{ editorStore.backgroundColor }}
      </p>
    </header>

    <!-- ======== 主工作區：還沒有圖時顯示上傳區，有圖之後顯示畫布 ======== -->
    <section class="app-shell__workspace flex-1 px-4 pb-4">
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

  &__bg-swatch {
    display: inline-block;
    width: 20px;
    height: 20px;
    border: 1px solid #999;
    border-radius: 4px;
  }
}
</style>
