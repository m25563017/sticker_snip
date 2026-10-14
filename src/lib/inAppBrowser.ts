/**
 * App 內建瀏覽器的判斷與「改用外部瀏覽器開啟」的網址。
 *
 * LINE、Facebook、Instagram 等 App 點開連結時，是用 App 自己內建的瀏覽器顯示網頁。
 * 這些內建瀏覽器常常不能下載檔案、不能選相簿的圖片，所以要引導使用者改用 Safari、Chrome。
 * 判斷依據是 User-Agent（瀏覽器的自我介紹字串），各 App 會在裡面加上自己的名字。
 */

export type InAppBrowser = 'liff' | 'line' | 'facebook' | 'instagram' | 'threads' | 'wechat' | 'tiktok'
export type MobilePlatform = 'ios' | 'android' | 'other'

/** 依序比對：LIFF 的 User-Agent 也含有 Line，所以要排在 LINE 前面 */
const IN_APP_PATTERNS: [InAppBrowser, RegExp][] = [
  ['liff', /LIFF/],
  ['line', /\bLine\//i],
  ['facebook', /FBAN|FBAV|FB_IAB/],
  ['instagram', /Instagram/],
  ['threads', /Barcelona/],
  ['wechat', /MicroMessenger/],
  ['tiktok', /musical_ly|BytedanceWebview|TikTok/i],
]

export function detectInAppBrowser(userAgent: string): InAppBrowser | null {
  return IN_APP_PATTERNS.find(([, pattern]) => pattern.test(userAgent))?.[0] ?? null
}

export function detectPlatform(userAgent: string): MobilePlatform {
  if (/iPhone|iPad|iPod/.test(userAgent)) return 'ios'
  if (/Android/.test(userAgent)) return 'android'
  return 'other'
}

/** LINE 支援的參數：網址帶上它，LINE 會改用手機的預設瀏覽器開啟（LIFF 不支援） */
export const LINE_EXTERNAL_PARAM = 'openExternalBrowser'

/** 在 LINE 內建瀏覽器裡、而且還沒帶過參數：回傳要跳轉的網址；其餘回傳 null（帶過參數還在 LINE 裡，代表跳轉沒成功，不再重試以免無限循環） */
export function lineExternalUrl(href: string, inApp: InAppBrowser | null): string | null {
  if (inApp !== 'line') return null
  const url = new URL(href)
  if (url.searchParams.has(LINE_EXTERNAL_PARAM)) return null
  url.searchParams.set(LINE_EXTERNAL_PARAM, '1')
  return url.toString()
}

/**
 * 「用瀏覽器開啟」按鈕的連結。沒有官方保證的做法，所以畫面上一定同時提供複製網址與手動步驟：
 * - Android：intent 網址交給系統，用預設瀏覽器開啟
 * - iOS：x-safari-https 會叫出 Safari（iOS 15、17 以後實測可用，但不是 Apple 公開的 API）
 */
export function externalBrowserLink(href: string, platform: MobilePlatform): string | null {
  const url = new URL(href)
  const rest = `${url.host}${url.pathname}${url.search}${url.hash}`
  if (platform === 'android') return `intent://${url.host}${url.pathname}${url.search}#Intent;scheme=https;action=android.intent.action.VIEW;end`
  if (platform === 'ios') return `x-safari-https://${rest}`
  return null
}
