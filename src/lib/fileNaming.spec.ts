import { describe, expect, it } from 'vitest'
import { buildFileName, sanitizePrefix } from './fileNaming'

describe('buildFileName', () => {
  it('符合需求文件的範例格式', () => {
    expect(buildFileName('sticker_', 0, 5)).toBe('sticker_01.png')
    expect(buildFileName('sticker_', 1, 5)).toBe('sticker_02.png')
  })

  it('流水號從 1 開始，對應畫面上的編號', () => {
    expect(buildFileName('a_', 9, 10)).toBe('a_10.png')
  })

  it('總數未滿 100 張時補到 2 位數', () => {
    expect(buildFileName('s_', 0, 99)).toBe('s_01.png')
    expect(buildFileName('s_', 98, 99)).toBe('s_99.png')
  })

  it('總數達 100 張時改補到 3 位數，讓檔名依字母排序也正確', () => {
    expect(buildFileName('s_', 0, 100)).toBe('s_001.png')
    expect(buildFileName('s_', 99, 100)).toBe('s_100.png')
  })

  it('前綴可以是空字串', () => {
    expect(buildFileName('', 0, 3)).toBe('01.png')
  })
})

describe('sanitizePrefix', () => {
  it('把檔名不允許的字元換成底線', () => {
    expect(sanitizePrefix('a/b\\c:d*e?f"g<h>i|j')).toBe('a_b_c_d_e_f_g_h_i_j')
  })

  it('一般字元與中文保持不變', () => {
    expect(sanitizePrefix('貓咪貼紙-v2_')).toBe('貓咪貼紙-v2_')
  })
})
