<script setup lang="ts">
/**
 * 輸出效果（白邊、陰影、實色背景）共用的區塊：標題列有開關，開啟時才展開細項設定。
 * 關閉時只佔一行，設定欄不會因為效果多而變得很長。
 */
const props = defineProps<{
  title: string
  enabled: boolean
}>()

const emit = defineEmits<{
  'update:enabled': [value: boolean]
}>()

function handleToggle(event: Event): void {
  emit('update:enabled', (event.target as HTMLInputElement).checked)
}
</script>

<template>
  <section class="effect-section flex flex-col gap-2">
    <label class="effect-section__header flex items-center justify-between">
      <span class="text-sm">{{ props.title }}</span>
      <input type="checkbox" role="switch" :checked="props.enabled" @change="handleToggle" />
    </label>
    <template v-if="props.enabled">
      <div class="flex flex-col gap-2 pl-2">
        <slot />
      </div>
    </template>
  </section>
</template>

<style scoped>
.effect-section {
  padding-top: 10px;
  border-top: 1px solid #e5e5e5;

  .effect-section__header {
    cursor: pointer;
  }
}
</style>
