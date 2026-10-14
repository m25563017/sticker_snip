<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useHelpDialog, type HelpTab } from '@/composables/useHelpDialog'
import { useIsTouchDevice } from '@/composables/useIsTouchDevice'
import HandDialog from '@/components/HandDialog.vue'
import AppIcon, { type IconName } from '@/components/AppIcon.vue'

/**
 * 使用說明：「怎麼使用」是 4 步的步驟卡片，「關於」是隱私、素材版權、免責聲明與授權。
 * 文字都在翻譯檔 help.*；手機和電腦操作不同的步驟另有 bodyTouch。
 */
const { t, tm, rt } = useI18n()
const help = useHelpDialog()
const isTouchDevice = useIsTouchDevice()

const TABS: HelpTab[] = ['guide', 'about']

/** 每一步的圖示；hasTouchVariant：手機的操作方式不同（兩指縮放、底部的設定按鈕），另有一份說明 */
const STEPS = [
  { key: 'upload', icon: 'upload', hasTouchVariant: false },
  { key: 'select', icon: 'rect', hasTouchVariant: true },
  { key: 'review', icon: 'wand', hasTouchVariant: false },
  { key: 'export', icon: 'download', hasTouchVariant: true },
] as const satisfies readonly { key: string; icon: IconName; hasTouchVariant: boolean }[]

const ABOUT_SECTIONS = ['environment', 'privacy', 'copyright', 'disclaimer'] as const

const stepIndex = ref(0)
const step = computed(() => STEPS[stepIndex.value])
const isLastStep = computed(() => stepIndex.value === STEPS.length - 1)
const stepBody = computed(() => {
  const { key, hasTouchVariant } = step.value
  return hasTouchVariant && isTouchDevice.value ? t(`help.steps.${key}.bodyTouch`) : t(`help.steps.${key}.body`)
})

function handleSelectTab(tab: HelpTab): void {
  help.tab.value = tab
}

function handlePrevious(): void {
  stepIndex.value = Math.max(0, stepIndex.value - 1)
}

/** 最後一步的按鈕是「開始使用」：直接關閉 */
function handleNext(): void {
  if (isLastStep.value) help.close()
  else stepIndex.value += 1
}
</script>

<template>
  <HandDialog :title="t('help.title')" @close="help.close">
    <!-- ======== 分頁：怎麼使用／關於 ======== -->
    <div class="flex gap-2" role="tablist">
      <template v-for="tab in TABS" :key="tab">
        <button
          type="button"
          role="tab"
          class="hand-button flex-1 justify-center"
          :aria-selected="help.tab.value === tab"
          :aria-pressed="help.tab.value === tab"
          @click="handleSelectTab(tab)"
        >
          {{ t(`help.tabs.${tab}`) }}
        </button>
      </template>
    </div>

    <!-- ======== 怎麼使用：步驟卡片 ======== -->
    <template v-if="help.tab.value === 'guide'">
      <!-- 使用環境提醒：每次打開都看得到，放在步驟之前 -->
      <p class="help-dialog__notice text-sm">{{ t('help.environmentNotice') }}</p>
      <section class="help-dialog__step" aria-live="polite">
        <span class="help-dialog__icon">
          <AppIcon :name="step.icon" :size="40" />
        </span>
        <h3 class="text-xl">{{ stepIndex + 1 }}. {{ t(`help.steps.${step.key}.title`) }}</h3>
        <p class="help-dialog__text">{{ stepBody }}</p>
        <!-- 進度點：也可以直接點跳到那一步 -->
        <div class="flex gap-2">
          <template v-for="(item, index) in STEPS" :key="item.key">
            <button
              type="button"
              class="help-dialog__dot"
              :class="{ 'help-dialog__dot--active': index === stepIndex }"
              :aria-label="t('help.stepOf', { current: index + 1, total: STEPS.length })"
              @click="stepIndex = index"
            ></button>
          </template>
        </div>
      </section>
    </template>

    <!-- ======== 關於：隱私、素材版權、免責聲明、授權 ======== -->
    <template v-else>
      <template v-for="section in ABOUT_SECTIONS" :key="section">
        <section class="flex flex-col gap-1">
          <h3 class="text-lg">{{ t(`help.about.${section}.title`) }}</h3>
          <!-- 版權聲明是條款式的編號清單，其餘是一段文字 -->
          <template v-if="section === 'copyright'">
            <ol class="help-dialog__terms help-dialog__text">
              <template v-for="(point, index) in tm('help.about.copyright.points')" :key="index">
                <li>{{ rt(point) }}</li>
              </template>
            </ol>
          </template>
          <template v-else>
            <p class="help-dialog__text">{{ t(`help.about.${section}.body`) }}</p>
          </template>
        </section>
      </template>
      <section class="flex flex-col gap-1">
        <h3 class="text-lg">{{ t('help.about.licenses.title') }}</h3>
        <p class="help-dialog__text">{{ t('help.about.licenses.body') }}</p>
        <a class="help-dialog__link" href="./licenses/README.txt" target="_blank" rel="noopener">
          {{ t('help.about.licenses.link') }}
        </a>
      </section>
    </template>

    <!-- ======== 底部：教學才有上一步／下一步，關於只需要關閉 ======== -->
    <template #footer>
      <template v-if="help.tab.value === 'guide'">
        <button type="button" class="hand-button" @click="stepIndex === 0 ? help.close() : handlePrevious()">
          {{ stepIndex === 0 ? t('help.skip') : t('help.previous') }}
        </button>
        <button type="button" class="hand-button hand-button--primary" @click="handleNext">
          {{ isLastStep ? t('help.start') : t('help.next') }}
        </button>
      </template>
      <template v-else>
        <span></span>
        <button type="button" class="hand-button hand-button--primary" @click="help.close">{{ t('common.ok') }}</button>
      </template>
    </template>
  </HandDialog>
</template>

<style scoped>
.help-dialog__step {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 8px 0;
  text-align: center;
}

/* 大圖示放在手繪圓框裡，當作每一步的插圖 */
.help-dialog__icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 80px;
  height: 80px;
  border: 3px solid var(--color-ink);
  border-radius: 46% 54% 50% 50% / 52% 46% 54% 48%;
}

.help-dialog__text {
  line-height: 1.7;
  /* 中文說明比較長，限制行寬才好讀 */
  max-width: 32em;
}

/* 和縮圖列表的提示一樣，白底虛線框像一張便條 */
.help-dialog__notice {
  padding: 6px 10px;
  border: 2px dashed var(--color-ink);
}

.help-dialog__dot {
  width: 10px;
  height: 10px;
  border: 2px solid var(--color-ink);
  border-radius: 50%;

  &.help-dialog__dot--active {
    background-color: var(--color-ink);
  }
}

.help-dialog__terms {
  padding-left: 1.5em;
  list-style: decimal;

  li + li {
    margin-top: 4px;
  }
}

.help-dialog__link {
  align-self: flex-start;
  text-decoration: underline;
  text-underline-offset: 3px;
}
</style>
