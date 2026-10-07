import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { DEFAULT_THRESHOLD } from '@/types/selection'
import type { PixelBuffer } from '@/lib/pixelBuffer'
import { useEditorStore } from './editor'

/** 每個測試都造一個全新的 rect 形狀，避免測試之間共用同一個物件互相影響 */
function makeRectShape() {
  return {
    type: 'rect' as const,
    bounds: { x: 0, y: 0, width: 100, height: 100 },
  }
}

/** 20×10 的圖：左半邊白色、右半邊黃色，模擬兩張背景色不同的貼紙並排 */
function makeTwoToneImage(): PixelBuffer {
  const width = 20
  const height = 10
  const data = new Uint8ClampedArray(width * height * 4)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4
      data[i] = 255
      data[i + 1] = 255
      data[i + 2] = x < 10 ? 255 : 0
      data[i + 3] = 255
    }
  }
  return { data, width, height }
}

describe('useEditorStore', () => {
  beforeEach(() => {
    // Pinia 的 store 是全域單例，每個測試前重建一個乾淨的 pinia 實例，
    // 否則上一個測試留下的 selections 會殘留到下一個測試
    setActivePinia(createPinia())
  })

  it('新增選取範圍時，編號從 1 依序遞增', () => {
    const store = useEditorStore()

    const first = store.addSelection(makeRectShape())
    const second = store.addSelection(makeRectShape())

    expect(first.id).toBe(1)
    expect(second.id).toBe(2)
    expect(store.selectionCount).toBe(2)
  })

  it('新增範圍時自動補上各自的去背預設值', () => {
    const store = useEditorStore()

    const created = store.addSelection(makeRectShape())

    expect(created.backgroundColor).toBeNull()
    expect(created.threshold).toBe(DEFAULT_THRESHOLD)
    expect(created.isManualColor).toBe(false)
    expect(created.whiteBorder.enabled).toBe(false)
  })

  it('每個範圍的設定互相獨立，改其中一個不影響另一個', () => {
    const store = useEditorStore()
    const first = store.addSelection(makeRectShape())
    store.addSelection(makeRectShape())

    store.updateSelection(first.id, { threshold: 80, backgroundColor: '#ff0000' })

    const [firstAfter, secondAfter] = store.selections
    expect(firstAfter.threshold).toBe(80)
    expect(secondAfter.threshold).toBe(DEFAULT_THRESHOLD)
    expect(secondAfter.backgroundColor).toBeNull()
    // 白邊設定也必須是各自獨立的物件，不能共用同一份參照
    expect(firstAfter.whiteBorder).not.toBe(secondAfter.whiteBorder)
  })

  it('刪除選取範圍後，編號不會被回收給下一個新選取', () => {
    const store = useEditorStore()

    store.addSelection(makeRectShape()) // id 1
    const second = store.addSelection(makeRectShape()) // id 2
    store.removeSelection(1)
    const third = store.addSelection(makeRectShape()) // 預期是 3，不是 1

    expect(third.id).toBe(3)
    expect(store.selections.map((item) => item.id)).toEqual([second.id, third.id])
  })

  it('右鍵刪除：刪掉目前高亮的範圍（不一定是最後畫的）', () => {
    const store = useEditorStore()
    store.addSelection(makeRectShape()) // id 1
    const second = store.addSelection(makeRectShape()) // id 2
    store.addSelection(makeRectShape()) // id 3
    store.activeSelectionId = second.id

    store.removeActiveSelection()

    expect(store.selections.map((item) => item.id)).toEqual([1, 3])
  })

  it('右鍵刪除：刪除後不自動高亮下一個，再按一次不會誤刪', () => {
    const store = useEditorStore()
    store.addSelection(makeRectShape())
    const second = store.addSelection(makeRectShape())
    store.activeSelectionId = second.id

    store.removeActiveSelection()
    store.removeActiveSelection()

    expect(store.activeSelectionId).toBeNull()
    expect(store.selectionCount).toBe(1)
  })

  it('右鍵刪除：沒有高亮的範圍時不做任何事', () => {
    const store = useEditorStore()
    store.addSelection(makeRectShape())
    store.activeSelectionId = null

    store.removeActiveSelection()

    expect(store.selectionCount).toBe(1)
  })

  it('刪除高亮中的範圍時，activeSelectionId 會被清空', () => {
    const store = useEditorStore()
    const created = store.addSelection(makeRectShape())
    store.activeSelectionId = created.id

    store.removeSelection(created.id)

    expect(store.activeSelectionId).toBeNull()
  })

  it('刪除其他範圍時，activeSelectionId 保持不變', () => {
    const store = useEditorStore()
    const first = store.addSelection(makeRectShape())
    const second = store.addSelection(makeRectShape())
    store.activeSelectionId = first.id

    store.removeSelection(second.id)

    expect(store.activeSelectionId).toBe(first.id)
  })

  it('有原圖時，新增範圍會自動偵測該範圍的背景色', () => {
    const store = useEditorStore()
    store.sourcePixels = makeTwoToneImage()

    const leftRange = store.addSelection({ type: 'rect', bounds: { x: 0, y: 0, width: 10, height: 10 } })
    const rightRange = store.addSelection({ type: 'rect', bounds: { x: 10, y: 0, width: 10, height: 10 } })

    // 同一張圖上的兩個範圍，各自偵測出不同的背景色
    expect(leftRange.backgroundColor).toBe('#ffffff')
    expect(rightRange.backgroundColor).toBe('#ffff00')
  })

  it('沒有原圖時不偵測，背景色維持 null', () => {
    const store = useEditorStore()

    const created = store.addSelection(makeRectShape())

    expect(created.backgroundColor).toBeNull()
  })

  it('手動指定過的背景色，重新偵測時不會被覆蓋', () => {
    const store = useEditorStore()
    store.sourcePixels = makeTwoToneImage()
    const created = store.addSelection({ type: 'rect', bounds: { x: 0, y: 0, width: 10, height: 10 } })
    store.updateSelection(created.id, { backgroundColor: '#123456', isManualColor: true })

    store.refreshBackgroundColor(created.id)

    expect(store.selections[0].backgroundColor).toBe('#123456')
  })

  it('滴管取色後標記為手動，之後重新偵測不會覆蓋', () => {
    const store = useEditorStore()
    store.sourcePixels = makeTwoToneImage()
    const created = store.addSelection({ type: 'rect', bounds: { x: 0, y: 0, width: 10, height: 10 } })

    store.setManualBackgroundColor(created.id, '#abcdef')
    store.refreshBackgroundColor(created.id)

    expect(store.selections[0].backgroundColor).toBe('#abcdef')
    expect(store.selections[0].isManualColor).toBe(true)
  })

  it('恢復自動偵測：取消手動標記並重新偵測背景色', () => {
    const store = useEditorStore()
    store.sourcePixels = makeTwoToneImage()
    const created = store.addSelection({ type: 'rect', bounds: { x: 10, y: 0, width: 10, height: 10 } })
    store.setManualBackgroundColor(created.id, '#abcdef')

    store.resetToAutoBackgroundColor(created.id)

    expect(store.selections[0].isManualColor).toBe(false)
    expect(store.selections[0].backgroundColor).toBe('#ffff00')
  })

  it('魔術棒：新增的點四捨五入成整數像素，可以逐一復原或全部清除', () => {
    const store = useEditorStore()
    const created = store.addSelection(makeRectShape())

    store.addRemovalSeed(created.id, { x: 10.4, y: 20.6 })
    store.addRemovalSeed(created.id, { x: 30, y: 40 })
    expect(store.selections[0].removalSeeds).toEqual([
      { x: 10, y: 21 },
      { x: 30, y: 40 },
    ])

    store.undoRemovalSeed(created.id)
    expect(store.selections[0].removalSeeds).toEqual([{ x: 10, y: 21 }])

    store.addRemovalSeed(created.id, { x: 50, y: 50 })
    store.clearRemovalSeeds(created.id)
    expect(store.selections[0].removalSeeds).toEqual([])
  })

  describe('自動偵測', () => {
    /** 60×30 白底，左右各一塊 10×10 的紅色貼紙 */
    function makeTwoStickers(): PixelBuffer {
      const width = 60
      const height = 30
      const data = new Uint8ClampedArray(width * height * 4).fill(255)
      for (const left of [5, 40]) {
        for (let y = 5; y < 15; y++) {
          for (let x = left; x < left + 10; x++) {
            const i = (y * width + x) * 4
            data[i + 1] = 30
            data[i + 2] = 30
          }
        }
      }
      return { data, width, height }
    }
    // 測試環境沒有真的 ImageBitmap；store 只把它存起來給畫布用，偵測只看像素
    const fakeBitmap = {} as ImageBitmap

    it('換新圖時依圖片大小設定合併距離，並立刻偵測出所有貼紙', () => {
      const store = useEditorStore()

      store.loadImage(fakeBitmap, makeTwoStickers())

      expect(store.mergeDistance).toBe(1)
      expect(store.selections.map((item) => item.createdBy)).toEqual(['auto', 'auto'])
      // 每個自動偵測出的範圍也會各自偵測背景色
      expect(store.selections[0].backgroundColor).toBe('#ffffff')
    })

    it('重新偵測只替換自動的範圍，手動畫的保留並排在後面', () => {
      const store = useEditorStore()
      store.loadImage(fakeBitmap, makeTwoStickers())
      const manual = store.addSelection({ type: 'rect', bounds: { x: 20, y: 18, width: 10, height: 10 } })
      store.activeSelectionId = manual.id

      store.autoDetect()

      expect(store.selections.map((item) => item.createdBy)).toEqual(['auto', 'auto', 'manual'])
      expect(store.selections[2].id).toBe(manual.id)
      expect(store.activeSelectionId).toBe(manual.id)
    })

    it('清除自動框：只刪自動偵測的範圍，手動畫的保留', () => {
      const store = useEditorStore()
      store.loadImage(fakeBitmap, makeTwoStickers())
      const manual = store.addSelection({ type: 'rect', bounds: { x: 20, y: 18, width: 10, height: 10 } })
      store.activeSelectionId = store.selections[0].id

      store.clearAutoSelections()

      expect(store.selections.map((item) => item.id)).toEqual([manual.id])
      expect(store.activeSelectionId).toBeNull()
    })

    it('調整過大小的自動範圍改為手動，重新偵測時不會被洗掉', () => {
      const store = useEditorStore()
      store.loadImage(fakeBitmap, makeTwoStickers())
      const resized = store.selections[0]
      const newBounds = { x: 2, y: 2, width: 20, height: 20 }

      store.resizeSelection(resized.id, newBounds)
      store.autoDetect()

      const kept = store.selections.find((item) => item.id === resized.id)
      expect(kept?.createdBy).toBe('manual')
      expect(kept?.type === 'rect' && kept.bounds).toEqual(newBounds)
    })

    it('高亮中的是自動範圍時，重新偵測後清掉高亮（舊範圍已被替換）', () => {
      const store = useEditorStore()
      store.loadImage(fakeBitmap, makeTwoStickers())
      store.activeSelectionId = store.selections[0].id

      store.autoDetect()

      expect(store.activeSelectionId).toBeNull()
    })
  })

  it('reset 會回到框選階段', () => {
    const store = useEditorStore()
    store.stage = 'review'

    store.reset()

    expect(store.stage).toBe('select')
  })

  it('reset 會清空選取並讓編號重新從 1 開始', () => {
    const store = useEditorStore()
    const created = store.addSelection(makeRectShape())
    store.addSelection(makeRectShape())
    store.activeSelectionId = created.id

    store.reset()
    const afterReset = store.addSelection(makeRectShape())

    expect(store.selectionCount).toBe(1)
    expect(afterReset.id).toBe(1)
    expect(store.activeSelectionId).toBeNull()
  })
})
