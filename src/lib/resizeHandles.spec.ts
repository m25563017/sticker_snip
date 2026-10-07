import { describe, expect, it } from 'vitest'
import { hitTestHandle, resizeBounds } from './resizeHandles'

const box = { x: 10, y: 20, width: 100, height: 50 }

describe('hitTestHandle', () => {
  it('游標在角或邊的中點附近時，回傳對應的控制點', () => {
    expect(hitTestHandle(box, { x: 12, y: 18 }, 4)).toBe('nw')
    expect(hitTestHandle(box, { x: 110, y: 70 }, 4)).toBe('se')
    expect(hitTestHandle(box, { x: 60, y: 22 }, 4)).toBe('n')
    expect(hitTestHandle(box, { x: 108, y: 45 }, 4)).toBe('e')
  })

  it('游標離控制點太遠（例如在框的中間或邊線的其他位置）時回傳 null', () => {
    expect(hitTestHandle(box, { x: 60, y: 45 }, 4)).toBeNull()
    expect(hitTestHandle(box, { x: 30, y: 20 }, 4)).toBeNull()
  })

  it('框很小、角和邊的中點擠在一起時，角優先', () => {
    const tiny = { x: 0, y: 0, width: 4, height: 4 }
    expect(hitTestHandle(tiny, { x: 1, y: 0 }, 4)).toBe('nw')
  })
})

describe('resizeBounds', () => {
  it('拖右下角：左上角固定，寬高跟著變', () => {
    expect(resizeBounds(box, 'se', { x: 150, y: 100 })).toEqual({ x: 10, y: 20, width: 140, height: 80 })
  })

  it('拖上邊的中點：只改上緣，左右不動', () => {
    expect(resizeBounds(box, 'n', { x: 999, y: 0 })).toEqual({ x: 10, y: 0, width: 100, height: 70 })
  })

  it('拖過頭時自動翻轉，寬高維持正數', () => {
    // 把左邊拖到右邊（110）之外的 130
    expect(resizeBounds(box, 'w', { x: 130, y: 45 })).toEqual({ x: 110, y: 20, width: 20, height: 50 })
  })
})
