import { describe, expect, it } from 'vitest'
import type { RgbColor } from './color'
import type { PixelBuffer } from './pixelBuffer'
import { refineEdges } from './refineEdges'

type Rgba = [number, number, number, number]

const WHITE: RgbColor = { r: 255, g: 255, b: 255 }
const TRANSPARENT: Rgba = [255, 255, 255, 0]
const RED: Rgba = [200, 30, 30, 255]
/** 紅色與白色各半混出來的邊緣像素：(200+255)/2、(30+255)/2，也就是原圖抗鋸齒產生的光暈 */
const HALF_RED_HALF_WHITE: Rgba = [228, 143, 143, 255]

/**
 * 造一張每一列都相同的測試圖，高度 5：
 * 邊緣沿著直線分布，取中間那列（y = 2）檢查，上下都有鄰居，不受圖片上下邊界影響。
 */
function makeColumns(columns: Rgba[], height = 5): PixelBuffer {
  const width = columns.length
  const data = new Uint8ClampedArray(width * height * 4)
  for (let y = 0; y < height; y++) {
    columns.forEach((pixel, x) => data.set(pixel, (y * width + x) * 4))
  }
  return { data, width, height }
}

function pixelAt(image: PixelBuffer, x: number, y = 2): Rgba {
  const i = (y * image.width + x) * 4
  return [image.data[i], image.data[i + 1], image.data[i + 2], image.data[i + 3]]
}

/** 透明 | 光暈 | 紅色物件 × 8 */
const haloImage = makeColumns([TRANSPARENT, HALF_RED_HALF_WHITE, ...Array<Rgba>(8).fill(RED)])

describe('refineEdges', () => {
  it('pixel 模式不做任何處理', () => {
    const result = refineEdges(haloImage, WHITE, 'pixel')

    expect(Array.from(result.data)).toEqual(Array.from(haloImage.data))
  })

  it('混了白色的邊緣像素：顏色還原成物件色，混進來的白色改用半透明表達', () => {
    const result = refineEdges(haloImage, WHITE, 'smooth')
    const [r, g, b, a] = pixelAt(result, 1)

    // 一半是白色 → 透明度約一半
    expect(a).toBeGreaterThan(118)
    expect(a).toBeLessThan(138)
    // 白色成分扣掉後，顏色回到紅色
    expect(r).toBeCloseTo(200, -1)
    expect(g).toBeCloseTo(30, -1)
    expect(b).toBeCloseTo(30, -1)
  })

  it('物件內部的像素完全不動', () => {
    const result = refineEdges(haloImage, WHITE, 'smooth')

    expect(pixelAt(result, 6)).toEqual(RED)
  })

  it('ultra：沒有混色的硬邊會被羽化成半透明（抗鋸齒），往內幾格就恢復不透明', () => {
    const image = makeColumns([TRANSPARENT, ...Array<Rgba>(8).fill(RED)])

    const result = refineEdges(image, WHITE, 'ultra')

    const edgeAlpha = pixelAt(result, 1)[3]
    expect(edgeAlpha).toBeGreaterThan(0)
    expect(edgeAlpha).toBeLessThan(255)
    // 顏色本來就是純物件色，不應該被改動
    expect(pixelAt(result, 1).slice(0, 3)).toEqual(RED.slice(0, 3))
    expect(pixelAt(result, 3)[3]).toBe(255)
  })

  it('物件本身是接近背景的淺色時，不做解混色（避免把貼紙的白色部分變透明）', () => {
    const LIGHT_GRAY: Rgba = [240, 240, 240, 255]
    const NEAR_WHITE: Rgba = [248, 248, 248, 255]
    const image = makeColumns([TRANSPARENT, NEAR_WHITE, ...Array<Rgba>(8).fill(LIGHT_GRAY)])

    const result = refineEdges(image, WHITE, 'smooth')
    const [r, g, b, a] = pixelAt(result, 1)

    // 顏色維持原樣，只有羽化造成的部分透明，不會被當成背景整個變透明
    expect([r, g, b]).toEqual([248, 248, 248])
    expect(a).toBeGreaterThan(150)
  })

  it('ultra：物件貼著圖片上下邊緣時，羽化程度和其他地方一致', () => {
    const image = makeColumns([TRANSPARENT, ...Array<Rgba>(8).fill(RED)])

    const result = refineEdges(image, WHITE, 'ultra')

    // 第一列（上方已是圖片邊界）和中間列的透明度應該一樣
    expect(pixelAt(result, 1, 0)[3]).toBe(pixelAt(result, 1, 2)[3])
  })

  it('ultra：細線條（沒有內部）不會被羽化變淡', () => {
    // 2 px 寬的紅線，兩側都是透明
    const image = makeColumns([TRANSPARENT, TRANSPARENT, RED, RED, TRANSPARENT, TRANSPARENT])

    const result = refineEdges(image, WHITE, 'ultra')

    expect(pixelAt(result, 2)).toEqual(RED)
    expect(pixelAt(result, 3)).toEqual(RED)
  })

  it('細線條邊緣的光暈也會扣掉：用線條中心的顏色當作純物件色', () => {
    // 光暈 | 紅色中心 | 光暈，整條只有 3 px 寬
    const image = makeColumns([TRANSPARENT, HALF_RED_HALF_WHITE, RED, HALF_RED_HALF_WHITE, TRANSPARENT])

    const result = refineEdges(image, WHITE, 'smooth')

    expect(pixelAt(result, 2)).toEqual(RED)
    const [, g, , a] = pixelAt(result, 1)
    expect(a).toBeGreaterThan(118)
    expect(a).toBeLessThan(138)
    expect(g).toBeCloseTo(30, -1)
  })

  it('smooth：沒有混色的硬邊維持原樣（不羽化，避免小物件整體變淡）', () => {
    const image = makeColumns([TRANSPARENT, ...Array<Rgba>(8).fill(RED)])

    const result = refineEdges(image, WHITE, 'smooth')

    expect(pixelAt(result, 1)).toEqual(RED)
  })

  it('ultra 模式同樣能去除光暈', () => {
    const result = refineEdges(haloImage, WHITE, 'ultra')

    expect(pixelAt(result, 1)[3]).toBeLessThan(138)
    expect(pixelAt(result, 1)[1]).toBeCloseTo(30, -1)
  })

  it('不修改傳入的原始圖片', () => {
    const before = Array.from(haloImage.data)

    refineEdges(haloImage, WHITE, 'smooth')

    expect(Array.from(haloImage.data)).toEqual(before)
  })
})
