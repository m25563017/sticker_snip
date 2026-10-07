import { describe, expect, it } from 'vitest'
import type { PixelBuffer } from './pixelBuffer'
import { readPatch, sampleColor } from './sampleColor'

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

describe('readPatch', () => {
  /** 5×5 的圖，每格的 R 值 = y × 10 + x，用來確認取到的是哪一格 */
  function makeNumbered(): PixelBuffer {
    const data = new Uint8ClampedArray(5 * 5 * 4)
    for (let y = 0; y < 5; y++) {
      for (let x = 0; x < 5; x++) {
        const i = (y * 5 + x) * 4
        data[i] = y * 10 + x
        data[i + 3] = 255
      }
    }
    return { data, width: 5, height: 5 }
  }

  function redAt(patch: PixelBuffer, x: number, y: number): number {
    return patch.data[(y * patch.width + x) * 4]
  }

  it('以游標為中心取出 (2r+1)² 的一小塊', () => {
    const patch = readPatch(makeNumbered(), 2, 2, 1)

    expect(patch.width).toBe(3)
    expect(redAt(patch, 0, 0)).toBe(11) // 原圖 (1,1)
    expect(redAt(patch, 1, 1)).toBe(22) // 原圖 (2,2)，正中央
    expect(redAt(patch, 2, 2)).toBe(33) // 原圖 (3,3)
  })

  it('游標在角落時，超出圖片的部分是透明的，中心仍對準游標', () => {
    const patch = readPatch(makeNumbered(), 0, 0, 1)

    expect(patch.data[3]).toBe(0) // 左上角在圖外
    expect(redAt(patch, 1, 1)).toBe(0) // 正中央 = 原圖 (0,0)
    expect(patch.data[(1 * 3 + 1) * 4 + 3]).toBe(255)
  })
})
