import { describe, expect, it } from 'vitest'
import { isRectTooSmall, rectFromPoints } from './rect'

describe('rectFromPoints', () => {
  it('從左上拖到右下，得到正常的矩形', () => {
    expect(rectFromPoints({ x: 10, y: 20 }, { x: 110, y: 70 })).toEqual({
      x: 10,
      y: 20,
      width: 100,
      height: 50,
    })
  })

  it('從右下拖到左上，結果和反方向拖一樣', () => {
    const forward = rectFromPoints({ x: 10, y: 20 }, { x: 110, y: 70 })
    const backward = rectFromPoints({ x: 110, y: 70 }, { x: 10, y: 20 })
    expect(backward).toEqual(forward)
  })

  it('小數座標會四捨五入成整數像素', () => {
    expect(rectFromPoints({ x: 10.4, y: 20.6 }, { x: 50.5, y: 60.2 })).toEqual({
      x: 10,
      y: 21,
      width: 41,
      height: 39,
    })
  })
})

describe('isRectTooSmall', () => {
  it('寬或高任一邊小於門檻就視為誤點', () => {
    expect(isRectTooSmall({ x: 0, y: 0, width: 3, height: 100 }, 5)).toBe(true)
    expect(isRectTooSmall({ x: 0, y: 0, width: 100, height: 3 }, 5)).toBe(true)
  })

  it('剛好等於門檻時保留', () => {
    expect(isRectTooSmall({ x: 0, y: 0, width: 5, height: 5 }, 5)).toBe(false)
  })
})
