import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import type { Selection } from '@/types/selection'

/** 去背邊緣品質（需求 4.5），對應不同羽化程度與運算量 */
export type EdgeQuality = 'pixel' | 'smooth' | 'ultra'

export const useEditorStore = defineStore('editor', () => {
  // ======== 底圖 ========
  /** 使用者上傳的合成圖，尚未上傳時為 null */
  const sourceBitmap = ref<ImageBitmap | null>(null)

  // ======== 全域去背設定（單一背景色，套用到所有選取範圍）========
  const backgroundColor = ref<string | null>(null)
  const threshold = ref(30)
  const edgeQuality = ref<EdgeQuality>('smooth')

  // ======== 選取範圍 ========
  const selections = ref<Selection[]>([])
  /** 自動遞增編號來源，刪除後不回收，確保編號穩定 */
  const nextId = ref(1)

  // ======== 輸出設定（需求 4.7 / 4.9）========
  const filePrefix = ref('sticker_')

  const hasImage = computed(() => sourceBitmap.value !== null)
  const selectionCount = computed(() => selections.value.length)

  function addSelection(selection: Omit<Selection, 'id'>): Selection {
    const created = { ...selection, id: nextId.value++ } as Selection
    selections.value.push(created)
    return created
  }

  function removeSelection(id: number): void {
    selections.value = selections.value.filter((item) => item.id !== id)
  }

  function updateSelection(id: number, patch: Partial<Selection>): void {
    const target = selections.value.find((item) => item.id === id)
    if (target) Object.assign(target, patch)
  }

  function reset(): void {
    sourceBitmap.value = null
    backgroundColor.value = null
    selections.value = []
    nextId.value = 1
  }

  return {
    sourceBitmap,
    backgroundColor,
    threshold,
    edgeQuality,
    selections,
    filePrefix,
    hasImage,
    selectionCount,
    addSelection,
    removeSelection,
    updateSelection,
    reset,
  }
})
