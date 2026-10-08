import { describe, expect, it } from 'vitest'
import type { PixelBuffer } from './pixelBuffer'
import { applyBorder, borderCoverage, DEFAULT_BORDER, distanceToTarget } from './stickerBorder'

interface Block {
  x: number
  y: number
  width: number
  height: number
}

/** 透明畫布上畫幾塊不透明的紅色方塊 */
function makeImage(width: number, height: number, blocks: Block[]): PixelBuffer {
  const data = new Uint8ClampedArray(width * height * 4)
  for (const block of blocks) {
    for (let y = block.y; y < block.y + block.height; y++) {
      for (let x = block.x; x < block.x + block.width; x++) {
        const i = (y * width + x) * 4
        data[i] = 200
        data[i + 3] = 255
      }
    }
  }
  return { data, width, height }
}

describe('distanceToTarget', () => {
  it('算出的是直線距離（斜對角不是 2 步而是 √2 倍）', () => {
    const target = new Uint8Array(25)
    target[2 * 5 + 2] = 1 // 5×5 的正中央

    const distance = distanceToTarget(target, 5, 5)

    expect(distance[2 * 5 + 2]).toBe(0)
    expect(distance[2 * 5 + 4]).toBeCloseTo(2) // 正右方 2 格
    expect(distance[0]).toBeCloseTo(Math.SQRT2 * 2) // 左上角，斜對角 2 格
  })
})

describe('borderCoverage', () => {
  // 40×40 畫布正中央一塊 10×10 的貼紙：(15,15) ~ (24,24)
  const square = makeImage(40, 40, [{ x: 15, y: 15, width: 10, height: 10 }])
  const coverageAt = (coverage: Float32Array, x: number, y: number) => coverage[y * 40 + x]

  it('沿輪廓往外長出指定的粗細', () => {
    const coverage = borderCoverage(square, 4)

    expect(coverageAt(coverage, 27, 20)).toBe(1) // 右邊緣外 3 px：在白邊內
    expect(coverageAt(coverage, 31, 20)).toBe(0) // 右邊緣外 7 px：在白邊外
  })

  it('凸角是圓弧，不是直角', () => {
    const coverage = borderCoverage(square, 4)

    // 右下角外斜對角 (+2, +2)：距離 √8 ≈ 2.8 < 4，在白邊內
    expect(coverageAt(coverage, 26, 26)).toBe(1)
    // 斜對角 (+4, +4)：距離 √32 ≈ 5.7 > 4。直角的話會被包進去，圓弧則在外面
    expect(coverageAt(coverage, 28, 28)).toBe(0)
  })

  it('兩個部件之間的窄縫會被填平，看起來是一整張貼紙', () => {
    // 左右兩塊相隔 10 px：只往外長 3 px 的話，中間會留下 4 px 的縫
    const twoParts = makeImage(50, 30, [
      { x: 5, y: 10, width: 15, height: 10 },
      { x: 30, y: 10, width: 15, height: 10 },
    ])

    const coverage = borderCoverage(twoParts, 3)

    expect(coverage[15 * 50 + 25]).toBe(1) // 縫的正中間
  })

  it('半透明的淡雜訊不會長出白邊', () => {
    const image = makeImage(30, 30, [])
    image.data[(15 * 30 + 15) * 4 + 3] = 60 // 正中央一顆很淡的雜點

    const coverage = borderCoverage(image, 4)

    expect(coverage.every((value) => value === 0)).toBe(true)
  })
})

describe('applyBorder', () => {
  const image = makeImage(30, 30, [{ x: 10, y: 10, width: 10, height: 10 }])
  const pixelAt = (buffer: PixelBuffer, x: number, y: number) =>
    Array.from(buffer.data.subarray((y * 30 + x) * 4, (y * 30 + x) * 4 + 4))

  it('關閉時原樣回傳', () => {
    const result = applyBorder(image, DEFAULT_BORDER)

    expect(Array.from(result.data)).toEqual(Array.from(image.data))
  })

  it('開啟時：貼紙外圍變成白邊色，貼紙本體不變', () => {
    const result = applyBorder(image, { ...DEFAULT_BORDER, enabled: true, thickness: 3 })

    expect(pixelAt(result, 21, 15)).toEqual([255, 255, 255, 255]) // 貼紙右邊外 2 px
    expect(pixelAt(result, 15, 15)).toEqual([200, 0, 0, 255]) // 貼紙本體
    expect(pixelAt(result, 28, 15)[3]).toBe(0) // 遠處仍透明
  })
})

describe('borderCoverage（雜點與畫布邊緣）', () => {
  it('面積極小的雜點不會長出白邊', () => {
    // 60×60 中間一塊 40×40 的貼紙，左上角有一顆 1 px 的雜點（面積只有主體的 0.06%）
    const image = makeImage(60, 60, [
      { x: 10, y: 10, width: 40, height: 40 },
      { x: 2, y: 2, width: 1, height: 1 },
    ])

    const coverage = borderCoverage(image, 3)

    expect(coverage[2 * 60 + 4]).toBe(0) // 雜點右邊 2 px：不該有白邊
    expect(coverage[30 * 60 + 52]).toBe(1) // 主體旁邊照常有白邊
  })

  it('貼紙靠近畫布邊緣時，白邊不會沿著邊緣拉出尖刺', () => {
    // 貼紙上緣離畫布頂端只有 6 px，「先長胖」的範圍會超出畫布
    const image = makeImage(40, 30, [{ x: 10, y: 6, width: 20, height: 10 }])

    const coverage = borderCoverage(image, 4)

    // 頂端正中間離貼紙 6 px，大於白邊粗細 4 px，不該被蓋到
    expect(coverage[0 * 40 + 20]).toBe(0)
    expect(coverage[3 * 40 + 20]).toBe(1) // 離貼紙 3 px，在白邊內
  })
})
