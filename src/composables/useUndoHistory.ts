import { computed, shallowRef } from 'vue'

/**
 * 復原／重做的歷史紀錄，存的是「整份狀態的舊版本」。
 *
 * 適合每次修改都換成新物件、不就地修改的狀態（例如 manualEdits 每次都換新陣列）：
 * 這時存舊版本只是記住一個參照，幾乎不佔記憶體。
 *
 * - 修改前呼叫 record(目前的狀態)
 * - undo(目前的狀態) 回傳上一個版本，目前的狀態移到「重做」那一疊
 * - 做了新修改時，「重做」那一疊清空——跟所有軟體一樣，從過去岔出新的分支後，舊的未來就不存在了
 */
export function useUndoHistory<T>() {
  /** 用 shallowRef：只需要知道清單換了沒有，不需要追蹤每個舊版本內部 */
  const past = shallowRef<T[]>([])
  const future = shallowRef<T[]>([])

  const canUndo = computed(() => past.value.length > 0)
  const canRedo = computed(() => future.value.length > 0)

  function record(previous: T): void {
    past.value = [...past.value, previous]
    future.value = []
  }

  function undo(current: T): T | undefined {
    if (past.value.length === 0) return undefined
    const previous = past.value[past.value.length - 1]
    past.value = past.value.slice(0, -1)
    future.value = [...future.value, current]
    return previous
  }

  function redo(current: T): T | undefined {
    if (future.value.length === 0) return undefined
    const next = future.value[future.value.length - 1]
    future.value = future.value.slice(0, -1)
    past.value = [...past.value, current]
    return next
  }

  function clear(): void {
    past.value = []
    future.value = []
  }

  return { canUndo, canRedo, record, undo, redo, clear }
}
