import { describe, expect, it } from 'vitest'
import { createDefaultWhiteBorder, DEFAULT_THRESHOLD, type Selection } from '@/types/selection'
import type { PixelBuffer } from './pixelBuffer'
import { processSelection } from './processSelection'

/** 10×10 白底，中央 (4,4)~(5,5) 有一塊 2×2 的紅色物件 */
function makeSourceImage(): PixelBuffer {
  const width = 10
  const height = 10
  const data = new Uint8ClampedArray(width * height * 4).fill(255)
  for (let y = 4; y <= 5; y++) {
    for (let x = 4; x <= 5; x++) {
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
    bounds: { x: 2, y: 2, width: 6, height: 6 },
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
    const result = processSelection(makeSourceImage(), makeSelection('#ffffff'))

    expect(result.width).toBe(6)
    expect(result.height).toBe(6)
    // 範圍從 (2,2) 開始，原圖物件 (4,4) 對應到裁切結果的 (2,2)
    expect(alphaAt(result, 0, 0)).toBe(0)
    expect(alphaAt(result, 2, 2)).toBe(255)
    expect(alphaAt(result, 3, 3)).toBe(255)
  })

  it('背景色尚未偵測時只裁切、不去背', () => {
    const result = processSelection(makeSourceImage(), makeSelection(null))

    expect(alphaAt(result, 0, 0)).toBe(255)
  })
})
