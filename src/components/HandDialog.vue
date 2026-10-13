<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { useEventListener } from '@vueuse/core'
import AppIcon from '@/components/AppIcon.vue'

/**
 * 手繪風對話框的外框：粗黑框、錯位陰影、黑底白字標題列、右上角關閉鈕。
 * 內容由使用的地方放進預設 slot，底部按鈕放進 footer slot。
 * 點外面變暗的地方、按 Esc、按 ✕ 都會關閉；手機上改成全螢幕。
 */
const props = withDefaults(
  defineProps<{
    title: string
    /** 對話框最大寬度（px） */
    maxWidth?: number
  }>(),
  { maxWidth: 560 },
)

const emit = defineEmits<{
  close: []
}>()

const { t } = useI18n()

function handleClose(): void {
  emit('close')
}

useEventListener(document, 'keydown', (event: KeyboardEvent) => {
  if (event.key === 'Escape') handleClose()
})
</script>

<template>
  <Teleport to="body">
    <div class="hand-dialog" role="dialog" aria-modal="true" :aria-label="props.title" @click.self="handleClose">
      <section class="hand-dialog__panel" :style="{ maxWidth: `${props.maxWidth}px` }">
        <header class="hand-dialog__titlebar hand-panel-title flex items-center justify-between gap-4">
          <h2 class="text-lg">{{ props.title }}</h2>
          <button type="button" class="hand-dialog__close" :aria-label="t('common.close')" @click="handleClose">
            <AppIcon name="close" :size="20" />
          </button>
        </header>

        <div class="hand-dialog__body">
          <slot></slot>
        </div>

        <template v-if="$slots.footer">
          <footer class="hand-dialog__footer">
            <slot name="footer"></slot>
          </footer>
        </template>
      </section>
    </div>
  </Teleport>
</template>

<style scoped>
.hand-dialog {
  position: fixed;
  inset: 0;
  z-index: 50;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background-color: rgba(0, 0, 0, 0.45);

  .hand-dialog__panel {
    display: flex;
    flex-direction: column;
    width: 100%;
    max-height: 100%;
    background-color: var(--color-paper);
    border: 3px solid var(--color-ink);
    box-shadow: 8px 8px 0 var(--color-ink);
  }

  /* 標題列與底部按鈕固定，內容太高時只捲動中間 */
  .hand-dialog__titlebar {
    flex-shrink: 0;
    text-align: left;
  }

  .hand-dialog__body {
    display: flex;
    flex-direction: column;
    gap: 16px;
    min-height: 0;
    overflow-y: auto;
    padding: 16px 20px;
  }

  .hand-dialog__footer {
    display: flex;
    flex-shrink: 0;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    padding: 12px 20px 16px;
    border-top: 2px dashed var(--color-ink);
  }

  /* 在黑色標題列上：白色叉叉，滑過時反白 */
  .hand-dialog__close {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;

    &:hover {
      color: var(--color-ink);
      background-color: var(--color-paper);
    }
  }

  /* 手機：全螢幕，彈窗外沒有空間可以點來關閉，用 ✕ 或底部按鈕 */
  @media (max-width: 767px) {
    padding: 0;

    .hand-dialog__panel {
      height: 100%;
      border: none;
      box-shadow: none;
    }
  }
}
</style>
