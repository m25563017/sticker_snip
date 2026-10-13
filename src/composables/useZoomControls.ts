import { ref, type Ref } from 'vue'
import { useEventListener } from '@vueuse/core'
import { panBy, pinchView, zoomAt, type ZoomView } from '@/lib/zoomView'
import { usePinchGesture } from '@/composables/usePinchGesture'

/** 每滾一格（deltaY ≈ 100）放大約 1.2 倍；觸控板的小幅滾動也能平順縮放 */
const WHEEL_ZOOM_SPEED = 0.0018

/**
 * 縮放、平移的操作方式，主畫布與微調彈窗共用：
 * - 電腦：滾輪以游標為中心縮放，按住空白鍵拖曳平移
 * - 手機：兩指捏合縮放、兩指拖曳平移
 *
 * 只負責「把操作換算成新的視角」，視角怎麼畫到畫面上由呼叫端決定
 * （微調彈窗用 CSS 放大，主畫布依倍率重畫）。
 *
 * @param target 接收操作的外框；視角以它的左上角為原點
 */
export function useZoomControls(target: Ref<HTMLElement | null>, view: Ref<ZoomView>) {
  function targetSize(): { width: number; height: number } {
    const rect = target.value?.getBoundingClientRect()
    return { width: rect?.width ?? 0, height: rect?.height ?? 0 }
  }

  // ======== 電腦：滾輪縮放 ========
  // passive: false 才能 preventDefault，擋掉整頁捲動
  useEventListener(
    target,
    'wheel',
    (event: WheelEvent) => {
      const rect = target.value?.getBoundingClientRect()
      if (!rect) return
      event.preventDefault()
      const anchor = { x: event.clientX - rect.left, y: event.clientY - rect.top }
      view.value = zoomAt(view.value, anchor, Math.exp(-event.deltaY * WHEEL_ZOOM_SPEED), rect)
    },
    { passive: false },
  )

  // ======== 手機：兩指縮放、平移 ========
  usePinchGesture(target, (before, after) => {
    view.value = pinchView(view.value, before, after, targetSize())
  })

  // ======== 電腦：空白鍵 + 拖曳平移 ========
  const isSpaceHeld = ref(false)
  const isPanning = ref(false)
  let lastPointer: { x: number; y: number } | null = null

  /** 在輸入框裡打空白是正常輸入，不能攔 */
  function isTyping(event: KeyboardEvent): boolean {
    const element = event.target as HTMLElement | null
    return element?.tagName === 'INPUT' && (element as HTMLInputElement).type === 'text'
  }

  useEventListener(document, 'keydown', (event: KeyboardEvent) => {
    if (event.code !== 'Space' || isTyping(event)) return
    // 擋掉空白鍵的預設行為：捲動頁面、或「按下」目前聚焦的工具按鈕
    event.preventDefault()
    isSpaceHeld.value = true
  })

  useEventListener(document, 'keyup', (event: KeyboardEvent) => {
    if (event.code !== 'Space') return
    event.preventDefault()
    isSpaceHeld.value = false
  })

  // 切換視窗時可能收不到 keyup，空白鍵會一直被當成按住
  useEventListener(window, 'blur', () => {
    isSpaceHeld.value = false
  })

  const capture = { capture: true }

  /**
   * 在捕獲階段攔截：按住空白鍵時，這一下是平移，不能讓裡面的工具（畫框、筆刷、魔術棒）收到。
   * 就像郵差在門口先把信收走，屋裡的人不會知道有這封信。
   */
  useEventListener(
    target,
    'pointerdown',
    (event: PointerEvent) => {
      if (!isSpaceHeld.value || event.button !== 0) return
      event.stopPropagation()
      target.value?.setPointerCapture(event.pointerId)
      isPanning.value = true
      lastPointer = { x: event.clientX, y: event.clientY }
    },
    capture,
  )

  useEventListener(
    target,
    'pointermove',
    (event: PointerEvent) => {
      if (!isPanning.value || !lastPointer) return
      event.stopPropagation()
      view.value = panBy(view.value, event.clientX - lastPointer.x, event.clientY - lastPointer.y, targetSize())
      lastPointer = { x: event.clientX, y: event.clientY }
    },
    capture,
  )

  function stopPanning(): void {
    isPanning.value = false
    lastPointer = null
  }
  useEventListener(target, 'pointerup', stopPanning)
  useEventListener(target, 'pointercancel', stopPanning)

  /** 平移結束時放開滑鼠會觸發 click，不能被魔術棒當成一次點選 */
  useEventListener(
    target,
    'click',
    (event: MouseEvent) => {
      if (isSpaceHeld.value) event.stopPropagation()
    },
    capture,
  )

  return { isSpaceHeld, isPanning }
}
