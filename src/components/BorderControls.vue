<script setup lang="ts">
import { computed } from 'vue'
import { useEditorStore } from '@/stores/editor'
import type { BorderSettings } from '@/lib/stickerBorder'
import EffectSection from '@/components/EffectSection.vue'

/** 白邊設定（需求 4.2、4.7）：沿貼紙輪廓長出的描邊，所有貼紙共用 */

/** 粗細上限（px）：再粗在 256×256 的輸出上就會佔掉太多空間，貼紙本體會被擠得很小 */
const MAX_THICKNESS = 40

const editorStore = useEditorStore()
const border = computed(() => editorStore.outputSettings.border)

function update(patch: Partial<BorderSettings>): void {
  Object.assign(editorStore.outputSettings.border, patch)
}

const valueOf = (event: Event) => (event.target as HTMLInputElement).value

function handleEnabledChange(enabled: boolean): void {
  update({ enabled })
}

function handleColorInput(event: Event): void {
  update({ color: valueOf(event) })
}

function handleThicknessInput(event: Event): void {
  update({ thickness: Number(valueOf(event)) })
}
</script>

<template>
  <EffectSection title="白邊" :enabled="border.enabled" @update:enabled="handleEnabledChange">
    <label class="effect-section__row">
      <span>顏色</span>
      <input type="color" :value="border.color" @input="handleColorInput" />
    </label>
    <label class="effect-section__row">
      <span>粗細</span>
      <input type="range" min="1" :max="MAX_THICKNESS" step="1" :value="border.thickness" @input="handleThicknessInput" />
      <span class="w-12 text-right">{{ border.thickness }} px</span>
    </label>
  </EffectSection>
</template>

