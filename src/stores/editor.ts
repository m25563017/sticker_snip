import { computed, ref, shallowRef } from 'vue'
import { defineStore } from 'pinia'
import type { PixelBuffer } from '@/lib/pixelBuffer'
import { cropSelection } from '@/lib/cropSelection'
import { detectBackgroundColor } from '@/lib/detectBackgroundColor'
import { rgbToHex } from '@/lib/color'
import { defaultMergeDistance, detectStickers } from '@/lib/detectStickers'
import type { EdgeQuality } from '@/lib/refineEdges'
import {
  createDefaultWhiteBorder,
  DEFAULT_THRESHOLD,
  type Point,
  type Selection,
  type SelectionCreatedBy,
  type SelectionShape,
} from '@/types/selection'

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
  /** 自動偵測時，前景像素相距多少 px 以內算同一張貼紙；換新圖時依圖片大小重設 */
  const mergeDistance = ref(1)
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

  /**
   * 換新圖：清掉舊圖的一切，依圖片大小設定合併距離，並立刻自動偵測一次。
   * 工具的重點是自動裁切，上傳後直接看到框好的結果，不需要使用者先選模式。
   */
  function loadImage(bitmap: ImageBitmap, pixels: PixelBuffer): void {
    reset()
    sourceBitmap.value = bitmap
    sourcePixels.value = pixels
    mergeDistance.value = defaultMergeDistance(pixels.width, pixels.height)
    autoDetect()
  }

  /**
   * 整張自動偵測（需求 4.3）。重新偵測時只替換自動產生的範圍，使用者手動畫的保留，
   * 才不會因為調一下合併距離就把辛苦補畫的範圍洗掉。
   * 排列順序：自動偵測的依閱讀順序在前，手動的接在後面。
   */
  function autoDetect(): void {
    const pixels = sourcePixels.value
    if (!pixels) return

    const manual = selections.value.filter((item) => item.createdBy === 'manual')
    if (!manual.some((item) => item.id === activeSelectionId.value)) activeSelectionId.value = null
    selections.value = []
    for (const bounds of detectStickers(pixels, { mergeDistance: mergeDistance.value })) {
      addSelection({ type: 'rect', bounds }, 'auto')
    }
    selections.value.push(...manual)
  }

  function addSelection(shape: SelectionShape, createdBy: SelectionCreatedBy = 'manual'): Selection {
    const created: Selection = {
      ...shape,
      id: nextId.value++,
      createdBy,
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

  /**
   * 刪除目前高亮的範圍（框選時按右鍵）。剛畫好的範圍會自動高亮，所以畫錯可以馬上右鍵刪掉。
   * 刪除後不自動高亮下一個：避免連按幾下右鍵就誤刪一串，要刪別的得先明確點選。
   */
  function removeActiveSelection(): void {
    if (activeSelectionId.value !== null) removeSelection(activeSelectionId.value)
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
    mergeDistance,
    outputSettings,
    selections,
    activeSelectionId,
    hasImage,
    selectionCount,
    loadImage,
    autoDetect,
    addSelection,
    removeSelection,
    removeActiveSelection,
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
