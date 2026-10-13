import { describe, expect, it } from 'vitest'
import { FIT_VIEW, MAX_ZOOM, panBy, pinchView, zoomAt } from './zoomView'

const SIZE = { width: 100, height: 100 }

describe('zoomAt', () => {
  it('游標底下的點縮放前後位置不變', () => {
    const view = zoomAt(FIT_VIEW, { x: 30, y: 60 }, 2, SIZE)

    // 內容座標 (30, 60) 放大 2 倍後在 view.x + 30 × 2，要等於游標位置
    expect(view).toEqual({ scale: 2, x: -30, y: -60 })
  })

  it('不能縮得比適應視窗小，也不能超過最大倍率', () => {
    expect(zoomAt(FIT_VIEW, { x: 50, y: 50 }, 0.5, SIZE).scale).toBe(1)
    expect(zoomAt(FIT_VIEW, { x: 50, y: 50 }, 100, SIZE).scale).toBe(MAX_ZOOM)
  })

  it('縮回 1 倍時自動回到置中，不會留下偏移', () => {
    const zoomed = zoomAt(FIT_VIEW, { x: 80, y: 20 }, 4, SIZE)

    expect(zoomAt(zoomed, { x: 10, y: 90 }, 0.1, SIZE)).toEqual(FIT_VIEW)
  })
})

describe('panBy', () => {
  it('放大後可以平移', () => {
    const view = panBy({ scale: 2, x: -50, y: -50 }, 20, -10, SIZE)

    expect(view).toEqual({ scale: 2, x: -30, y: -60 })
  })

  it('拖到底就停住：內容永遠蓋滿外框', () => {
    // 放大 2 倍後內容寬 200，x 只能在 -100 ~ 0 之間
    expect(panBy({ scale: 2, x: -50, y: -50 }, 999, -999, SIZE)).toEqual({ scale: 2, x: 0, y: -100 })
  })

  it('1 倍時拖不動', () => {
    expect(panBy(FIT_VIEW, 30, 30, SIZE)).toEqual(FIT_VIEW)
  })
})

describe('pinchView', () => {
  it('兩指張開一倍：以兩指中點為中心放大 2 倍', () => {
    const view = pinchView(FIT_VIEW, [{ x: 40, y: 50 }, { x: 60, y: 50 }], [{ x: 30, y: 50 }, { x: 70, y: 50 }], SIZE)

    // 中點 (50, 50) 縮放前後停在原地
    expect(view).toEqual({ scale: 2, x: -50, y: -50 })
  })

  it('兩指距離不變、一起移動：只平移', () => {
    const zoomed = { scale: 2, x: -50, y: -50 }

    const view = pinchView(zoomed, [{ x: 40, y: 50 }, { x: 60, y: 50 }], [{ x: 50, y: 40 }, { x: 70, y: 40 }], SIZE)

    expect(view).toEqual({ scale: 2, x: -40, y: -60 })
  })

  it('兩指疊在同一點時不會算出無限大，只平移', () => {
    const view = pinchView({ scale: 2, x: -50, y: -50 }, [{ x: 50, y: 50 }, { x: 50, y: 50 }], [{ x: 60, y: 50 }, { x: 60, y: 50 }], SIZE)

    expect(view).toEqual({ scale: 2, x: -40, y: -50 })
  })
})
