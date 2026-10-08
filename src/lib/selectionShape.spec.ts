import { describe, expect, it } from 'vitest'
import { createDefaultWhiteBorder, DEFAULT_THRESHOLD, type Bounds, type Point, type Selection } from '@/types/selection'
import { containsPoint, createShapeMask, findSelectionAt, selectionBounds } from './selectionShape'

const common = {
  id: 1,
  createdBy: 'manual' as const,
  whiteBorder: createDefaultWhiteBorder(),
  backgroundColor: null,
  threshold: DEFAULT_THRESHOLD,
  isManualColor: false,
  manualEdits: [],
}
const rect = (bounds: Bounds): Selection => ({ ...common, type: 'rect', bounds })
const ellipse = (bounds: Bounds): Selection => ({ ...common, type: 'ellipse', bounds })
const lasso = (points: Point[]): Selection => ({ ...common, type: 'lasso', points })

/** 遮罩畫成文字：'#' = 形狀內 */
function maskToAscii(mask: Uint8Array, width: number): string[] {
  const rows: string[] = []
  for (let start = 0; start < mask.length; start += width) {
    rows.push(Array.from(mask.subarray(start, start + width), (value) => (value ? '#' : '.')).join(''))
  }
  return rows
}

describe('selectionBounds', () => {
  it('套索取所有點的最小外框，往外取整到完整像素', () => {
    const shape = lasso([
      { x: 2.5, y: 1 },
      { x: 8, y: 4.2 },
      { x: 1, y: 6 },
    ])
    expect(selectionBounds(shape)).toEqual({ x: 1, y: 1, width: 7, height: 5 })
  })
})

describe('containsPoint', () => {
  it('橢圓：外框的角落不算在形狀內', () => {
    const shape = ellipse({ x: 0, y: 0, width: 10, height: 10 })
    expect(containsPoint(shape, { x: 5, y: 5 })).toBe(true)
    expect(containsPoint(shape, { x: 0.5, y: 0.5 })).toBe(false)
  })

  it('套索：凹進去的地方不算在形狀內', () => {
    // L 形：右上角是凹進去的缺口
    const shape = lasso([
      { x: 0, y: 0 },
      { x: 4, y: 0 },
      { x: 4, y: 6 },
      { x: 10, y: 6 },
      { x: 10, y: 10 },
      { x: 0, y: 10 },
    ])
    expect(containsPoint(shape, { x: 2, y: 2 })).toBe(true)
    expect(containsPoint(shape, { x: 8, y: 2 })).toBe(false)
  })
})

describe('createShapeMask', () => {
  it('橢圓：只有內切的圓形範圍是形狀內', () => {
    const mask = createShapeMask(ellipse({ x: 0, y: 0, width: 7, height: 7 }), { x: 0, y: 0, width: 7, height: 7 })

    expect(maskToAscii(mask, 7)).toEqual([
      '..###..', //
      '.#####.',
      '#######',
      '#######',
      '#######',
      '.#####.',
      '..###..',
    ])
  })

  it('套索：沒有畫回起點時，自動以直線連回起點封閉', () => {
    // 只給三個點（沒有回到起點），應該得到一個三角形
    const shape = lasso([
      { x: 0, y: 0 },
      { x: 8, y: 0 },
      { x: 0, y: 8 },
    ])

    expect(maskToAscii(createShapeMask(shape, { x: 0, y: 0, width: 8, height: 8 }), 8)).toEqual([
      '#######.', //
      '######..',
      '#####...',
      '####....',
      '###.....',
      '##......',
      '#.......',
      '........',
    ])
  })

  it('裁切範圍被截掉一部分時，遮罩仍對應到原圖上正確的位置', () => {
    // 橢圓左半邊超出原圖，實際裁切只剩右半（x 從 3 開始）
    const shape = ellipse({ x: 0, y: 0, width: 7, height: 7 })
    const mask = createShapeMask(shape, { x: 3, y: 0, width: 4, height: 7 })

    expect(maskToAscii(mask, 4)).toEqual(['##..', '###.', '####', '####', '####', '###.', '##..'])
  })

  it('矩形：全部都在形狀內', () => {
    expect(createShapeMask(rect({ x: 0, y: 0, width: 3, height: 2 }), { x: 0, y: 0, width: 3, height: 2 })).toEqual(
      new Uint8Array(6).fill(1),
    )
  })
})

describe('findSelectionAt', () => {
  it('點在大框裡的小框內時選小框；點在橢圓外框的角落時不會選到橢圓', () => {
    const big = rect({ x: 0, y: 0, width: 100, height: 100 })
    const small = ellipse({ x: 10, y: 10, width: 20, height: 20 })

    expect(findSelectionAt([big, small], { x: 20, y: 20 })).toBe(1)
    expect(findSelectionAt([big, small], { x: 11, y: 11 })).toBe(0) // 橢圓的角落 → 只算大框
    expect(findSelectionAt([big, small], { x: 200, y: 200 })).toBe(-1)
  })
})
