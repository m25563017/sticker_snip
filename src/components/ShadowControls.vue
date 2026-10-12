<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useEditorStore } from '@/stores/editor'
import type { ShadowSettings } from '@/lib/stickerShadow'
import EffectSection from '@/components/EffectSection.vue'

/** 陰影設定（需求 4.2）：墊在貼紙與白邊下方，所有貼紙共用 */

/** 距離、擴散、大小的上限（px）：再大陰影會佔掉太多輸出空間，貼紙本體會被擠得很小 */
const MAX_DISTANCE = 30
const MAX_SPREAD = 20
const MAX_SIZE = 40

const { t } = useI18n()
const editorStore = useEditorStore()
const shadow = computed(() => editorStore.outputSettings.shadow)

function update(patch: Partial<ShadowSettings>): void {
  Object.assign(editorStore.outputSettings.shadow, patch)
}

const numberOf = (event: Event) => Number((event.target as HTMLInputElement).value)

function handleEnabledChange(enabled: boolean): void {
  update({ enabled })
}

function handleColorInput(event: Event): void {
  update({ color: (event.target as HTMLInputElement).value })
}

function handleOpacityInput(event: Event): void {
  update({ opacity: numberOf(event) / 100 })
}

function handleAngleInput(event: Event): void {
  update({ angle: numberOf(event) })
}

function handleDistanceInput(event: Event): void {
  update({ distance: numberOf(event) })
}

function handleSpreadInput(event: Event): void {
  update({ spread: numberOf(event) })
}

function handleSizeInput(event: Event): void {
  update({ size: numberOf(event) })
}
</script>

<template>
  <EffectSection :title="t('shadow.title')" :enabled="shadow.enabled" @update:enabled="handleEnabledChange">
    <label class="effect-section__row">
      <span>{{ t('common.color') }}</span>
      <input type="color" :value="shadow.color" @input="handleColorInput" />
    </label>
    <label class="effect-section__row">
      <span>{{ t('shadow.opacity') }}</span>
      <input type="range" min="0" max="100" step="1" :value="Math.round(shadow.opacity * 100)" @input="handleOpacityInput" />
      <span class="w-12 text-right">{{ Math.round(shadow.opacity * 100) }}%</span>
    </label>
    <label class="effect-section__row" :title="t('shadow.angleHint')">
      <span>{{ t('shadow.angle') }}</span>
      <input type="range" min="0" max="359" step="1" :value="shadow.angle" @input="handleAngleInput" />
      <span class="w-12 text-right">{{ shadow.angle }}°</span>
    </label>
    <label class="effect-section__row">
      <span>{{ t('shadow.distance') }}</span>
      <input type="range" min="0" :max="MAX_DISTANCE" step="1" :value="shadow.distance" @input="handleDistanceInput" />
      <span class="w-12 text-right">{{ shadow.distance }} px</span>
    </label>
    <label class="effect-section__row" :title="t('shadow.spreadHint')">
      <span>{{ t('shadow.spread') }}</span>
      <input type="range" min="0" :max="MAX_SPREAD" step="1" :value="shadow.spread" @input="handleSpreadInput" />
      <span class="w-12 text-right">{{ shadow.spread }} px</span>
    </label>
    <label class="effect-section__row" :title="t('shadow.blurHint')">
      <span>{{ t('shadow.blur') }}</span>
      <input type="range" min="0" :max="MAX_SIZE" step="1" :value="shadow.size" @input="handleSizeInput" />
      <span class="w-12 text-right">{{ shadow.size }} px</span>
    </label>
  </EffectSection>
</template>
