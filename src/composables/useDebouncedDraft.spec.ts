import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { effectScope, nextTick, ref } from 'vue'
import { useDebouncedDraft } from './useDebouncedDraft'

describe('useDebouncedDraft', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  /** 在 effectScope 裡建立，scope.stop() 就相當於元件卸載 */
  function setup() {
    const stored = ref(30)
    const commit = vi.fn((value: number) => {
      stored.value = value
    })
    const scope = effectScope()
    const draft = scope.run(() => useDebouncedDraft(() => stored.value, commit, 100))!
    return { stored, commit, scope, ...draft }
  }

  it('草稿立刻更新，正式寫回要等停手', () => {
    const { draft, set, commit } = setup()

    set(40)
    set(50)
    expect(draft.value).toBe(50)
    expect(commit).not.toHaveBeenCalled()

    vi.advanceTimersByTime(100)
    expect(commit).toHaveBeenCalledTimes(1)
    expect(commit).toHaveBeenCalledWith(50)
  })

  it('cancel 取消還沒送出的值', () => {
    const { set, cancel, commit } = setup()

    set(80)
    cancel()
    vi.advanceTimersByTime(100)

    expect(commit).not.toHaveBeenCalled()
  })

  it('卸載時立刻送出最後一次的值', () => {
    const { set, scope, commit } = setup()

    set(70)
    scope.stop()

    expect(commit).toHaveBeenCalledWith(70)
  })

  it('正式值被別處改變時（例如還原），草稿跟著同步', async () => {
    const { draft, stored } = setup()

    stored.value = 10
    await nextTick()

    expect(draft.value).toBe(10)
  })
})
