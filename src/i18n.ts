import { watch } from 'vue'
import { createI18n } from 'vue-i18n'
import { useStorage } from '@vueuse/core'
import zhTW from '@/locales/zh-TW'
import en from '@/locales/en'

type MessageSchema = typeof zhTW

// 讓 useI18n() 的 t('...') 認得所有 key：打錯字或 key 不存在時，型別檢查就會抓到
declare module 'vue-i18n' {
  export interface DefineLocaleMessage extends MessageSchema {}
}

export const LOCALES = [
  { value: 'zh-TW', label: '中文' },
  { value: 'en', label: 'EN' },
] as const
export type Locale = (typeof LOCALES)[number]['value']

/** 第一次打開時看瀏覽器語言：中文系統用中文，其他一律英文 */
function detectLocale(): Locale {
  return navigator.language.toLowerCase().startsWith('zh') ? 'zh-TW' : 'en'
}

/** 記住使用者選的語言，下次打開不用重選 */
const storedLocale = useStorage<Locale>('sticker-snip:locale', detectLocale())

export const i18n = createI18n<[MessageSchema], Locale, false>({
  legacy: false,
  locale: storedLocale.value,
  fallbackLocale: 'zh-TW',
  messages: { 'zh-TW': zhTW, en },
})

// 切換語言時一併更新：記住選擇、<html lang>（影響字型與螢幕閱讀器發音）、分頁標題
watch(
  i18n.global.locale,
  (locale) => {
    storedLocale.value = locale
    document.documentElement.lang = locale
    document.title = i18n.global.t('app.title')
  },
  { immediate: true },
)
