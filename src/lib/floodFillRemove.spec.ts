import { describe, expect, it } from 'vitest'
import type { RgbColor } from './color'
import { floodFillRemove } from './floodFillRemove'
import type { PixelBuffer } from './pixelBuffer'

const WHITE: RgbColor = { r: 255, g: 255, b: 255 }
const RED: RgbColor = { r: 200, g: 30, b: 30 }

/**
 * 用文字畫造測試圖：每個字元是一個像素，palette 決定字元對應的顏色。
 * 例如 '.' = 白色背景、'#' = 紅色物件輪廓。
 */
function fromAscii(rows: string[], palette: Record<string, RgbColor>): PixelBuffer {
  const height = rows.length
  const width = rows[0].length
  const data = new Uint8ClampedArray(width * height * 4)
  rows.forEach((row, y) => {
    ;[...row].forEach((char, x) => {
      const color = palette[char]
      const i = (y * width + x) * 4
      data[i] = color.r
      data[i + 1] = color.g
      data[i + 2] = color.b
      data[i + 3] = 255
    })
  })
  return { data, width, height }
}

/** 把去背結果畫回文字：'#' = 保留（不透明）、'.' = 被移除（透明），方便直接比對 */
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

describe('floodFillRemove', () => {
  it('移除與邊界相連的背景，保留中央物件', () => {
    const image = fromAscii(
      [
        '.....', //
        '.###.',
        '.###.',
        '.....',
      ],
      { '.': WHITE, '#': RED },
    )

    const result = floodFillRemove(image, undefined, WHITE, 30)

    expect(toAlphaAscii(result)).toEqual([
      '.....', //
      '.###.',
      '.###.',
      '.....',
    ])
  })

  it('物件內部與背景同色、但被輪廓包住的區塊會保留（核心需求）', () => {
    // 紅色圓環中間有一塊白色，模擬插畫裡的白色反光
    const image = fromAscii(
      [
        '.......', //
        '.#####.',
        '.#...#.',
        '.#...#.',
        '.#####.',
        '.......',
      ],
      { '.': WHITE, '#': RED },
    )

    const result = floodFillRemove(image, undefined, WHITE, 30)

    // 外圍白色被移除；中間的白色沒有路徑通到邊界，全部保留
    expect(toAlphaAscii(result)).toEqual([
      '.......', //
      '.#####.',
      '.#####.',
      '.#####.',
      '.#####.',
      '.......',
    ])
  })

  it('物件輪廓有缺口時，內部同色區塊會從缺口被移除（連續選取的行為）', () => {
    const image = fromAscii(
      [
        '.......', //
        '.##.##.', // 上緣有一格缺口
        '.#...#.',
        '.#####.',
        '.......',
      ],
      { '.': WHITE, '#': RED },
    )

    const result = floodFillRemove(image, undefined, WHITE, 30)

    expect(toAlphaAscii(result)).toEqual([
      '.......', //
      '.##.##.',
      '.#...#.',
      '.#####.',
      '.......',
    ])
  })

  it('只靠斜角相連的區塊不會被移除（只往上下左右擴散）', () => {
    const image = fromAscii(
      [
        '.###', //
        '#.##',
        '####',
      ],
      { '.': WHITE, '#': RED },
    )

    const result = floodFillRemove(image, undefined, WHITE, 30)

    // (1,1) 的白色只和左上角斜向相鄰，不算相連
    expect(toAlphaAscii(result)).toEqual([
      '.###', //
      '####',
      '####',
    ])
  })

  describe('閾值邊界值', () => {
    // 與白色的距離剛好是 30：只有 R 通道差 30，距離 = √(30²) = 30
    const NEAR_WHITE: RgbColor = { r: 225, g: 255, b: 255 }
    const image = fromAscii(
      [
        '...', //
        '.n.',
        '...',
      ],
      { '.': WHITE, n: NEAR_WHITE },
    )

    it('顏色距離「剛好等於」閾值時視為背景，會被移除', () => {
      const result = floodFillRemove(image, undefined, WHITE, 30)
      expect(toAlphaAscii(result)[1]).toBe('...')
    })

    it('顏色距離「超過」閾值 1 時保留', () => {
      const result = floodFillRemove(image, undefined, WHITE, 29)
      expect(toAlphaAscii(result)[1]).toBe('.#.')
    })

    it('閾值為 0 時只移除和背景色完全相同的像素', () => {
      const result = floodFillRemove(image, undefined, WHITE, 0)
      expect(toAlphaAscii(result)[1]).toBe('.#.')
    })
  })

  it('物件貼著邊界時，邊界上的物件像素不會被當成起點', () => {
    const image = fromAscii(
      [
        '##..', //
        '##..',
        '....',
      ],
      { '.': WHITE, '#': RED },
    )

    const result = floodFillRemove(image, undefined, WHITE, 30)

    expect(toAlphaAscii(result)).toEqual([
      '##..', //
      '##..',
      '....',
    ])
  })

  it('形狀外（遮罩為 0）的像素一律透明，緊鄰形狀外的背景色像素會成為起點', () => {
    // 紅框包住一圈白色，正中央是一格紅色、但它在形狀外
    const image = fromAscii(
      [
        '#####', //
        '#...#',
        '#.#.#',
        '#...#',
        '#####',
      ],
      { '.': WHITE, '#': RED },
    )
    const mask = new Uint8Array(25).fill(1)
    mask[2 * 5 + 2] = 0

    const withoutMask = floodFillRemove(image, undefined, WHITE, 30)
    const withMask = floodFillRemove(image, mask, WHITE, 30)

    // 不給遮罩：內圈白色被紅框包住、碰不到邊界，全部保留
    expect(toAlphaAscii(withoutMask)).toEqual(['#####', '#####', '#####', '#####', '#####'])
    // 給遮罩：中央變透明（即使是紅色）；內圈白色緊貼著形狀外，成為起點被移除
    expect(toAlphaAscii(withMask)).toEqual(['#####', '#...#', '#...#', '#...#', '#####'])
  })

  it('不修改傳入的原始圖片', () => {
    const image = fromAscii(['...', '.#.', '...'], { '.': WHITE, '#': RED })

    floodFillRemove(image, undefined, WHITE, 30)

    expect(toAlphaAscii(image)).toEqual(['###', '###', '###'])
  })
})

