<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { externalBrowserLink, type MobilePlatform } from '@/lib/inAppBrowser'
import HandDialog from '@/components/HandDialog.vue'
import AppIcon from '@/components/AppIcon.vue'

/**
 * 在 App 內建瀏覽器（LINE、Facebook、Instagram…）開啟時的提示：
 * 內建瀏覽器常常不能下載檔案，引導使用者改用 Safari、Chrome。
 * 自動跳轉沒有萬用的做法，所以同時提供三條路：開啟按鈕、複製網址、手動步驟；
 * 也可以選擇「仍要在這裡使用」關掉提示。
 */
const props = defineProps<{
  platform: MobilePlatform
}>()

const emit = defineEmits<{
  close: []
}>()

const { t } = useI18n()

/** 給使用者複製的網址：去掉 LINE 跳轉用的參數，貼到哪裡都乾淨 */
const pageUrl = (() => {
  const url = new URL(window.location.href)
  url.searchParams.delete('openExternalBrowser')
  return url.toString()
})()
const openLink = computed(() => externalBrowserLink(pageUrl, props.platform))

const isCopied = ref(false)
const urlInputRef = ref<HTMLInputElement | null>(null)

/** 有些內建瀏覽器不開放剪貼簿，失敗時改成選取網址文字，讓使用者自己長按複製 */
async function handleCopy(): Promise<void> {
  try {
    await navigator.clipboard.writeText(pageUrl)
    isCopied.value = true
  } catch {
    urlInputRef.value?.select()
  }
}

function handleClose(): void {
  emit('close')
}
</script>

<template>
  <HandDialog :title="t('inApp.title')" @close="handleClose">
    <p class="leading-relaxed">{{ t('inApp.body') }}</p>

    <template v-if="openLink">
      <a class="hand-button hand-button--primary justify-center" :href="openLink">
        <AppIcon name="arrowRight" />{{ t('inApp.open') }}
      </a>
    </template>

    <!-- ======== 開啟按鈕沒反應時：複製網址，貼到瀏覽器 ======== -->
    <div class="flex flex-col gap-1">
      <p class="text-sm">{{ t('inApp.copyHint') }}</p>
      <div class="flex gap-2">
        <input ref="urlInputRef" type="text" class="flex-1 min-w-0 px-2 text-sm" readonly :value="pageUrl" />
        <button type="button" class="hand-button text-sm" @click="handleCopy">
          {{ isCopied ? t('inApp.copied') : t('inApp.copy') }}
        </button>
      </div>
    </div>

    <p class="text-sm opacity-70">{{ t('inApp.manualHint') }}</p>

    <template #footer>
      <span></span>
      <button type="button" class="hand-button text-sm" @click="handleClose">{{ t('inApp.continue') }}</button>
    </template>
  </HandDialog>
</template>
