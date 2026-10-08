import { describe, expect, it } from 'vitest'
import type { PixelBuffer } from './pixelBuffer'
import { applyShadow, DEFAULT_SHADOW, shadowCoverage, shadowReach, type ShadowSettings } from './stickerShadow'

/** 40×40 透明畫布，(15,15)～(24,24) 一塊 10×10 的不透明紅色 */
function makeSquare(): PixelBuffer {
  const width = 40
  const data = new Uint8ClampedArray(width * width * 4)
  for (let y = 15; y < 25; y++) {
    for (let x = 15; x < 25; x++) {
      data[(y * width + x) * 4] = 200
      data[(y * width + x) * 4 + 3] = 255
    }
  }
  return { data, width, height: width }
}

const at = (coverage: Float32Array, x: number, y: number) => coverage[y * 40 + x]
/** 不模糊、不擴散的陰影，方便確認位置 */
const sharp: ShadowSettings = { ...DEFAULT_SHADOW, enabled: true, distance: 5, spread: 0, size: 0, opacity: 1 }

describe('shadowCoverage', () => {
  it('依角度與距離位移：0° 往右', () => {
    const coverage = shadowCoverage(makeSquare(), { ...sharp, angle: 0 })

    expect(at(coverage, 28, 20)).toBe(1) // 貼紙右緣外 4 px：在陰影內
    expect(at(coverage, 12, 20)).toBe(0) // 左邊沒有陰影
  })

  it('90° 往下', () => {
    const coverage = shadowCoverage(makeSquare(), { ...sharp, angle: 90 })

    expect(at(coverage, 20, 28)).toBe(1)
    expect(at(coverage, 20, 12)).toBe(0)
  })

  it('擴散：陰影比輪廓大一圈', () => {
    const coverage = shadowCoverage(makeSquare(), { ...sharp, distance: 0, spread: 3 })

    expect(at(coverage, 26, 20)).toBe(1) // 右緣外 2 px
    expect(at(coverage, 29, 20)).toBe(0) // 右緣外 5 px
  })

  it('大小（模糊）：陰影邊緣由濃到淡漸變，不是一刀切', () => {
    const coverage = shadowCoverage(makeSquare(), { ...sharp, distance: 0, size: 9 })
    const edge = at(coverage, 25, 20)

    expect(at(coverage, 20, 20)).toBeGreaterThan(edge) // 中心比邊緣濃
    expect(edge).toBeGreaterThan(0)
    expect(edge).toBeLessThan(1)
  })
})

describe('applyShadow', () => {
  it('關閉時原樣回傳', () => {
    const image = makeSquare()

    expect(Array.from(applyShadow(image, DEFAULT_SHADOW).data)).toEqual(Array.from(image.data))
  })

  it('陰影墊在貼紙下面：貼紙本體不變，陰影處為陰影色與透明度', () => {
    const result = applyShadow(makeSquare(), { ...sharp, angle: 0, opacity: 0.5 })
    const pixel = (x: number, y: number) => Array.from(result.data.subarray((y * 40 + x) * 4, (y * 40 + x) * 4 + 4))

    expect(pixel(20, 20)).toEqual([200, 0, 0, 255])
    expect(pixel(28, 20)).toEqual([0, 0, 0, 128])
  })
})

describe('shadowReach', () => {
  it('關閉時為 0；開啟時為距離 + 擴散 + 大小', () => {
    expect(shadowReach(DEFAULT_SHADOW)).toBe(0)
    expect(shadowReach({ ...DEFAULT_SHADOW, enabled: true, distance: 4, spread: 2, size: 8 })).toBe(14)
  })
})
