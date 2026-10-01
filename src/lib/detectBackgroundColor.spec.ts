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

/** 依條件產生遮罩：condition 回傳 true 的位置為 1（形狀內） */
function createMask(width: number, height: number, condition: (x: number, y: number) => boolean): Uint8Array {
  const mask = new Uint8Array(width * height)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      mask[y * width + x] = condition(x, y) ? 1 : 0
    }
  }
  return mask
}

/** 把遮罩為 0 的位置全部塗成指定顏色，模擬「形狀外是別的東西」 */
function paintOutsideMask(image: PixelBuffer, mask: Uint8Array, color: RgbColor): void {
  for (let i = 0; i < mask.length; i++) {
    if (mask[i] === 1) continue
    image.data[i * 4] = color.r
    image.data[i * 4 + 1] = color.g
    image.data[i * 4 + 2] = color.b
  }
}

describe('detectBackgroundColor（搭配形狀遮罩）', () => {
  const white: RgbColor = { r: 255, g: 255, b: 255 }
  const red: RgbColor = { r: 255, g: 0, b: 0 }

  it('只看形狀的邊界，形狀外的角落不參與判斷', () => {
    // 20×20 的圖裡放一個半徑 7 的圓：圓內白色，圓外（包含整圈外框）紅色
    const circle = createMask(20, 20, (x, y) => (x - 9.5) ** 2 + (y - 9.5) ** 2 <= 49)
    const image = createTestImage(20, 20, white)
    paintOutsideMask(image, circle, red)

    // 不給遮罩：外框一圈全是紅色，會誤判成紅色
    expect(detectBackgroundColor(image)).toEqual(red)
    // 給遮罩：沿著圓的輪廓取樣，正確判斷為白色
    expect(detectBackgroundColor(image, circle)).toEqual(white)
  })

  it('退回直方圖時，也只統計形狀內的像素', () => {
    const green: RgbColor = { r: 0, g: 200, b: 0 }
    // 只有左半邊在形狀內；左半邊內部綠色，右半邊（形狀外）紅色且面積比綠色大
    const leftHalf = createMask(40, 40, (x) => x < 20)
    const image = createTestImage(40, 40, green)
    paintOutsideMask(image, leftHalf, red)

    // 把左半邊的形狀邊界塗成雜色，逼演算法退回直方圖
    const palette = [
      { r: 10, g: 10, b: 200 },
      { r: 200, g: 200, b: 0 },
      { r: 200, g: 0, b: 200 },
      { r: 0, g: 200, b: 200 },
      { r: 90, g: 90, b: 90 },
    ]
    let paletteIndex = 0
    for (let y = 0; y < 40; y++) {
      for (let x = 0; x < 20; x++) {
        if (x !== 0 && x !== 19 && y !== 0 && y !== 39) continue
        const color = palette[paletteIndex++ % palette.length]
        const i = (y * 40 + x) * 4
        image.data[i] = color.r
        image.data[i + 1] = color.g
        image.data[i + 2] = color.b
      }
    }

    // 若右半邊的紅色也被統計進去，紅色（800 px）會贏過綠色（684 px）
    expect(detectBackgroundColor(image, leftHalf)).toEqual(green)
  })

  it('遮罩全為 1 時，結果與不傳遮罩相同', () => {
    const image = createTestImage(30, 30, white, {
      x: 8,
      y: 8,
      width: 14,
      height: 14,
      color: red,
    })
    const fullMask = new Uint8Array(30 * 30).fill(1)

    expect(detectBackgroundColor(image, fullMask)).toEqual(detectBackgroundColor(image))
  })
})
