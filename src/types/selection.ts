/**
 * 選取範圍的統一資料結構（需求文件 4.2）
 *
 * 三種選取形狀（矩形／橢圓／套索）共用同一份結構，
 * 去背與白邊邏輯完全共用，差異只在「產生裁切遮罩」時如何解讀 shape。
 */

export type SelectionType = 'rect' | 'ellipse' | 'lasso'

/** 畫布座標系上的一個點（單位：原圖 px） */
export interface Point {
  x: number
  y: number
}

/** 矩形／橢圓用的外接矩形 */
export interface Bounds {
  x: number
  y: number
  width: number
  height: number
}

/** 白色貼紙描邊設定（需求 4.7 外框） */
export interface WhiteBorderConfig {
  enabled: boolean
  mode: 'solid' | 'adaptive'
  color: string
  opacity: number
  /** 粗細，單位 px */
  thickness: number
  /** 邊緣柔化程度 0–1 */
  fade: number
}

/** 新範圍的預設閾值：顏色距離在此以內視為背景 */
export const DEFAULT_THRESHOLD = 30

/** 範圍怎麼來的：重新自動偵測時只替換 auto 的，使用者手動畫的保留 */
export type SelectionCreatedBy = 'auto' | 'manual'

interface SelectionBase {
  id: number
  createdBy: SelectionCreatedBy
  whiteBorder: WhiteBorderConfig
  /**
   * 每個範圍各自的背景色（需求 4.6）──不同貼紙的底色可能不同，
   * 所以不放在全域。尚未偵測時為 null。
   */
  backgroundColor: string | null
  /** 每個範圍可個別微調的去背閾值 */
  threshold: number
  /**
   * 微調彈窗裡的手動修改，依操作順序記錄；「復原上一步」就是拿掉最後一筆，不分工具。
   * 座標都存原圖座標而非裁切後座標：調整範圍大小後，修改過的位置不會跟著跑掉。
   */
  manualEdits: ManualEdit[]
}

/**
 * - wand（魔術棒）：以點到的顏色為基準再做一次 flood fill，
 *   去掉被物件包圍、從邊界流不進去的背景（例如花圈中間、氣球線之間的空隙）
 * - erase（橡皮擦）：沿路徑直接擦成透明，不管顏色，處理魔術棒選不乾淨的東西
 */
export type ManualEdit = { tool: 'wand'; point: Point } | { tool: 'erase'; points: Point[]; radius: number }

/** 矩形與橢圓：用 bounds 描述 */
export interface RectLikeSelection extends SelectionBase {
  type: 'rect' | 'ellipse'
  bounds: Bounds
}

/** 套索：用連續路徑點描述，繪製時自動封閉成多邊形 */
export interface LassoSelection extends SelectionBase {
  type: 'lasso'
  points: Point[]
}

export type Selection = RectLikeSelection | LassoSelection

/**
 * 新增範圍時只需要描述「形狀」，其餘欄位（id、背景色、閾值、白邊）
 * 由 store 統一補預設值，框選工具就不必知道去背相關的細節。
 */
export type SelectionShape =
  | Pick<RectLikeSelection, 'type' | 'bounds'>
  | Pick<LassoSelection, 'type' | 'points'>

export function createDefaultWhiteBorder(): WhiteBorderConfig {
  return {
    enabled: false,
    mode: 'solid',
    color: '#ffffff',
    opacity: 1,
    thickness: 8,
    fade: 0.3,
  }
}
