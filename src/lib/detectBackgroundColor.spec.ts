import { describe, expect, it } from 'vitest'
import type { RgbColor } from './color'
import { detectBackgroundColor } from './detectBackgroundColor'
import type { PixelBuffer } from './pixelBuffer'

/** 造一張純色背景 + 中央矩形色塊的測試圖，模擬「貼紙置中、四周留白」的素材圖 */
function createTestImage(
  width: number,
  height: number,
  background: RgbColor,
  patch?: { x: number; y: number; width: number; height: number; color: RgbColor },
): PixelBuffer {
  const data = new Uint8ClampedArray(width * height * 4)

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const insidePatch =
        patch && x >= patch.x && x < patch.x + patch.width && y >= patch.y && y < patch.y + patch.height
      const color = insidePatch ? patch.color : background
      const i = (y * width + x) * 4
      data[i] = color.r
      data[i + 1] = color.g
      data[i + 2] = color.b
      data[i + 3] = 255
    }
  }

  return { data, width, height }
}

/** 把圖片最外圍一圈全部塗成循環出現的多種顏色，讓邊界法找不到明顯眾數 */
function scrambleBorder(image: PixelBuffer, palette: RgbColor[]): void {
  const { width, height } = image
  let paletteIndex = 0

  const paint = (x: number, y: number) => {
    const color = palette[paletteIndex % palette.length]
    paletteIndex += 1
    const i = (y * width + x) * 4
    image.data[i] = color.r
    image.data[i + 1] = color.g
    image.data[i + 2] = color.b
  }

  for (let x = 0; x < width; x++) {
    paint(x, 0)
    paint(x, height - 1)
  }
  for (let y = 1; y < height - 1; y++) {
    paint(0, y)
    paint(width - 1, y)
  }
}

describe('detectBackgroundColor', () => {
  it('中央有插畫、四周乾淨留白時，用邊界眾數判斷背景色', () => {
    const image = createTestImage(40, 40, { r: 255, g: 255, b: 255 }, {
      x: 10,
      y: 10,
      width: 20,
      height: 20,
      color: { r: 200, g: 30, b: 30 },
    })

    expect(detectBackgroundColor(image)).toEqual({ r: 255, g: 255, b: 255 })
  })

  it('插畫畫到邊緣、邊界顏色分散時，退回全圖直方圖統計面積最大的顏色', () => {
    const background: RgbColor = { r: 255, g: 255, b: 255 }
    const image = createTestImage(40, 40, background, {
      x: 15,
      y: 15,
      width: 10,
      height: 10,
      color: { r: 10, g: 10, b: 10 },
    })

    // 讓整圈邊界都是雜色，眾數比例會遠低於信任門檻，強迫演算法走全圖直方圖那條路
    scrambleBorder(image, [
      { r: 255, g: 0, b: 0 },
      { r: 0, g: 255, b: 0 },
      { r: 0, g: 0, b: 255 },
      { r: 255, g: 255, b: 0 },
      { r: 255, g: 0, b: 255 },
    ])

    expect(detectBackgroundColor(image)).toEqual(background)
  })

  it('邊界出現少數雜訊像素時，仍能抓到真正占多數的背景色', () => {
    const image = createTestImage(20, 20, { r: 250, g: 250, b: 250 })
    // 模擬圖片壓縮造成的個別雜訊像素，數量遠不到能動搖眾數判斷的程度
    image.data[0] = 253
    image.data[4] = 5

    expect(detectBackgroundColor(image)).toEqual({ r: 250, g: 250, b: 250 })
  })

  it('極小圖片（4×4）不應該拋出例外', () => {
    const image = createTestImage(4, 4, { r: 0, g: 0, b: 0 })
    expect(() => detectBackgroundColor(image)).not.toThrow()
  })
})