describe('floodFillRemove（魔術棒）', () => {
  /**
   * 模擬氣球：兩塊被紅色輪廓包住的白色——
   * 左邊 (2,2)~(3,3) 是氣球線之間的空隙（該去掉），右邊 (7,2)~(8,3) 是氣球上的反光（該保留）。
   * 兩塊顏色、大小都一樣，程式無法自己分辨，只能靠使用者點選。
   */
  const balloons = fromAscii(
    [
      '..........', //
      '.####.####',
      '.#..#.#..#',
      '.#..#.#..#',
      '.####.####',
      '..........',
    ],
    { '.': WHITE, '#': RED },
  )

  it('點選被包住的區塊，只去掉那一塊，其他同色的包圍區塊保留', () => {
    const result = floodFillRemove(balloons, undefined, WHITE, 30, [{ x: 2, y: 2 }])

    expect(toAlphaAscii(result)).toEqual([
      '..........', //
      '.####.####',
      '.#..#.####',
      '.#..#.####',
      '.####.####',
      '..........',
    ])
  })

  it('以點到的顏色為基準：被包住的區塊和背景色差很多也能去掉', () => {
    const GRAY: RgbColor = { r: 150, g: 150, b: 150 }
    const image = fromAscii(
      [
        '.....', //
        '.###.',
        '.#g#.',
        '.###.',
        '.....',
      ],
      { '.': WHITE, '#': RED, g: GRAY },
    )

    const result = floodFillRemove(image, undefined, WHITE, 30, [{ x: 2, y: 2 }])

    expect(toAlphaAscii(result)[2]).toBe('.#.#.')
  })

  it('點到物件本身時，會把和點到顏色相近的那一塊去掉（可由使用者復原）', () => {
    const result = floodFillRemove(balloons, undefined, WHITE, 30, [{ x: 1, y: 1 }])

    // 左邊氣球的紅色輪廓被去掉，裡面的白色因為和紅色差很多而保留
    expect(toAlphaAscii(result)[1]).toBe('......####')
    expect(toAlphaAscii(result)[2]).toBe('..##..####')
  })

  it('點在已經透明的地方或圖片外，不影響結果', () => {
    const withoutSeeds = floodFillRemove(balloons, undefined, WHITE, 30)

    const result = floodFillRemove(balloons, undefined, WHITE, 30, [
      { x: 0, y: 0 },
      { x: -5, y: 3 },
      { x: 99, y: 99 },
    ])

    expect(toAlphaAscii(result)).toEqual(toAlphaAscii(withoutSeeds))
  })
})
