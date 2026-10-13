import { describe, expect, it } from 'vitest'
import {
  boundsToDisplay,
  clampPoint,
  composeViewTransform,
  containedPointToImage,
  displayToSource,
  sourceToDisplay,
} from './coordinates'
import { FIT_VIEW } from './zoomView'

/** 只有縮放、沒有偏移的換算 */
const scaled = (scale: number) => ({ scale, offsetX: 0, offsetY: 0 })

describe('displayToSource', () => {
  it('畫面縮小一半顯示時，畫面座標要放大兩倍才是原圖座標', () => {
    expect(displayToSource({ x: 100, y: 50 }, scaled(0.5))).toEqual({ x: 200, y: 100 })
  })

  it('畫面放大兩倍顯示時，畫面座標要縮小一半才是原圖座標', () => {
    expect(displayToSource({ x: 100, y: 50 }, scaled(2))).toEqual({ x: 50, y: 25 })
  })

  it('圖片有偏移（置中留白或平移過）時，先扣掉偏移再換算', () => {
    expect(displayToSource({ x: 130, y: 70 }, { scale: 2, offsetX: 30, offsetY: 10 })).toEqual({ x: 50, y: 30 })
  })

  it('scale 無效（圖片尚未顯示）時回傳原點，避免除以 0 得到 Infinity', () => {
    expect(displayToSource({ x: 100, y: 50 }, scaled(0))).toEqual({ x: 0, y: 0 })
  })
})

describe('sourceToDisplay', () => {
  it('來回換算後回到原本的點', () => {
    const original = { x: 123, y: 456 }
    const transform = { scale: 0.37, offsetX: -40, offsetY: 12.5 }

    const roundTrip = displayToSource(sourceToDisplay(original, transform), transform)

    expect(roundTrip.x).toBeCloseTo(original.x)
    expect(roundTrip.y).toBeCloseTo(original.y)
  })
})

describe('clampPoint', () => {
  it('超出圖片範圍的點會被拉回邊界', () => {
    expect(clampPoint({ x: -10, y: 900 }, 800, 600)).toEqual({ x: 0, y: 600 })
  })

  it('在範圍內的點保持不變', () => {
    expect(clampPoint({ x: 10, y: 20 }, 800, 600)).toEqual({ x: 10, y: 20 })
  })
})

describe('containedPointToImage', () => {
  // 100×50 的圖放進 200×200 的框：放大 2 倍成 200×100，上下各留白 50
  const element = { width: 200, height: 200 }
  const image = { width: 100, height: 50 }

  function toImage(x: number, y: number) {
    return containedPointToImage({ x, y }, element.width, element.height, image.width, image.height)
  }

  it('點在圖片左上角，對應到像素 (0, 0)', () => {
    expect(toImage(0, 50)).toEqual({ x: 0, y: 0 })
  })

  it('點在圖片中央，扣掉留白再除以放大倍率', () => {
    expect(toImage(100, 100)).toEqual({ x: 50, y: 25 })
  })

  it('點在上方或下方的留白處，回傳 null', () => {
    expect(toImage(100, 20)).toBeNull()
    expect(toImage(100, 160)).toBeNull()
  })
})

describe('boundsToDisplay', () => {
  it('位置與寬高都乘上縮放比例', () => {
    expect(boundsToDisplay({ x: 10, y: 20, width: 100, height: 50 }, scaled(0.5))).toEqual({ x: 5, y: 10, width: 50, height: 25 })
  })

  it('位置要加上偏移，寬高不受偏移影響', () => {
    expect(boundsToDisplay({ x: 10, y: 20, width: 100, height: 50 }, { scale: 1, offsetX: 5, offsetY: -5 })).toEqual({
      x: 15,
      y: 15,
      width: 100,
      height: 50,
    })
  })
})

describe('composeViewTransform', () => {
  it('沒放大時：等比塞進扣掉邊距的外框並置中', () => {
    // 200×100 的圖放進 420×220 的外框，四周各留 10 → 可用 400×200，剛好放大 2 倍
    expect(composeViewTransform(200, 100, 420, 220, 10, FIT_VIEW)).toEqual({ scale: 2, offsetX: 10, offsetY: 10 })
  })

  it('長寬比不同時，短的那一邊置中留白', () => {
    // 100×100 的圖放進 420×220：可用 400×200，以高為準放大 2 倍 → 寬 200，左右各留 110
    expect(composeViewTransform(100, 100, 420, 220, 10, FIT_VIEW)).toEqual({ scale: 2, offsetX: 110, offsetY: 10 })
  })

  it('疊上縮放視角：倍率相乘，置中位置也跟著放大後再平移', () => {
    const view = { scale: 2, x: -100, y: -50 }

    expect(composeViewTransform(200, 100, 420, 220, 10, view)).toEqual({ scale: 4, offsetX: -80, offsetY: -30 })
  })
})
