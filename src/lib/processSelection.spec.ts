import { describe, expect, it } from 'vitest'
import { DEFAULT_THRESHOLD, type RectLikeSelection, type Selection } from '@/types/selection'
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

function makeSelection(backgroundColor: string | null): RectLikeSelection {
  return {
    id: 1,
    createdBy: 'manual',
    type: 'rect',
    bounds: { x: 1, y: 1, width: 8, height: 8 },
    backgroundColor,
    threshold: DEFAULT_THRESHOLD,
    manualEdits: [],
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

  it('魔術棒的點以原圖座標存放，會換算成裁切後的位置', () => {
    // 原圖 (6,6) 是紅色物件的右下角，換算到裁切結果是 (5,5)；
    // 若忘了扣掉裁切起點 (1,1)，會點到 (6,6)——那裡是已經透明的背景，結果就不會變
    const selection: Selection = {
      ...makeSelection('#ffffff'),
      manualEdits: [{ tool: 'wand', point: { x: 6, y: 6 } }],
    }

    const result = processSelection(makeSourceImage(), selection, 'pixel')

    expect(alphaAt(result, 3, 3)).toBe(0)
    expect(alphaAt(result, 5, 5)).toBe(0)
  })

  it('橡皮擦擦過的地方變透明，擦完旁邊殘留的小碎片會被清雜點一起清掉', () => {
    // 20×10 白底，(2,2)~(11,7) 一塊 10×6 的紅色物件
    const width = 20
    const height = 10
    const data = new Uint8ClampedArray(width * height * 4).fill(255)
    for (let y = 2; y <= 7; y++) {
      for (let x = 2; x <= 11; x++) {
        data[(y * width + x) * 4 + 1] = 0
        data[(y * width + x) * 4 + 2] = 0
      }
    }
    // 在原圖 x = 9 由上到下擦一刀（半徑 1 → 擦掉 x 8～10），右邊只剩 x = 11 一條 6 px 的細條
    const selection: Selection = {
      ...makeSelection('#ffffff'),
      bounds: { x: 1, y: 1, width: 18, height: 8 },
      manualEdits: [{ tool: 'erase', points: [{ x: 9, y: 1 }, { x: 9, y: 8 }], radius: 1 }],
    }

    const result = processSelection({ data, width, height }, selection, 'pixel')

    // 以下為裁切後座標（原圖減 1）
    expect(alphaAt(result, 3, 3)).toBe(255) // 左半部保留
    expect(alphaAt(result, 8, 3)).toBe(0) // 擦過的地方
    expect(alphaAt(result, 10, 3)).toBe(0) // 右邊殘留的細條被清雜點清掉
  })

  it('橢圓範圍：形狀外的四個角落即使是物件顏色，輸出也是透明的', () => {
    // 整張 10×10 都是紅色（沒有背景），用橢圓框住
    const width = 10
    const height = 10
    const data = new Uint8ClampedArray(width * height * 4).fill(255)
    for (let i = 0; i < width * height; i++) {
      data[i * 4 + 1] = 0
      data[i * 4 + 2] = 0
    }
    const selection: Selection = { ...makeSelection('#ffffff'), type: 'ellipse', bounds: { x: 0, y: 0, width, height } }

    const result = processSelection({ data, width, height }, selection, 'pixel')

    expect(alphaAt(result, 0, 0)).toBe(0)
    expect(alphaAt(result, 9, 9)).toBe(0)
    expect(alphaAt(result, 5, 5)).toBe(255)
  })

  describe('保留筆刷', () => {
    // makeSourceImage：10×10 白底，(4,4)~(6,6) 紅色物件；makeSelection 的範圍從 (1,1) 開始
    const keepAt = (x: number, y: number): RectLikeSelection => ({
      ...makeSelection('#ffffff'),
      manualEdits: [{ tool: 'keep', points: [{ x, y }], radius: 1 }],
    })

    it('把已經被去背的地方還原成原圖', () => {
      // 原圖 (2,2) 是白色背景，本來會被去掉；塗了保留就還原成不透明的白色
      const result = processSelection(makeSourceImage(), keepAt(2, 2), 'smooth')

      // 原圖 (2,2) = 裁切結果 (1,1)
      expect(Array.from(result.data.subarray((1 * 8 + 1) * 4, (1 * 8 + 1) * 4 + 4))).toEqual([255, 255, 255, 255])
    })

    it('只塗到小裝飾的一部分，整個小裝飾都不會被清雜點清掉', () => {
      // 在原圖 (1,7)~(2,8) 加一塊 2×2 的紅色小裝飾：只有 4 px，平常會被當成雜點清掉
      const source = makeSourceImage()
      for (const [x, y] of [[1, 7], [2, 7], [1, 8], [2, 8]]) {
        source.data[(y * 10 + x) * 4 + 1] = 0
        source.data[(y * 10 + x) * 4 + 2] = 0
      }
      // 保留筆刷只碰到其中一格 (1,7)
      const selection: RectLikeSelection = {
        ...makeSelection('#ffffff'),
        manualEdits: [{ tool: 'keep', points: [{ x: 1, y: 7 }], radius: 0.5 }],
      }

      const result = processSelection(source, selection, 'pixel')

      // 沒塗到的 (2,8) 也留下來（裁切後座標 (1,7)）
      expect(alphaAt(result, 1, 7)).toBe(255)
    })

    it('同一個地方先保留、再擦除 → 以後做的擦除為準', () => {
      const selection: RectLikeSelection = {
        ...makeSelection('#ffffff'),
        manualEdits: [
          { tool: 'keep', points: [{ x: 5, y: 5 }], radius: 1 },
          { tool: 'erase', points: [{ x: 5, y: 5 }], radius: 1 },
        ],
      }

      const result = processSelection(makeSourceImage(), selection, 'pixel')

      expect(alphaAt(result, 4, 4)).toBe(0) // 原圖 (5,5)，物件中心
    })
  })

  it('背景色尚未偵測時只裁切、不去背', () => {
    const result = processSelection(makeSourceImage(), makeSelection(null), 'smooth')

    expect(alphaAt(result, 0, 0)).toBe(255)
  })
})
