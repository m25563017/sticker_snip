import { describe, expect, it } from 'vitest'
import { createDefaultWhiteBorder, DEFAULT_THRESHOLD, type Selection } from '@/types/selection'
import type { PixelBuffer } from './pixelBuffer'
import { processSelection } from './processSelection'

/**
 * 10×10 白底，(4,4)~(6,6) 有一塊 3×3 的紅色物件。
 * 物件要大於清雜點的下限（8 px），否則會被當成雜點一起清掉。
 */
function makeSourceImage(): PixelBuffer {
  const width = 10
  const height = 10
  const data = new Uint8ClampedArray(width * height * 4).fill(255)
  for (let y = 4; y <= 6; y++) {
    for (let x = 4; x <= 6; x++) {
      const i = (y * width + x) * 4
      data[i + 1] = 0
      data[i + 2] = 0
    }
  }
  return { data, width, height }
}

function makeSelection(backgroundColor: string | null): Selection {
  return {
    id: 1,
    type: 'rect',
    bounds: { x: 1, y: 1, width: 8, height: 8 },
    whiteBorder: createDefaultWhiteBorder(),
    backgroundColor,
    threshold: DEFAULT_THRESHOLD,
    isManualColor: false,
  }
}

function alphaAt(image: PixelBuffer, x: number, y: number): number {
  return image.data[(y * image.width + x) * 4 + 3]
}

describe('processSelection', () => {
  it('裁切範圍後去背：背景透明、物件保留', () => {
    const result = processSelection(makeSourceImage(), makeSelection('#ffffff'), 'pixel')

    expect(result.width).toBe(8)
    expect(result.height).toBe(8)
    // 範圍從 (1,1) 開始，原圖物件 (4,4)~(6,6) 對應到裁切結果的 (3,3)~(5,5)
    expect(alphaAt(result, 0, 0)).toBe(0)
    expect(alphaAt(result, 3, 3)).toBe(255)
    expect(alphaAt(result, 5, 5)).toBe(255)
  })

  it('背景上色差超過閾值的孤立小色斑會被清掉', () => {
    const source = makeSourceImage()
    // 在 (2,2) 點一個偏米色的像素：與白色距離 ≈ 50 > 閾值 30，flood fill 不會移除它；
    // 它和物件 (4,4) 隔了一格，不相連，是一座 1 px 的孤島
    const speck = (2 * 10 + 2) * 4
    source.data[speck] = 225
    source.data[speck + 1] = 235
    source.data[speck + 2] = 215

    const result = processSelection(source, makeSelection('#ffffff'), 'pixel')

    // 原圖 (2,2) 對應裁切結果的 (1,1)
    expect(alphaAt(result, 1, 1)).toBe(0)
    expect(alphaAt(result, 3, 3)).toBe(255)
  })

  it('背景色尚未偵測時只裁切、不去背', () => {
    const result = processSelection(makeSourceImage(), makeSelection(null), 'smooth')

    expect(alphaAt(result, 0, 0)).toBe(255)
  })
})
