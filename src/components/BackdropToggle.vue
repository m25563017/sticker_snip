<script setup lang="ts">
import type { PreviewBackdrop } from '@/types/preview'

const props = defineProps<{
  modelValue: PreviewBackdrop
}>()

const emit = defineEmits<{
  'update:modelValue': [value: PreviewBackdrop]
}>()

const options: { value: PreviewBackdrop; label: string }[] = [
  { value: 'checker', label: '棋盤格' },
  { value: 'dark', label: '深色' },
  { value: 'light', label: '淺色' },
]

function handleSelect(value: PreviewBackdrop): void {
  emit('update:modelValue', value)
}
</script>

<template>
  <div class="backdrop-toggle flex items-center gap-1" role="radiogroup" aria-label="預覽背景">
    <span class="text-sm opacity-70 mr-1">預覽背景</span>
    <template v-for="option in options" :key="option.value">
      <button
        type="button"
        role="radio"
        class="backdrop-toggle__option"
        :class="{ 'backdrop-toggle__option--active': option.value === props.modelValue }"
        :aria-checked="option.value === props.modelValue"
        @click="handleSelect(option.value)"
      >
        <span class="backdrop-toggle__swatch preview-backdrop" :class="`preview-backdrop--${option.value}`"></span>
        {{ option.label }}
      </button>
    </template>
  </div>
</template>

<style scoped>
.backdrop-toggle {
  /* 標籤與選項都不折行，空間不夠時寧可整組換行，也不要把中文擠成一字一行 */
  white-space: nowrap;

  .backdrop-toggle__option {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 2px 8px;
    font-size: 0.875rem;
    border: 1px solid #ccc;
    border-radius: 999px;

    &.backdrop-toggle__option--active {
      border-color: #111;
      background-color: #111;
      color: #fff;
    }
  }

  .backdrop-toggle__swatch {
    width: 12px;
    height: 12px;
    border-radius: 50%;
    border: 1px solid #999;
  }
}
</style>
