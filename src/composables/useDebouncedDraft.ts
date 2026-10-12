import { onScopeDispose, ref, watch, type Ref } from 'vue'

/**
 * 滑桿用的「草稿值」：拖動時數字即時跟著動，真正寫回（會觸發重算）則等手停下才做。
 *
 * 不用 @vueuse 的 useDebounceFn，因為需要兩個它沒有的能力：
 * - cancel：例如「還原到打開前」時，要取消還沒送出的值，否則它會在幾毫秒後把剛還原的值又蓋掉
 * - flush：元件關閉時立刻送出，不能讓最後一次調整消失（已在元件卸載時自動呼叫）
 *
 * @param source 目前正式的值；它被別處改變時（例如還原），草稿會跟著同步
 * @param commit 把值正式寫回
 */
export function useDebouncedDraft<T>(source: () => T, commit: (value: T) => void, delayMs: number) {
  const draft = ref(source()) as Ref<T>
  let pending: { value: T } | null = null
  let timer: ReturnType<typeof setTimeout> | undefined

  watch(source, (value) => {
    draft.value = value
  })

  function flush(): void {
    clearTimeout(timer)
    if (!pending) return
    commit(pending.value)
    pending = null
  }

  function cancel(): void {
    clearTimeout(timer)
    pending = null
  }

  function set(value: T): void {
    draft.value = value
    pending = { value }
    clearTimeout(timer)
    timer = setTimeout(flush, delayMs)
  }

  onScopeDispose(flush)

  return { draft, set, flush, cancel }
}
