import { describe, expect, it } from 'vitest'
import { DEFAULT_THRESHOLD, type Bounds, type Selection } from '@/types/selection'
import { cropSelection } from './cropSelection'
import type { PixelBuffer } from './pixelBuffer'

/**
 * 造一張「每個像素自帶座標」的測試圖：R = x、G = y。
 * 裁切後只要讀某格的 R/G，就能知道它是不是從原圖正確位置複製過來的。
 */
function makeCoordinateImage(width: number, height: number): PixelBuffer {
  const data = new Uint8ClampedArray(width * height * 4)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4
      data[i] = x
      data[i + 1] = y
      data[i + 2] = 0
      data[i + 3] = 255
    }
  }
  return { data, width, height }
}

function makeRectSelection(bounds: Bounds): Selection {
  return {
    id: 1,
    createdBy: 'manual',
    type: 'rect',
    bounds,
    backgroundColor: null,
    threshold: DEFAULT_THRESHOLD,
    manualEdits: [],
  }
}

/** 讀出裁切結果中某個像素原本的座標 */
function originOf(image: PixelBuffer, x: number, y: number): { x: number; y: number } {
  const i = (y * image.width + x) * 4
  return { x: image.data[i], y: image.data[i + 1] }
}

describe('cropSelection', () => {
  it('裁出的尺寸等於選取範圍', () => {
    const source = makeCoordinateImage(20, 20)

    const { image } = cropSelection(source, makeRectSelection({ x: 5, y: 3, width: 8, height: 6 }))

    expect(image.width).toBe(8)
    expect(image.height).toBe(6)
    expect(image.data.length).toBe(8 * 6 * 4)
  })

  it('裁出的像素來自原圖正確的位置', () => {
    const source = makeCoordinateImage(20, 20)

    const { image } = cropSelection(source, makeRectSelection({ x: 5, y: 3, width: 8, height: 6 }))

    // 裁切結果的左上角 = 原圖 (5, 3)，右下角 = 原圖 (12, 8)
    expect(originOf(image, 0, 0)).toEqual({ x: 5, y: 3 })
    expect(originOf(image, 7, 5)).toEqual({ x: 12, y: 8 })
  })

  it('矩形的遮罩全部為 1', () => {
    const source = makeCoordinateImage(20, 20)

    const { mask } = cropSelection(source, makeRectSelection({ x: 0, y: 0, width: 4, height: 3 }))

    expect(mask.length).toBe(12)
    expect(mask.every((value) => value === 1)).toBe(true)
  })

  it('範圍超出原圖時，只裁出重疊的部分', () => {
    const source = makeCoordinateImage(10, 10)

    const { image, mask, origin } = cropSelection(
      source,
      makeRectSelection({ x: 6, y: -2, width: 10, height: 5 }),
    )

    // x: 6~10、y: 0~3 才是真正在圖內的部分
    expect(origin).toEqual({ x: 6, y: 0 })
    expect(image.width).toBe(4)
    expect(image.height).toBe(3)
    expect(mask.length).toBe(12)
    expect(originOf(image, 0, 0)).toEqual({ x: 6, y: 0 })
  })

  it('修改裁切結果不會影響原圖', () => {
    const source = makeCoordinateImage(10, 10)
    const { image } = cropSelection(source, makeRectSelection({ x: 0, y: 0, width: 2, height: 2 }))

    image.data[3] = 0 // 把裁切結果第一個像素改成透明

    expect(source.data[3]).toBe(255)
  })
})
