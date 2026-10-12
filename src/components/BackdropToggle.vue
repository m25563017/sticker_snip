<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import type { PreviewBackdrop } from '@/types/preview'

const { t } = useI18n()
const props = defineProps<{
  modelValue: PreviewBackdrop
}>()

const emit = defineEmits<{
  'update:modelValue': [value: PreviewBackdrop]
}>()

const OPTIONS: PreviewBackdrop[] = ['checker', 'dark', 'light']

function handleSelect(value: PreviewBackdrop): void {
  emit('update:modelValue', value)
}
</script>

<template>
  <div class="backdrop-toggle flex items-center gap-1" role="radiogroup" :aria-label="t('backdrop.label')">
    <span class="text-sm opacity-70 mr-1">{{ t('backdrop.label') }}</span>
    <template v-for="option in OPTIONS" :key="option">
      <button
        type="button"
        role="radio"
        class="backdrop-toggle__option"
        :class="{ 'backdrop-toggle__option--active': option === props.modelValue }"
        :aria-checked="option === props.modelValue"
        @click="handleSelect(option)"
      >
        <span class="backdrop-toggle__swatch preview-backdrop" :class="`preview-backdrop--${option}`"></span>
        {{ t(`backdrop.${option}`) }}
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
