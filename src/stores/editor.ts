import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import {
  createDefaultWhiteBorder,
  DEFAULT_THRESHOLD,
  type Selection,
  type SelectionShape,
} from '@/types/selection'

/** 去背邊緣品質（需求 4.5），對應不同羽化程度與運算量 */
export type EdgeQuality = 'pixel' | 'smooth' | 'ultra'

/** 去背範圍的產生方式（需求 4.2）：整張自動偵測，或使用者自行圈選 */
export type RangeMode = 'auto' | 'manual'

/** 套用到所有範圍的輸出設定（需求 4.2），目前只放 M1 實際用到的欄位 */
export interface OutputSettings {
  filePrefix: string
  edgeQuality: EdgeQuality
}

export const useEditorStore = defineStore('editor', () => {
  // ======== 底圖 ========
  /** 使用者上傳的合成圖，尚未上傳時為 null */
  const sourceBitmap = ref<ImageBitmap | null>(null)

  // ======== 模式與輸出設定 ========
  /** M1 只實作手動框選，所以預設 manual */
  const rangeMode = ref<RangeMode>('manual')
  const outputSettings = ref<OutputSettings>({
    filePrefix: 'sticker_',
    edgeQuality: 'smooth',
  })

  // ======== 選取範圍 ========
  const selections = ref<Selection[]>([])
  /** 自動遞增編號來源，刪除後不回收，確保編號穩定 */
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
    }
    selections.value.push(created)
    return created
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
    selections.value = []
    nextId.value = 1
    activeSelectionId.value = null
  }

  return {
    sourceBitmap,
    rangeMode,
    outputSettings,
    selections,
    activeSelectionId,
    hasImage,
    selectionCount,
    addSelection,
    removeSelection,
    updateSelection,
    reset,
  }
})
