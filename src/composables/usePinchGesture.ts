import { ref, type Ref } from 'vue'
import { useEventListener } from '@vueuse/core'
import type { Point } from '@/types/selection'

/** 兩根手指在元素內的位置（以元素左上角為原點） */
export type PinchPoints = [Point, Point]

/**
 * 兩指縮放、平移的手勢偵測（只處理觸控，滑鼠不受影響）。
 *
 * 手機上的手勢規則：一指給工具用（畫框、筆刷、魔術棒），兩指給縮放平移。
 * 難處在於第一根手指放下時，還不知道使用者是要「畫」還是要「兩指縮放」，
 * 工具已經先開始動作了。所以第二根手指一放上來，就送一個 pointercancel 給第一根手指底下的元素，
 * 讓它把畫到一半的東西取消——各元件本來就要處理 pointercancel（例如來電打斷觸控），不必為手勢另外寫程式。
 *
 * 所有監聽都掛在捕獲階段：事件從外往內傳，外框先收到，手勢進行中就攔下來，裡面的工具不會收到。
 *
 * @param onPinch 每次手指移動時呼叫，給「移動前、移動後」兩指的位置，由呼叫端換算成縮放與平移
 */
export function usePinchGesture(target: Ref<HTMLElement | null>, onPinch: (before: PinchPoints, after: PinchPoints) => void) {
  const isPinching = ref(false)
  /** 目前按在畫面上的手指：位置，以及按下時底下是哪個元素（取消動作時要送給它） */
  const touches = new Map<number, { point: Point; target: EventTarget | null }>()
  /**
   * 這一輪觸控（第一根手指放下到全部離開）有沒有出現過兩指手勢。
   * 有的話，手指離開時可能觸發 click，不能被魔術棒當成一次點選；中途再放下的手指也不交給工具。
   */
  let gestureHappened = false

  function toLocal(event: PointerEvent): Point {
    const rect = target.value?.getBoundingClientRect()
    return { x: event.clientX - (rect?.left ?? 0), y: event.clientY - (rect?.top ?? 0) }
  }

  function currentPair(): PinchPoints {
    const [a, b] = Array.from(touches.values(), (touch) => touch.point)
    return [a, b]
  }

  const capture = { capture: true }

  useEventListener(
    target,
    'pointerdown',
    (event: PointerEvent) => {
      // 觸控筆電上改用滑鼠點時，上一輪觸控手勢的狀態要清掉，否則這次點選會被當成手勢結尾而擋下
      if (event.pointerType !== 'touch' || touches.size === 0) gestureHappened = false
      if (event.pointerType !== 'touch') return
      touches.set(event.pointerId, { point: toLocal(event), target: event.target })

      if (touches.size === 2) {
        isPinching.value = true
        gestureHappened = true
        const [firstId, first] = touches.entries().next().value!
        first.target?.dispatchEvent(new PointerEvent('pointercancel', { pointerId: firstId, pointerType: 'touch', bubbles: true }))
      }
      if (gestureHappened) event.stopPropagation()
    },
    capture,
  )

  useEventListener(
    target,
    'pointermove',
    (event: PointerEvent) => {
      const touch = touches.get(event.pointerId)
      if (!touch) return
      if (!isPinching.value) {
        touch.point = toLocal(event)
        return
      }
      event.stopPropagation()
      const before = currentPair()
      touch.point = toLocal(event)
      onPinch(before, currentPair())
    },
    capture,
  )

  function handleTouchEnd(event: PointerEvent): void {
    // 上面送給工具的 pointercancel 是自己發的（isTrusted 為 false），那根手指其實還在畫面上
    if (!event.isTrusted || !touches.delete(event.pointerId)) return
    if (touches.size < 2) isPinching.value = false
  }
  useEventListener(target, 'pointerup', handleTouchEnd, capture)
  useEventListener(target, 'pointercancel', handleTouchEnd, capture)

  useEventListener(
    target,
    'click',
    (event: MouseEvent) => {
      if (gestureHappened) event.stopPropagation()
    },
    capture,
  )

  return { isPinching }
}
