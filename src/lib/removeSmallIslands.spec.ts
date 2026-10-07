import { describe, expect, it } from 'vitest'
import type { PixelBuffer } from './pixelBuffer'
import { minIslandArea, removeSmallIslands } from './removeSmallIslands'

/** 用文字畫造測試圖：'#' = 不透明像素、'.' = 透明像素（顏色不影響孤島判斷） */
function fromAlphaAscii(rows: string[]): PixelBuffer {
  const height = rows.length
  const width = rows[0].length
  const data = new Uint8ClampedArray(width * height * 4)
  rows.forEach((row, y) => {
    ;[...row].forEach((char, x) => {
      const i = (y * width + x) * 4
      data[i] = 100
      data[i + 1] = 100
      data[i + 2] = 100
      data[i + 3] = char === '#' ? 255 : 0
    })
  })
  return { data, width, height }
}

function toAlphaAscii(image: PixelBuffer): string[] {
  const rows: string[] = []
  for (let y = 0; y < image.height; y++) {
    let row = ''
    for (let x = 0; x < image.width; x++) {
      row += image.data[(y * image.width + x) * 4 + 3] === 0 ? '.' : '#'
    }
    rows.push(row)
  }
  return rows
}

describe('removeSmallIslands', () => {
  it('清掉孤立的小雜點，保留主體', () => {
    const image = fromAlphaAscii([
      '#.......', //
      '..####..',
      '..####..',
      '..####.#',
    ])

    const result = removeSmallIslands(image, 5)

    expect(toAlphaAscii(result)).toEqual([
      '........', //
      '..####..',
      '..####..',
      '..####..',
    ])
  })

  it('和主體分開、但面積夠大的小裝飾會保留（不是只留最大塊）', () => {
    const image = fromAlphaAscii([
      '######...', //
      '######.##',
      '######.##',
      '######.##',
    ])

    const result = removeSmallIslands(image, 5)

    // 右邊 2×3 = 6 px 的小塊 ≥ 5，保留
    expect(toAlphaAscii(result)).toEqual(toAlphaAscii(image))
  })

  it('只靠斜角相連的像素算同一座島（手繪細斜線不會被拆散誤刪）', () => {
    const image = fromAlphaAscii([
      '#.....', //
      '.#....',
      '..#...',
      '...#..',
      '....#.',
    ])

    const result = removeSmallIslands(image, 5)

    expect(toAlphaAscii(result)).toEqual(toAlphaAscii(image))
  })

  describe('面積門檻邊界值', () => {
    const image = fromAlphaAscii([
      '###.', //
      '##..',
    ])

    it('面積剛好等於門檻時保留', () => {
      expect(toAlphaAscii(removeSmallIslands(image, 5))).toEqual(['###.', '##..'])
    })

    it('面積比門檻少 1 時清除', () => {
      expect(toAlphaAscii(removeSmallIslands(image, 6))).toEqual(['....', '....'])
    })
  })

  it('不修改傳入的原始圖片', () => {
    const image = fromAlphaAscii(['#..', '...'])

    removeSmallIslands(image, 5)

    expect(toAlphaAscii(image)).toEqual(['#..', '...'])
  })
})

describe('minIslandArea', () => {
  it('小範圍時使用下限 8 px', () => {
    expect(minIslandArea(50, 50)).toBe(8)
  })

  it('大範圍時依面積比例放大門檻', () => {
    // 實際素材的範圍大小：約 13 萬 px → 門檻 13 px，介於雜點（≤ 5）與最小裝飾（≈ 50）之間
    expect(minIslandArea(457, 289)).toBe(13)
    expect(minIslandArea(2000, 2000)).toBe(400)
  })
})
