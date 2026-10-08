<script setup lang="ts">
import { computed } from 'vue'
import { useEditorStore } from '@/stores/editor'
import type { BackgroundSettings } from '@/lib/stickerBackground'
import EffectSection from '@/components/EffectSection.vue'

/** 實色背景設定（需求 4.2）：整張輸出鋪一張圓角卡片，所有貼紙共用 */

/** 圓角上限（px）：在 256×256 上已經接近圓形，再大也沒有差別（實際會限制在短邊一半） */
const MAX_RADIUS = 128

const editorStore = useEditorStore()
const background = computed(() => editorStore.outputSettings.background)

function update(patch: Partial<BackgroundSettings>): void {
  Object.assign(editorStore.outputSettings.background, patch)
}

function handleEnabledChange(enabled: boolean): void {
  update({ enabled })
}

function handleColorInput(event: Event): void {
  update({ color: (event.target as HTMLInputElement).value })
}

function handleRadiusInput(event: Event): void {
  update({ radius: Number((event.target as HTMLInputElement).value) })
}
</script>

<template>
  <EffectSection title="實色背景" :enabled="background.enabled" @update:enabled="handleEnabledChange">
    <label class="effect-section__row">
      <span>顏色</span>
      <input type="color" :value="background.color" @input="handleColorInput" />
    </label>
    <label class="effect-section__row">
      <span>圓角</span>
      <input type="range" min="0" :max="MAX_RADIUS" step="1" :value="background.radius" @input="handleRadiusInput" />
      <span class="w-12 text-right">{{ background.radius }} px</span>
    </label>
  </EffectSection>
</template>
