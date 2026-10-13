import { describe, expect, it } from 'vitest'
import { limitImageSize } from './canvas'

describe('limitImageSize', () => {
  it('沒超過上限：原樣回傳', () => {
    expect(limitImageSize(4096, 3000, 4096)).toEqual({ width: 4096, height: 3000 })
  })

  it('長邊超過上限：等比縮小到長邊剛好等於上限', () => {
    expect(limitImageSize(6000, 8000, 4096)).toEqual({ width: 3072, height: 4096 })
  })

  it('極端細長的圖，短邊至少保留 1 px', () => {
    expect(limitImageSize(100000, 10, 4096)).toEqual({ width: 4096, height: 1 })
  })
})
