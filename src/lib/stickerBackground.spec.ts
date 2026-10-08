import { describe, expect, it } from 'vitest'
import type { PixelBuffer } from './pixelBuffer'
import { applyBackground, DEFAULT_BACKGROUND, roundedRectCoverage } from './stickerBackground'

describe('roundedRectCoverage', () => {
  const at = (coverage: Float32Array, width: number, x: number, y: number) => coverage[y * width + x]

  it('圓角 0：整張畫布都被覆蓋', () => {
    expect(roundedRectCoverage(10, 8, 0).every((value) => value === 1)).toBe(true)
  })

  it('有圓角時：四個角落透明，邊的中段和中央完整覆蓋', () => {
    const coverage = roundedRectCoverage(40, 40, 10)

    expect(at(coverage, 40, 0, 0)).toBe(0) // 左上角落
    expect(at(coverage, 40, 39, 39)).toBe(0) // 右下角落
    expect(at(coverage, 40, 20, 0)).toBe(1) // 上邊的中段
    expect(at(coverage, 40, 20, 20)).toBe(1) // 中央
  })

  it('圓弧邊緣有半透明的過渡（抗鋸齒）', () => {
    const coverage = roundedRectCoverage(40, 40, 10)
    // 檢查整個左上角 10×10：圓弧經過的地方要有介於 0 和 1 之間的過渡值
    const corner: number[] = []
    for (let y = 0; y < 10; y++) for (let x = 0; x < 10; x++) corner.push(at(coverage, 40, x, y))

    expect(corner.some((value) => value > 0 && value < 1)).toBe(true)
  })

  it('圓角超過短邊一半時自動限制，不會出錯', () => {
    const coverage = roundedRectCoverage(20, 10, 999)

    expect(at(coverage, 20, 10, 5)).toBe(1) // 中央仍覆蓋
    expect(at(coverage, 20, 0, 0)).toBe(0)
  })
})

describe('applyBackground', () => {
  /** 10×10 透明畫布，正中央一個不透明紅色像素 */
  function makeImage(): PixelBuffer {
    const data = new Uint8ClampedArray(10 * 10 * 4)
    data.set([200, 0, 0, 255], (5 * 10 + 5) * 4)
    return { data, width: 10, height: 10 }
  }
  const pixelAt = (image: PixelBuffer, x: number, y: number) =>
    Array.from(image.data.subarray((y * 10 + x) * 4, (y * 10 + x) * 4 + 4))

  it('關閉時原樣回傳', () => {
    const image = makeImage()

    expect(Array.from(applyBackground(image, DEFAULT_BACKGROUND).data)).toEqual(Array.from(image.data))
  })

  it('開啟時：透明處鋪上背景色，貼紙本體不變', () => {
    const result = applyBackground(makeImage(), { enabled: true, color: '#336699', radius: 0 })

    expect(pixelAt(result, 0, 0)).toEqual([0x33, 0x66, 0x99, 255])
    expect(pixelAt(result, 5, 5)).toEqual([200, 0, 0, 255])
  })
})
