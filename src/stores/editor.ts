import { computed, ref, shallowRef } from 'vue'
import { defineStore } from 'pinia'
import { useStorage } from '@vueuse/core'
import type { PixelBuffer } from '@/lib/pixelBuffer'
import { cropSelection } from '@/lib/cropSelection'
import { detectBackgroundColor } from '@/lib/detectBackgroundColor'
import { rgbToHex } from '@/lib/color'
import { defaultMergeDistance, detectStickers } from '@/lib/detectStickers'
import { translateSelection } from '@/lib/selectionShape'
import type { EdgeQuality } from '@/lib/refineEdges'
import { DEFAULT_EXPORT_SIZE, DEFAULT_PADDING, type ExportSize } from '@/lib/composeOutput'
import { DEFAULT_BORDER, type BorderSettings } from '@/lib/stickerBorder'
import { DEFAULT_SHADOW, type ShadowSettings } from '@/lib/stickerShadow'
import { DEFAULT_BACKGROUND, type BackgroundSettings } from '@/lib/stickerBackground'
import {
  DEFAULT_THRESHOLD,
  type Bounds,
  type ManualEdit,
  type Point,
  type Selection,
  type SelectionCreatedBy,
  type SelectionShape,
  type SelectionType,
} from '@/types/selection'

/** 工作階段：先框選所有範圍，再進入檢查階段統一預覽結果、針對不滿意的微調後匯出 */
export type EditorStage = 'select' | 'review'

/** 套用到所有範圍的輸出設定（需求 4.2） */
export interface OutputSettings {
  filePrefix: string
  edgeQuality: EdgeQuality
  exportSize: ExportSize
  /** 輸出圖片四周的留白，單位是輸出圖片的 px，量到最外層效果（白邊、陰影）的外緣 */
  padding: number
  border: BorderSettings
  shadow: ShadowSettings
  background: BackgroundSettings
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
  /** 手動框選時要畫的形狀（需求 4.3）；自動偵測一律產生矩形 */
  const drawShape = ref<SelectionType>('rect')
  /** 自動偵測時，前景像素相距多少 px 以內算同一張貼紙；換新圖時依圖片大小重設 */
  const mergeDistance = ref(1)
  /**
   * 輸出設定記在瀏覽器裡，下次打開還是上次的設定（例如固定用的檔名前綴）。
   * mergeDefaults：之後新增欄位時，舊的存檔缺少的欄位會自動補上預設值。
   */
  const outputSettings = useStorage<OutputSettings>(
    'sticker-snip:output-settings',
    {
      filePrefix: 'sticker_',
      edgeQuality: 'smooth',
      exportSize: DEFAULT_EXPORT_SIZE,
      padding: DEFAULT_PADDING,
      border: { ...DEFAULT_BORDER },
      shadow: { ...DEFAULT_SHADOW },
      background: { ...DEFAULT_BACKGROUND },
    },
    undefined,
    { mergeDefaults: true },
  )

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

  /** 改用手動圈選：清掉自動偵測的範圍，手動畫的保留。想再自動偵測時按「重新偵測」即可找回 */
  function clearAutoSelections(): void {
    selections.value = selections.value.filter((item) => item.createdBy === 'manual')
    if (!selections.value.some((item) => item.id === activeSelectionId.value)) activeSelectionId.value = null
  }

  /**
   * 拖曳控制點調整範圍大小。調整過的自動範圍改標記為手動：
   * 使用者已經親手修正過，之後拖合併距離滑桿重新偵測時不該被洗掉。
   */
  function resizeSelection(id: number, bounds: Bounds): void {
    const target = selections.value.find((item) => item.id === id)
    // 套索是自由描繪的路徑，拉伸外框容易變形，規格上只能刪掉重畫
    if (!target || target.type === 'lasso') return
    target.bounds = bounds
    target.createdBy = 'manual'
    refreshBackgroundColor(id)
  }

  /**
   * 拖曳移動範圍。跟調整大小一樣，移動過的自動範圍改標記為手動，重新偵測時不會被洗掉；
   * 框到的內容變了，背景色也要重新偵測。
   */
  function moveSelection(id: number, offset: Point): void {
    const index = selections.value.findIndex((item) => item.id === id)
    if (index < 0) return
    selections.value[index] = { ...translateSelection(selections.value[index], offset), createdBy: 'manual' }
    refreshBackgroundColor(id)
  }

  function addSelection(shape: SelectionShape, createdBy: SelectionCreatedBy = 'manual'): Selection {
    const created: Selection = {
      ...shape,
      id: nextId.value++,
      createdBy,
      backgroundColor: null,
      threshold: DEFAULT_THRESHOLD,
      manualEdits: [],
    }
    selections.value.push(created)
    refreshBackgroundColor(created.id)
    return created
  }

  /**
   * 針對單一範圍重新偵測背景色。新增、調整大小、移動範圍時都會呼叫。
   * 背景色一律自動偵測：實測框有留白時 51 張全對，只有框到貼齊貼紙邊緣才可能判錯，
   * 這時把框拉大一點就會重新偵測修正，不需要另外提供手動指定。
   */
  function refreshBackgroundColor(id: number): void {
    const pixels = sourcePixels.value
    const target = selections.value.find((item) => item.id === id)
    if (!pixels || !target) return

    const { image, mask } = cropSelection(pixels, target)
    target.backgroundColor = rgbToHex(detectBackgroundColor(image, mask))
  }

  // ======== 微調：魔術棒、橡皮擦 ========
  const roundPoint = (point: Point): Point => ({ x: Math.round(point.x), y: Math.round(point.y) })

  /**
   * 記錄一筆手動修改。座標四捨五入成整數像素，避免快取指紋裡出現一長串小數。
   * 換新陣列而非 push：快取指紋靠 JSON 比對，新陣列也讓 Vue 更確實地偵測到變化。
   */
  function addManualEdit(id: number, edit: ManualEdit): void {
    const target = selections.value.find((item) => item.id === id)
    if (!target) return
    const rounded: ManualEdit =
      edit.tool === 'wand'
        ? { tool: 'wand', point: roundPoint(edit.point) }
        : { tool: 'erase', points: edit.points.map(roundPoint), radius: edit.radius }
    target.manualEdits = [...target.manualEdits, rounded]
  }

  /** 復原上一步：不分工具，拿掉最後一筆修改 */
  function undoManualEdit(id: number): void {
    const target = selections.value.find((item) => item.id === id)
    if (target) target.manualEdits = target.manualEdits.slice(0, -1)
  }

  function clearManualEdits(id: number): void {
    updateSelection(id, { manualEdits: [] })
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
    drawShape,
    mergeDistance,
    outputSettings,
    selections,
    activeSelectionId,
    hasImage,
    selectionCount,
    loadImage,
    autoDetect,
    clearAutoSelections,
    resizeSelection,
    moveSelection,
    addSelection,
    removeSelection,
    removeActiveSelection,
    updateSelection,
    refreshBackgroundColor,
    addManualEdit,
    undoManualEdit,
    clearManualEdits,
    reset,
  }
})
