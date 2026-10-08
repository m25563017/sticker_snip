import { computed, ref, type Ref } from 'vue'
import { useEditorStore } from '@/stores/editor'
import { boundsToDisplay, clampPoint, displayToSource, sourceToDisplay } from '@/lib/coordinates'
import { HANDLE_SIZE } from '@/lib/overlayRenderer'
import { isRectTooSmall, rectFromPoints } from '@/lib/rect'
import { HANDLE_CURSORS, hitTestHandle, resizeBounds, type ResizeHandle } from '@/lib/resizeHandles'
import { findSelectionAt, pointsBounds } from '@/lib/selectionShape'
import type { Bounds, Point, RectLikeSelection } from '@/types/selection'

/** 拖曳小於這個「螢幕像素」就當成點擊。用螢幕像素而非原圖像素，手感才不會隨縮放比例改變 */
const MIN_DRAG_DISPLAY_SIZE = 5
/** 游標離控制點多近就算點到（畫面 px），比控制點本身大一點，比較好點 */
const HANDLE_HIT_TOLERANCE = HANDLE_SIZE
/** 套索每移動這麼多畫面 px 才記一個點：滑鼠事件很密集，全部記下來一筆就會有上千個點 */
const LASSO_POINT_SPACING = 3

/**
 * 按住左鍵後進行中的操作（座標皆為原圖座標）：
 * - draw：拖曳對角線畫矩形或橢圓；拖不到門檻就當成點擊，用來選取範圍
 * - lasso：按住自由描邊，放開時自動封閉；同樣太小就當成點擊
 * - resize：拖曳控制點調整大小；放開前只改這裡的 current，不寫進 store，
 *   避免每移動一下就觸發重新偵測背景色、重算縮圖
 */
export type CanvasInteraction =
  | { kind: 'draw'; shape: 'rect' | 'ellipse'; start: Point; current: Point }
  | { kind: 'lasso'; points: Point[] }
  | { kind: 'resize'; id: number; handle: ResizeHandle; original: Bounds; current: Bounds }

interface Options {
  overlayRef: Ref<HTMLCanvasElement | null>
  /** 顯示尺寸 / 原圖尺寸 */
  displayScale: Ref<number>
  /** 拖曳中畫面需要更新時呼叫（畫出拖曳中的框、移動中的控制點） */
  onChange: () => void
}

/**
 * 主畫布的滑鼠互動：畫新範圍、點選、拖曳控制點調整大小、右鍵刪除／取消。
 * 只處理「滑鼠做了什麼」，畫面怎麼畫交給 EditorCanvas。
 */
