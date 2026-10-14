import { describe, expect, it } from 'vitest'
import { detectInAppBrowser, detectPlatform, externalBrowserLink, lineExternalUrl } from './inAppBrowser'

const UA = {
  lineIos:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Safari Line/14.3.0',
  liffAndroid:
    'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/124.0 Mobile Safari/537.36 Line/14.3.0 LIFF',
  facebook:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 [FBAN/FBIOS;FBAV/460.0]',
  instagram:
    'Mozilla/5.0 (Linux; Android 14; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Mobile Safari/537.36 Instagram 330.0.0',
  safari:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1',
  chromeDesktop: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
}

describe('detectInAppBrowser', () => {
  it('認得各 App 的內建瀏覽器', () => {
    expect(detectInAppBrowser(UA.lineIos)).toBe('line')
    expect(detectInAppBrowser(UA.facebook)).toBe('facebook')
    expect(detectInAppBrowser(UA.instagram)).toBe('instagram')
  })

  it('LIFF 的 User-Agent 也含有 Line，要判斷成 LIFF（它不支援自動跳轉）', () => {
    expect(detectInAppBrowser(UA.liffAndroid)).toBe('liff')
  })

  it('一般瀏覽器不算', () => {
    expect(detectInAppBrowser(UA.safari)).toBeNull()
    expect(detectInAppBrowser(UA.chromeDesktop)).toBeNull()
  })
})

describe('detectPlatform', () => {
  it('分辨 iOS、Android、其他', () => {
    expect(detectPlatform(UA.lineIos)).toBe('ios')
    expect(detectPlatform(UA.instagram)).toBe('android')
    expect(detectPlatform(UA.chromeDesktop)).toBe('other')
  })
})

describe('lineExternalUrl', () => {
  const href = 'https://example.github.io/sticker_snip/?lang=en#top'

  it('LINE 內建瀏覽器：加上 openExternalBrowser=1，保留原本的參數與錨點', () => {
    expect(lineExternalUrl(href, 'line')).toBe('https://example.github.io/sticker_snip/?lang=en&openExternalBrowser=1#top')
  })

  it('已經帶過參數還在 LINE 裡（跳轉失敗）：不再重試，避免無限循環', () => {
    expect(lineExternalUrl('https://example.github.io/sticker_snip/?openExternalBrowser=1', 'line')).toBeNull()
  })

  it('不是 LINE（包含 LIFF）：不跳轉', () => {
    expect(lineExternalUrl(href, 'liff')).toBeNull()
    expect(lineExternalUrl(href, null)).toBeNull()
  })
})

describe('externalBrowserLink', () => {
  const href = 'https://example.github.io/sticker_snip/?a=1'

  it('Android：intent 網址交給系統預設瀏覽器', () => {
    expect(externalBrowserLink(href, 'android')).toBe(
      'intent://example.github.io/sticker_snip/?a=1#Intent;scheme=https;action=android.intent.action.VIEW;end',
    )
  })

  it('iOS：x-safari-https 叫出 Safari', () => {
    expect(externalBrowserLink(href, 'ios')).toBe('x-safari-https://example.github.io/sticker_snip/?a=1')
  })

  it('其他平台沒有可用的做法', () => {
    expect(externalBrowserLink(href, 'other')).toBeNull()
  })
})
