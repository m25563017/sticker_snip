import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { createDefaultWhiteBorder } from '@/types/selection'
import { useEditorStore } from './editor'

/** 每個測試都造一個全新的 rect 選取，避免測試之間共用同一個物件互相影響 */
function makeRectInput() {
  return {
    type: 'rect' as const,
    bounds: { x: 0, y: 0, width: 100, height: 100 },
    whiteBorder: createDefaultWhiteBorder(),
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

    const first = store.addSelection(makeRectInput())
    const second = store.addSelection(makeRectInput())

    expect(first.id).toBe(1)
    expect(second.id).toBe(2)
    expect(store.selectionCount).toBe(2)
  })

  it('刪除選取範圍後，編號不會被回收給下一個新選取', () => {
    const store = useEditorStore()

    store.addSelection(makeRectInput()) // id 1
    const second = store.addSelection(makeRectInput()) // id 2
    store.removeSelection(1)
    const third = store.addSelection(makeRectInput()) // 預期是 3，不是 1

    expect(third.id).toBe(3)
    expect(store.selections.map((item) => item.id)).toEqual([second.id, third.id])
  })

  it('reset 會清空選取並讓編號重新從 1 開始', () => {
    const store = useEditorStore()
    store.addSelection(makeRectInput())
    store.addSelection(makeRectInput())

    store.reset()
    const afterReset = store.addSelection(makeRectInput())

    expect(store.selectionCount).toBe(1)
    expect(afterReset.id).toBe(1)
  })
})
