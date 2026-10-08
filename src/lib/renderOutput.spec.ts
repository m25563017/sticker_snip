import { describe, expect, it } from 'vitest'
import { effectMargin, type RenderSettings } from './renderOutput'
import { DEFAULT_BORDER } from './stickerBorder'
import { DEFAULT_SHADOW } from './stickerShadow'

const base: RenderSettings = { exportSize: 256, padding: 16, border: DEFAULT_BORDER, shadow: DEFAULT_SHADOW }

describe('effectMargin', () => {
  it('效果都關閉時不預留空間', () => {
    expect(effectMargin(base)).toBe(0)
  })

  it('白邊與陰影的延伸範圍相加', () => {
    const settings = {
      ...base,
      border: { ...DEFAULT_BORDER, enabled: true, thickness: 8 },
      shadow: { ...DEFAULT_SHADOW, enabled: true, distance: 4, spread: 0, size: 8 },
    }
    expect(effectMargin(settings)).toBe(20)
  })
})
