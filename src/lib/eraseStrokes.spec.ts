import { describe, expect, it } from 'vitest'
import { applyEraseStrokes } from './eraseStrokes'
import type { PixelBuffer } from './pixelBuffer'

function makeOpaque(width: number, height: number): PixelBuffer {
  return { data: new Uint8ClampedArray(width * height * 4).fill(255), width, height }
}

function alphaAt(image: PixelBuffer, x: number, y: number): number {
  return image.data[(y * image.width + x) * 4 + 3]
}

describe('applyEraseStrokes', () => {
  it('單點：擦掉以該點為圓心的圓形範圍，圓外不受影響', () => {
    const result = applyEraseStrokes(makeOpaque(20, 20), [{ points: [{ x: 10, y: 10 }], radius: 3 }])

    expect(alphaAt(result, 10, 10)).toBe(0)
    expect(alphaAt(result, 13, 10)).toBe(0) // 剛好在半徑上
    expect(alphaAt(result, 12, 12)).toBe(0) // 距離 √8 ≈ 2.8，在圓內
    expect(alphaAt(result, 13, 13)).toBe(255) // 距離 √18 ≈ 4.2，在圓外
  })

  it('兩點相距很遠時，中間也會被連續擦掉（不會變成斷開的圓點）', () => {
    const result = applyEraseStrokes(makeOpaque(60, 10), [
      {
        points: [
          { x: 5, y: 5 },
          { x: 55, y: 5 },
        ],
        radius: 2,
      },
    ])

    for (let x = 5; x <= 55; x++) expect(alphaAt(result, x, 5)).toBe(0)
    expect(alphaAt(result, 30, 9)).toBe(255)
  })

  it('筆刷超出圖片邊緣時不會出錯，只擦圖片內的部分', () => {
    const result = applyEraseStrokes(makeOpaque(10, 10), [{ points: [{ x: 0, y: 0 }], radius: 5 }])

    expect(alphaAt(result, 0, 0)).toBe(0)
    expect(alphaAt(result, 9, 9)).toBe(255)
  })

  it('不修改傳入的原始圖片', () => {
    const image = makeOpaque(10, 10)

    applyEraseStrokes(image, [{ points: [{ x: 5, y: 5 }], radius: 2 }])

    expect(alphaAt(image, 5, 5)).toBe(255)
  })
})
