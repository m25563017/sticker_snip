import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { DEFAULT_THRESHOLD } from '@/types/selection'
import { useEditorStore } from './editor'

/** 每個測試都造一個全新的 rect 形狀，避免測試之間共用同一個物件互相影響 */
function makeRectShape() {
  return {
    type: 'rect' as const,
    bounds: { x: 0, y: 0, width: 100, height: 100 },
  }
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
