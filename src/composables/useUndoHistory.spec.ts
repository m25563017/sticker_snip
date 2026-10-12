import { describe, expect, it } from 'vitest'
import { useUndoHistory } from './useUndoHistory'

describe('useUndoHistory', () => {
  /** 模擬一個用新陣列取代舊陣列的狀態：每次修改前先 record 舊版本 */
  function setup() {
    const history = useUndoHistory<string[]>()
    let state: string[] = []
    const change = (next: string[]) => {
      history.record(state)
      state = next
    }
    const undo = () => {
      state = history.undo(state) ?? state
    }
    const redo = () => {
      state = history.redo(state) ?? state
    }
    return { history, change, undo, redo, current: () => state }
  }

  it('復原回到上一個版本，重做再回來', () => {
    const { change, undo, redo, current } = setup()
    change(['a'])
    change(['a', 'b'])

    undo()
    expect(current()).toEqual(['a'])
    undo()
    expect(current()).toEqual([])

    redo()
    expect(current()).toEqual(['a'])
  })

  it('復原之後做了新修改，重做的紀錄會清空', () => {
    const { history, change, undo, current } = setup()
    change(['a'])
    change(['a', 'b'])
    undo()

    change(['a', 'c'])

    expect(history.canRedo.value).toBe(false)
    expect(current()).toEqual(['a', 'c'])
  })

  it('沒有紀錄時，復原與重做都不做任何事', () => {
    const { history, undo, redo, current } = setup()

    undo()
    redo()

    expect(current()).toEqual([])
    expect(history.canUndo.value).toBe(false)
    expect(history.canRedo.value).toBe(false)
  })

  it('clear 清空所有紀錄', () => {
    const { history, change, undo } = setup()
    change(['a'])
    change(['a', 'b'])
    undo()

    history.clear()

    expect(history.canUndo.value).toBe(false)
    expect(history.canRedo.value).toBe(false)
  })
})
