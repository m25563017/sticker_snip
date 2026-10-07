import { computed, ref, shallowRef } from 'vue'
import { defineStore } from 'pinia'
import type { PixelBuffer } from '@/lib/pixelBuffer'
import { cropSelection } from '@/lib/cropSelection'
import { detectBackgroundColor } from '@/lib/detectBackgroundColor'
import { rgbToHex } from '@/lib/color'
import type { EdgeQuality } from '@/lib/refineEdges'
import {
  createDefaultWhiteBorder,
  DEFAULT_THRESHOLD,
  type Point,
  type Selection,
  type SelectionShape,
} from '@/types/selection'

/** 去背範圍的產生方式（需求 4.2）：整張自動偵測，或使用者自行圈選 */
export type RangeMode = 'auto' | 'manual'

/** 工作階段：先框選所有範圍，再進入檢查階段統一預覽結果、針對不滿意的微調後匯出 */
export type EditorStage = 'select' | 'review'

/** 套用到所有範圍的輸出設定（需求 4.2），目前只放 M1 實際用到的欄位 */
export interface OutputSettings {
  filePrefix: string
  edgeQuality: EdgeQuality
}

export const useEditorStore = defineStore('editor', () => {
  // ======== 底圖 ========
  /** 使用者上傳的合成圖，尚未上傳時為 null */
  const sourceBitmap = ref<ImageBitmap | null>(null)
  /**
   * 原圖的像素資料，裁切每個範圍時從這裡讀。上傳時讀一次存起來，
   * 不必每次裁切都重新把 bitmap 畫到 canvas 上再讀出來。
   * 用 shallowRef：整張圖可能有上千萬個數值，只需要在「換整張圖」時通知畫面，
   * 不需要 Vue 追蹤裡面每一格的變化。
   */
  const sourcePixels = shallowRef<PixelBuffer | null>(null)

  // ======== 模式與輸出設定 ========
  const stage = ref<EditorStage>('select')
  /** M1 只實作手動框選，所以預設 manual */
  const rangeMode = ref<RangeMode>('manual')
  const outputSettings = ref<OutputSettings>({
    filePrefix: 'sticker_',
    edgeQuality: 'smooth',
  })

  // ======== 選取範圍 ========
  const selections = ref<Selection[]>([])
  /**
   * 內部識別用的 id 來源，刪除後不回收：快取、高亮、列表 key 都靠 id 認人，必須永久不變。
   * 畫面上顯示的編號另外用「在陣列中的順序」，刪除時會往前遞補。
   */
  const nextId = ref(1)
  /** 目前被點選的範圍，縮圖列表與畫布靠它同步高亮 */
  const activeSelectionId = ref<number | null>(null)

  const hasImage = computed(() => sourceBitmap.value !== null)
  const selectionCount = computed(() => selections.value.length)

  function addSelection(shape: SelectionShape): Selection {
    const created: Selection = {
      ...shape,
      id: nextId.value++,
      whiteBorder: createDefaultWhiteBorder(),
      backgroundColor: null,
      threshold: DEFAULT_THRESHOLD,
      isManualColor: false,
      removalSeeds: [],
    }
    selections.value.push(created)
    refreshBackgroundColor(created.id)
    return created
  }

  /**
   * 針對單一範圍重新偵測背景色。新增範圍時會呼叫；之後支援調整範圍大小時也要呼叫。
   * 使用者用滴管手動指定過的顏色不覆蓋，尊重使用者的判斷優先於演算法。
   */
  function refreshBackgroundColor(id: number): void {
    const pixels = sourcePixels.value
    const target = selections.value.find((item) => item.id === id)
    if (!pixels || !target || target.isManualColor) return

    const { image, mask } = cropSelection(pixels, target)
    target.backgroundColor = rgbToHex(detectBackgroundColor(image, mask))
  }

  /** 滴管取色：掛上「手動」標記，之後重新偵測時就不會蓋掉使用者選的顏色 */
  function setManualBackgroundColor(id: number, color: string): void {
    updateSelection(id, { backgroundColor: color, isManualColor: true })
  }

  /** 取消手動指定，回到演算法自動偵測的背景色 */
  function resetToAutoBackgroundColor(id: number): void {
    updateSelection(id, { isManualColor: false })
    refreshBackgroundColor(id)
  }

  // ======== 魔術棒 ========
  /** 換新陣列而非 push：快取指紋靠 JSON 比對，新陣列也讓 Vue 更確實地偵測到變化 */
  function addRemovalSeed(id: number, point: Point): void {
    const target = selections.value.find((item) => item.id === id)
    if (!target) return
    const rounded = { x: Math.round(point.x), y: Math.round(point.y) }
    target.removalSeeds = [...target.removalSeeds, rounded]
  }

  function undoRemovalSeed(id: number): void {
    const target = selections.value.find((item) => item.id === id)
    if (target) target.removalSeeds = target.removalSeeds.slice(0, -1)
  }

  function clearRemovalSeeds(id: number): void {
    updateSelection(id, { removalSeeds: [] })
  }

  function removeSelection(id: number): void {
    selections.value = selections.value.filter((item) => item.id !== id)
    // 被刪掉的若正好是高亮中的範圍，要一併清掉，否則會指向不存在的資料
    if (activeSelectionId.value === id) activeSelectionId.value = null
  }

  function updateSelection(id: number, patch: Partial<Selection>): void {
    const target = selections.value.find((item) => item.id === id)
    if (target) Object.assign(target, patch)
  }

  function reset(): void {
    sourceBitmap.value = null
    sourcePixels.value = null
    selections.value = []
    nextId.value = 1
    activeSelectionId.value = null
    stage.value = 'select'
  }

  return {
    sourceBitmap,
    sourcePixels,
    stage,
    rangeMode,
    outputSettings,
    selections,
    activeSelectionId,
    hasImage,
    selectionCount,
    addSelection,
    removeSelection,
    updateSelection,
    refreshBackgroundColor,
    setManualBackgroundColor,
    resetToAutoBackgroundColor,
    addRemovalSeed,
    undoRemovalSeed,
    clearRemovalSeeds,
    reset,
  }
})
