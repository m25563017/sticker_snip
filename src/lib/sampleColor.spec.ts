import { describe, expect, it } from 'vitest'
import type { PixelBuffer } from './pixelBuffer'
import { sampleColor } from './sampleColor'

function makeSolid(width: number, height: number, value: number): PixelBuffer {
  const data = new Uint8ClampedArray(width * height * 4).fill(value)
  return { data, width, height }
}

function setGray(image: PixelBuffer, x: number, y: number, value: number): void {
  const i = (y * image.width + x) * 4
  image.data[i] = value
  image.data[i + 1] = value
  image.data[i + 2] = value
}

describe('sampleColor', () => {
  it('純色區域取到的就是那個顏色', () => {
    expect(sampleColor(makeSolid(5, 5, 200), 2, 2)).toEqual({ r: 200, g: 200, b: 200 })
  })

  it('點到單一雜點時，周圍 3×3 平均可以把雜點的影響壓低', () => {
    const image = makeSolid(5, 5, 252)
    setGray(image, 2, 2, 225) // 正中央是一顆 JPG 壓縮雜點

    // 8 格 252 + 1 格 225 → 平均 249，比單讀雜點的 225 更接近真正的背景色
    expect(sampleColor(image, 2, 2)).toEqual({ r: 249, g: 249, b: 249 })
  })

  it('點在角落時，只平均落在圖片內的格子', () => {
    const image = makeSolid(3, 3, 0)
    setGray(image, 0, 0, 100)
    setGray(image, 1, 0, 100)
    setGray(image, 0, 1, 100)
    setGray(image, 1, 1, 100)

    // 角落的 3×3 只有 2×2 = 4 格在圖內，且都是 100
    expect(sampleColor(image, 0, 0)).toEqual({ r: 100, g: 100, b: 100 })
  })

  it('小數座標會四捨五入到最近的像素', () => {
    const image = makeSolid(5, 1, 0)
    setGray(image, 3, 0, 90)

    expect(sampleColor(image, 3.4, 0, 0)).toEqual({ r: 90, g: 90, b: 90 })
  })
})
