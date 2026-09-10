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

interface SelectionBase {
  id: number
  whiteBorder: WhiteBorderConfig
}

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
