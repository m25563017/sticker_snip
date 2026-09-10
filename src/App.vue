<script setup lang="ts">
import { useEditorStore } from '@/stores/editor'

const editorStore = useEditorStore()
</script>

<template>
  <!-- ======== 應用外框（骨架，之後拆成三欄：縮圖列 / 主畫布 / 設定面板）======== -->
  <main class="app-shell">
    <h1 class="app-shell__title">貼紙裁切去背工具</h1>
    <p class="app-shell__hint">
      環境建置完成 · 目前選取範圍 {{ editorStore.selectionCount }} 個
    </p>
  </main>
</template>

<style scoped>
.app-shell {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;

  &__title {
    font-size: 2rem;
    font-weight: 700;
  }

  &__hint {
    opacity: 0.6;
  }
}
</style>
