import { describe, expect, it } from 'vitest'
import type { RgbColor } from './color'
import { defaultMergeDistance, detectStickers, findCanvasBackground } from './detectStickers'
import type { PixelBuffer } from './pixelBuffer'

const WHITE: RgbColor = { r: 255, g: 255, b: 255 }
const RED: RgbColor = { r: 200, g: 30, b: 30 }

interface Block {
  x: number
  y: number
  width: number
  height: number
  color?: RgbColor
}

/** 在純色（或透明）底上畫幾個實心矩形，模擬合成圖上的貼紙 */
function makeImage(width: number, height: number, blocks: Block[], background: RgbColor | null = WHITE): PixelBuffer {
  const data = new Uint8ClampedArray(width * height * 4)
  const paint = (x: number, y: number, color: RgbColor | null) => {
    const i = (y * width + x) * 4
    if (!color) return // 透明：全部維持 0
    data[i] = color.r
    data[i + 1] = color.g
    data[i + 2] = color.b
    data[i + 3] = 255
  }
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) paint(x, y, background)
  for (const block of blocks) {
    for (let y = block.y; y < block.y + block.height; y++) {
      for (let x = block.x; x < block.x + block.width; x++) paint(x, y, block.color ?? RED)
    }
  }
  return { data, width, height }
}

describe('detectStickers', () => {
  it('分開的貼紙各自框出，外框加上留白', () => {
    const image = makeImage(60, 30, [
      { x: 5, y: 5, width: 10, height: 10 },
      { x: 40, y: 5, width: 10, height: 10 },
    ])

    const boxes = detectStickers(image, { mergeDistance: 2 })

    expect(boxes).toEqual([
      { x: 3, y: 3, width: 14, height: 14 },
      { x: 38, y: 3, width: 14, height: 14 },
    ])
  })

  it('飄在旁邊、距離在合併距離內的小裝飾併進同一張', () => {
    const image = makeImage(60, 30, [
      { x: 5, y: 5, width: 10, height: 10 },
      { x: 18, y: 6, width: 3, height: 3 }, // 和主體相距 3 px
    ])

    expect(detectStickers(image, { mergeDistance: 4 })).toHaveLength(1)
    expect(detectStickers(image, { mergeDistance: 0 })).toHaveLength(1) // 太遠又太小 → 被當成零散裝飾濾掉
  })

  it('離每張貼紙都很遠的小星星不算貼紙', () => {
    const image = makeImage(80, 40, [
      { x: 5, y: 5, width: 12, height: 12 },
      { x: 55, y: 5, width: 12, height: 12 },
      { x: 35, y: 25, width: 2, height: 2 },
    ])

    expect(detectStickers(image, { mergeDistance: 2 })).toHaveLength(2)
  })

  it('碰到圖片邊緣的橫幅、外框不算貼紙', () => {
    const image = makeImage(60, 40, [
      { x: 0, y: 0, width: 60, height: 6 }, // 頂部橫幅
      { x: 10, y: 15, width: 12, height: 12 },
      { x: 35, y: 15, width: 12, height: 12 },
    ])

    const boxes = detectStickers(image, { mergeDistance: 2 })

    expect(boxes).toHaveLength(2)
    expect(boxes.every((box) => box.y > 6)).toBe(true)
  })

  it('依閱讀順序排列：由上到下、由左到右，容忍上下些微錯位', () => {
    const image = makeImage(80, 80, [
      { x: 45, y: 8, width: 12, height: 12 }, // 右上（稍微低一點）
      { x: 5, y: 5, width: 12, height: 12 }, // 左上
      { x: 45, y: 45, width: 12, height: 12 }, // 右下
      { x: 5, y: 47, width: 12, height: 12 }, // 左下
    ])

    const boxes = detectStickers(image, { mergeDistance: 2 })

    expect(boxes.map((box) => [box.x + 2, box.y + 2])).toEqual([
      [5, 5],
      [45, 8],
      [5, 47],
      [45, 45],
    ])
  })

  it('透明底的 PNG 也能偵測', () => {
    const image = makeImage(
      60,
      30,
      [
        { x: 5, y: 5, width: 10, height: 10 },
        { x: 40, y: 5, width: 10, height: 10 },
      ],
      null,
    )

    expect(detectStickers(image, { mergeDistance: 2 })).toHaveLength(2)
  })
})

describe('findCanvasBackground', () => {
  it('取整張圖最多的顏色，不受貼著邊緣的外框影響', () => {
    // 紅色外框一圈 + 內部白底：只看邊緣會誤判成紅色
    const image = makeImage(40, 40, [
      { x: 0, y: 0, width: 40, height: 3 },
      { x: 0, y: 37, width: 40, height: 3 },
      { x: 0, y: 0, width: 3, height: 40 },
      { x: 37, y: 0, width: 3, height: 40 },
    ])

    expect(findCanvasBackground(image)).toEqual(WHITE)
  })

  it('透明像素比任何顏色都多時，回傳 null 代表背景是透明', () => {
    const image = makeImage(20, 20, [{ x: 5, y: 5, width: 4, height: 4 }], null)

    expect(findCanvasBackground(image)).toBeNull()
  })
})

describe('detectStickers（小裝飾比貼紙還多時）', () => {
  it('滿版小星星拉低中位數時，仍以最大那張為準濾掉', () => {
    // 1 張大貼紙 + 5 顆小星星：中位數是星星的大小，只看中位數會把星星全部留下
    const stars = [10, 30, 50, 70, 90].map((x) => ({ x, y: 85, width: 3, height: 3 }))
    const image = makeImage(110, 100, [{ x: 20, y: 10, width: 60, height: 60 }, ...stars])

    expect(detectStickers(image, { mergeDistance: 2 })).toHaveLength(1)
  })
})

describe('defaultMergeDistance', () => {
  it('預設為長邊的 1%，至少 1 px', () => {
    expect(defaultMergeDistance(1200, 1448)).toBe(14)
    expect(defaultMergeDistance(50, 40)).toBe(1)
  })
})
