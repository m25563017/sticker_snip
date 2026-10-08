import { describe, expect, it } from 'vitest'
import { outputLayout, trimTransparent } from './composeOutput'
import type { PixelBuffer } from './pixelBuffer'

/** width×height 的透明圖，(x, y) 起畫一塊 contentWidth×contentHeight 的不透明紅色 */
function makeImage(
  width: number,
  height: number,
  x: number,
  y: number,
  contentWidth: number,
  contentHeight: number,
): PixelBuffer {
  const data = new Uint8ClampedArray(width * height * 4)
  for (let row = y; row < y + contentHeight; row++) {
    for (let column = x; column < x + contentWidth; column++) {
      const i = (row * width + column) * 4
      data[i] = 200
      data[i + 3] = 255
    }
  }
  return { data, width, height }
}

describe('trimTransparent', () => {
  it('裁掉四周的透明空白，只留貼紙實際的範圍', () => {
    const trimmed = trimTransparent(makeImage(50, 40, 10, 5, 20, 15))

    expect([trimmed.width, trimmed.height]).toEqual([20, 15])
    expect(trimmed.data[3]).toBe(255) // 左上角就是貼紙
  })

  it('全部透明時回傳 1×1 透明圖，不會產生寬高為 0 的圖', () => {
    const trimmed = trimTransparent(makeImage(10, 10, 0, 0, 0, 0))

    expect([trimmed.width, trimmed.height]).toEqual([1, 1])
  })
})

describe('outputLayout', () => {
  it('原尺寸：不縮放，四周加上邊距', () => {
    expect(outputLayout(20, 15, 'original', 4)).toEqual({
      canvasWidth: 28,
      canvasHeight: 23,
      x: 4,
      y: 4,
      width: 20,
      height: 15,
    })
  })

  it('正方形：長邊扣掉兩側邊距後剛好塞滿，短邊置中', () => {
    // 貼紙 100×50，輸出 128、邊距 14 → 可用 100 px，縮放 1 倍
    expect(outputLayout(100, 50, 128, 14)).toEqual({
      canvasWidth: 128,
      canvasHeight: 128,
      x: 14,
      y: 39,
      width: 100,
      height: 50,
    })
  })

  it('正方形：大貼紙縮小輸出時，只算位置，畫布就是目標大小', () => {
    // 1000×500 輸出 64、邊距 16 → 可用 32 px，縮成 32×16
    expect(outputLayout(1000, 500, 64, 16)).toEqual({
      canvasWidth: 64,
      canvasHeight: 64,
      x: 16,
      y: 24,
      width: 32,
      height: 16,
    })
  })

  it('邊距超過邊長一半時自動限制，貼紙至少保留 1 px', () => {
    const layout = outputLayout(10, 10, 64, 999)

    expect(layout.width).toBeGreaterThanOrEqual(1)
    expect(layout.x + layout.width).toBeLessThanOrEqual(64)
  })
})

describe('outputLayout（預留白邊空間）', () => {
  it('邊距量到白邊外緣：貼紙再往內縮一個白邊的寬度', () => {
    // 輸出 128、邊距 14、白邊 8 → 貼紙離畫布邊緣 22 px，可用 84 px
    const layout = outputLayout(100, 50, 128, 14, 8)

    expect(layout.x).toBe(22)
    expect(layout.width).toBe(84)
  })

  it('原尺寸：畫布四周加上邊距與白邊寬度', () => {
    expect(outputLayout(20, 15, 'original', 4, 3)).toMatchObject({ canvasWidth: 34, x: 7 })
  })
})