export function useCanvasInteraction({ overlayRef, displayScale, onChange }: Options) {
  const editorStore = useEditorStore()
  const interaction = ref<CanvasInteraction | null>(null)
  /** 沒在拖曳時，依游標是否在控制點上切換樣式 */
  const hoverCursor = ref('crosshair')

  const minSourceSize = computed(() => MIN_DRAG_DISPLAY_SIZE / displayScale.value)

  /** 目前選取、而且可以調整大小的範圍（矩形、橢圓）；套索只能刪掉重畫，不顯示控制點 */
  const activeResizable = computed(() => {
    const active = editorStore.selections.find((item) => item.id === editorStore.activeSelectionId)
    return active && active.type !== 'lasso' ? active : undefined
  })

  const cursor = computed(() => {
    const active = interaction.value
    return active?.kind === 'resize' ? HANDLE_CURSORS[active.handle] : hoverCursor.value
  })

  /** 調整大小拖曳中的範圍，顯示拖曳中的外框，其餘顯示 store 裡的外框 */
  function currentBounds(selection: RectLikeSelection): Bounds {
    const active = interaction.value
    return active?.kind === 'resize' && active.id === selection.id ? active.current : selection.bounds
  }

  /**
   * 滑鼠事件座標 → 原圖座標。
   * 用 clientX 減掉 canvas 在視窗中的位置，而不是 offsetX：
   * 拖到 canvas 外時 offsetX 會改以別的元素為基準，clientX 則永遠可靠。
   */
  function eventToSourcePoint(event: PointerEvent): Point {
    const overlay = overlayRef.value
    const bitmap = editorStore.sourceBitmap
    if (!overlay || !bitmap) return { x: 0, y: 0 }

    const rect = overlay.getBoundingClientRect()
    const displayPoint = { x: event.clientX - rect.left, y: event.clientY - rect.top }
    return clampPoint(displayToSource(displayPoint, displayScale.value), bitmap.width, bitmap.height)
  }

  /** 游標是否在目前選取範圍的某個控制點上（在畫面座標比對，點擊的手感才不受縮放影響） */
  function handleAt(sourcePoint: Point): ResizeHandle | null {
    if (!activeResizable.value) return null
    const displayPoint = sourceToDisplay(sourcePoint, displayScale.value)
    const displayBounds = boundsToDisplay(activeResizable.value.bounds, displayScale.value)
    return hitTestHandle(displayBounds, displayPoint, HANDLE_HIT_TOLERANCE)
  }

  /** 點擊選取：點到的範圍（依形狀判斷，不只看外框）；點在空白處則取消選取 */
  function selectAt(point: Point): void {
    const index = findSelectionAt(editorStore.selections, point)
    editorStore.activeSelectionId = index >= 0 ? editorStore.selections[index].id : null
    onChange()
  }

  function handlePointerDown(event: PointerEvent): void {
    // 只接受左鍵，避免右鍵開選單時意外開始框選
    if (event.button !== 0) return
    // 捕捉指標：之後就算滑鼠移出 canvas，move/up 事件仍會送到這裡，不會「放開了卻沒收到」
    overlayRef.value?.setPointerCapture(event.pointerId)
    const point = eventToSourcePoint(event)
    const handle = handleAt(point)
    const shape = editorStore.drawShape

    if (activeResizable.value && handle) {
      const { id, bounds } = activeResizable.value
      interaction.value = { kind: 'resize', id, handle, original: bounds, current: bounds }
    } else if (shape === 'lasso') {
      interaction.value = { kind: 'lasso', points: [point] }
    } else {
      interaction.value = { kind: 'draw', shape, start: point, current: point }
    }
  }

  function handlePointerMove(event: PointerEvent): void {
    const point = eventToSourcePoint(event)
    const active = interaction.value

    if (!active) {
      const handle = handleAt(point)
      hoverCursor.value = handle ? HANDLE_CURSORS[handle] : 'crosshair'
      return
    }

    if (active.kind === 'draw') {
      active.current = point
    } else if (active.kind === 'lasso') {
      const last = active.points[active.points.length - 1]
      const movedOnScreen = Math.hypot(point.x - last.x, point.y - last.y) * displayScale.value
      if (movedOnScreen >= LASSO_POINT_SPACING) active.points.push(point)
    } else {
      const resized = resizeBounds(active.original, active.handle, point)
      // 縮到比門檻小就停在上一個合法的大小，不讓框消失
      if (!isRectTooSmall(resized, minSourceSize.value)) active.current = resized
    }
    onChange()
  }

  function finishResize(id: number, original: Bounds, current: Bounds): void {
    // 只點了控制點沒有拖動：不算調整，否則自動範圍會被誤標成手動
    const changed =
      original.x !== current.x ||
      original.y !== current.y ||
      original.width !== current.width ||
      original.height !== current.height
    if (changed) editorStore.resizeSelection(id, current)
  }

  function handlePointerUp(event: PointerEvent): void {
    const active = interaction.value
    if (!active) return
    interaction.value = null

    if (active.kind === 'resize') {
      finishResize(active.id, active.original, active.current)
      return
    }

    const point = eventToSourcePoint(event)
    if (active.kind === 'lasso') {
      const points = [...active.points, point]
      // 點太少或畫得太小就當成點擊；不必檢查有沒有畫回起點，之後一律自動以直線封閉
      if (points.length < 3 || isRectTooSmall(pointsBounds(points), minSourceSize.value)) {
        selectAt(point)
        return
      }
      editorStore.activeSelectionId = editorStore.addSelection({ type: 'lasso', points }).id
      return
    }

    const bounds = rectFromPoints(active.start, point)
    if (isRectTooSmall(bounds, minSourceSize.value)) {
      selectAt(point)
      return
    }
    editorStore.activeSelectionId = editorStore.addSelection({ type: active.shape, bounds }).id
  }

  /** 瀏覽器中斷指標（例如觸控被系統手勢接管）時放棄這次操作，而不是把半途的結果存起來 */
  function handlePointerCancel(): void {
    interaction.value = null
    onChange()
  }

  /**
   * 右鍵：拖曳到一半時取消這次操作；沒在拖曳時刪除目前高亮的範圍。
   * 用 contextmenu 事件而非 pointerdown：左鍵按住拖曳時再按右鍵，
   * 瀏覽器不會再送一次 pointerdown（同一支滑鼠已經是「按下」狀態），只有 contextmenu 一定收得到。
   */
  function handleContextMenu(): void {
    if (interaction.value) {
      handlePointerCancel()
      return
    }
    editorStore.removeActiveSelection()
  }

  return {
    interaction,
    cursor,
    activeResizable,
    currentBounds,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    handlePointerCancel,
    handleContextMenu,
  }
}
