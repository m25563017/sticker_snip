import { describe, expect, it } from 'vitest'
import { forEachComponent } from './connectedComponents'

/** 用文字畫描述遮罩：'#' = 成員 */
function collect(rows: string[]): number[][] {
  const width = rows[0].length
  const mask = rows.join('')
  const components: number[][] = []
  forEachComponent(
    width,
    rows.length,
    (i) => mask[i] === '#',
    (pixels) => components.push(Array.from(pixels).sort((a, b) => a - b)),
  )
  return components
}

describe('forEachComponent', () => {
  it('分開的像素群各自成為一群', () => {
    const components = collect([
      '##..#', //
      '##..#',
    ])

    expect(components).toEqual([
      [0, 1, 5, 6],
      [4, 9],
    ])
  })

  it('只靠斜角相連也算同一群', () => {
    expect(collect(['#..', '.#.', '..#'])).toHaveLength(1)
  })

  it('沒有任何成員時不呼叫 onComponent', () => {
    expect(collect(['...', '...'])).toEqual([])
  })
})
