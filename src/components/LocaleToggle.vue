<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { LOCALES, type Locale } from '@/i18n'

const { t, locale } = useI18n()

function handleSelect(value: Locale): void {
  locale.value = value
}
</script>

<template>
  <!-- 語言名稱固定用各自的文字（中文／EN），不跟著翻譯：看不懂目前語言的人也找得到 -->
  <div class="locale-toggle flex items-center" role="radiogroup" :aria-label="t('locale.label')">
    <template v-for="option in LOCALES" :key="option.value">
      <button
        type="button"
        role="radio"
        class="locale-toggle__option"
        :class="{ 'locale-toggle__option--active': option.value === locale }"
        :aria-checked="option.value === locale"
        @click="handleSelect(option.value)"
      >
        {{ option.label }}
      </button>
    </template>
  </div>
</template>

<style scoped>
.locale-toggle {
  white-space: nowrap;
  border: 1px solid #ccc;
  border-radius: 999px;
  overflow: hidden;

  .locale-toggle__option {
    padding: 2px 10px;
    font-size: 0.875rem;

    &.locale-toggle__option--active {
      color: #fff;
      background-color: #111;
    }
  }
}
</style>
