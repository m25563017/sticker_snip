import { describe, expect, it } from 'vitest'
import { boundsToDisplay, clampPoint, containedPointToImage, displayToSource, sourceToDisplay } from './coordinates'

describe('displayToSource', () => {
  it('畫面縮小一半顯示時，畫面座標要放大兩倍才是原圖座標', () => {
    expect(displayToSource({ x: 100, y: 50 }, 0.5)).toEqual({ x: 200, y: 100 })
  })

  it('畫面放大兩倍顯示時，畫面座標要縮小一半才是原圖座標', () => {
    expect(displayToSource({ x: 100, y: 50 }, 2)).toEqual({ x: 50, y: 25 })
  })

  it('scale 無效（圖片尚未顯示）時回傳原點，避免除以 0 得到 Infinity', () => {
    expect(displayToSource({ x: 100, y: 50 }, 0)).toEqual({ x: 0, y: 0 })
  })
})

describe('sourceToDisplay', () => {
  it('來回換算後回到原本的點', () => {
    const original = { x: 123, y: 456 }
    const scale = 0.37

    const roundTrip = displayToSource(sourceToDisplay(original, scale), scale)

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
    expect(boundsToDisplay({ x: 10, y: 20, width: 100, height: 50 }, 0.5)).toEqual({ x: 5, y: 10, width: 50, height: 25 })
  })
})
