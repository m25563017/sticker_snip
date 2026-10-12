import { describe, expect, it } from 'vitest'
import { applyBrushMask, BRUSH_ERASE, BRUSH_KEEP, BRUSH_NONE, paintBrushMask } from './brushStrokes'
import type { PixelBuffer } from './pixelBuffer'

const at = (mask: Uint8Array, width: number, x: number, y: number) => mask[y * width + x]

describe('paintBrushMask', () => {
  it('單點：以該點為圓心的圓形範圍被標記，圓外不受影響', () => {
    const mask = paintBrushMask(20, 20, [{ effect: 'erase', points: [{ x: 10, y: 10 }], radius: 3 }])

    expect(at(mask, 20, 10, 10)).toBe(BRUSH_ERASE)
    expect(at(mask, 20, 13, 10)).toBe(BRUSH_ERASE) // 剛好在半徑上
    expect(at(mask, 20, 12, 12)).toBe(BRUSH_ERASE) // 距離 √8 ≈ 2.8，在圓內
    expect(at(mask, 20, 13, 13)).toBe(BRUSH_NONE) // 距離 √18 ≈ 4.2，在圓外
  })

  it('兩點相距很遠時，中間也會連續標記（不會變成斷開的圓點）', () => {
    const mask = paintBrushMask(60, 10, [
      {
        effect: 'erase',
        points: [
          { x: 5, y: 5 },
          { x: 55, y: 5 },
        ],
        radius: 2,
      },
    ])

    for (let x = 5; x <= 55; x++) expect(at(mask, 60, x, 5)).toBe(BRUSH_ERASE)
    expect(at(mask, 60, 30, 9)).toBe(BRUSH_NONE)
  })

  it('同一個地方後塗的蓋過先塗的：先保留再擦 → 擦；先擦再保留 → 保留', () => {
    const spot = [{ x: 5, y: 5 }]

    const keepThenErase = paintBrushMask(10, 10, [
      { effect: 'keep', points: spot, radius: 2 },
      { effect: 'erase', points: spot, radius: 2 },
    ])
    const eraseThenKeep = paintBrushMask(10, 10, [
      { effect: 'erase', points: spot, radius: 2 },
      { effect: 'keep', points: spot, radius: 2 },
    ])

    expect(at(keepThenErase, 10, 5, 5)).toBe(BRUSH_ERASE)
    expect(at(eraseThenKeep, 10, 5, 5)).toBe(BRUSH_KEEP)
  })

  it('筆刷超出圖片邊緣時不會出錯，只標記圖片內的部分', () => {
    const mask = paintBrushMask(10, 10, [{ effect: 'keep', points: [{ x: 0, y: 0 }], radius: 5 }])

    expect(at(mask, 10, 0, 0)).toBe(BRUSH_KEEP)
    expect(at(mask, 10, 9, 9)).toBe(BRUSH_NONE)
  })
})

describe('applyBrushMask', () => {
  /** 3×1：去背結果全部透明，原圖是紅、綠、藍三格 */
  const original: PixelBuffer = {
    data: new Uint8ClampedArray([255, 0, 0, 255, 0, 255, 0, 255, 0, 0, 255, 255]),
    width: 3,
    height: 1,
  }
  const removed: PixelBuffer = { data: new Uint8ClampedArray(12), width: 3, height: 1 }

  it('保留：還原成原圖的像素；擦除：變透明；沒塗過的不變', () => {
    const opaque: PixelBuffer = { ...original, data: new Uint8ClampedArray(original.data) }
    const mask = new Uint8Array([BRUSH_KEEP, BRUSH_NONE, BRUSH_ERASE])

    const keptFromRemoved = applyBrushMask(removed, original, mask)
    const erasedFromOpaque = applyBrushMask(opaque, original, mask)

    expect(Array.from(keptFromRemoved.data.subarray(0, 4))).toEqual([255, 0, 0, 255]) // 保留 → 原圖紅色
    expect(keptFromRemoved.data[7]).toBe(0) // 沒塗過 → 維持透明
    expect(erasedFromOpaque.data[11]).toBe(0) // 擦除 → 透明
  })

  it('不修改傳入的圖片', () => {
    applyBrushMask(removed, original, new Uint8Array([BRUSH_KEEP, BRUSH_KEEP, BRUSH_KEEP]))

    expect(removed.data[3]).toBe(0)
  })
})
