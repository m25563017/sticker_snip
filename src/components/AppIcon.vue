<script setup lang="ts">
import { computed } from 'vue'

/**
 * 專案共用的線條圖示。
 *
 * 圖形取自 Lucide（https://lucide.dev，ISC License，Copyright (c) Lucide Icons and Contributors），
 * 只複製用得到的幾個，不另外安裝套件，避免為了十幾個圖示多一個依賴。
 * rect、ellipse 由 Lucide 的 square、circle 改成長方形、橢圓，以對應框選形狀。
 *
 * 線條顏色用 currentColor：跟著按鈕文字顏色走，選中（反白）時不必另外設定圖示顏色。
 */

type IconElement =
  | { tag: 'path'; d: string }
  | { tag: 'rect'; x: number; y: number; width: number; height: number; rx: number }
  | { tag: 'circle'; cx: number; cy: number; r: number }
  | { tag: 'ellipse'; cx: number; cy: number; rx: number; ry: number }

const path = (d: string): IconElement => ({ tag: 'path', d })

const ICONS = {
  rect: [{ tag: 'rect', x: 2, y: 5, width: 20, height: 14, rx: 2 }],
  ellipse: [{ tag: 'ellipse', cx: 12, cy: 12, rx: 10, ry: 7 }],
  lasso: [
    path('M3.704 14.467a10 8 0 1 1 3.115 2.375'),
    path('M7 22a5 5 0 0 1-2-3.994'),
    { tag: 'circle', cx: 5, cy: 16, r: 2 },
  ],
  wand: [
    path(
      'm21.64 3.64-1.28-1.28a1.21 1.21 0 0 0-1.72 0L2.36 18.64a1.21 1.21 0 0 0 0 1.72l1.28 1.28a1.2 1.2 0 0 0 1.72 0L21.64 5.36a1.2 1.2 0 0 0 0-1.72',
    ),
    path('m14 7 3 3'),
    path('M5 6v4'),
    path('M19 14v4'),
    path('M10 2v2'),
    path('M7 8H3'),
    path('M21 16h-4'),
    path('M11 3H9'),
  ],
  eraser: [
    path(
      'M21 21H8a2 2 0 0 1-1.42-.587l-3.994-3.999a2 2 0 0 1 0-2.828l10-10a2 2 0 0 1 2.829 0l5.999 6a2 2 0 0 1 0 2.828L12.834 21',
    ),
    path('m5.082 11.09 8.828 8.828'),
  ],
  undo: [path('M9 14 4 9l5-5'), path('M4 9h10.5a5.5 5.5 0 0 1 5.5 5.5a5.5 5.5 0 0 1-5.5 5.5H11')],
  trash: [
    path('M10 11v6'),
    path('M14 11v6'),
    path('M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6'),
    path('M3 6h18'),
    path('M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2'),
  ],
  refresh: [
    path('M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8'),
    path('M21 3v5h-5'),
    path('M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16'),
    path('M8 16H3v5'),
  ],
  upload: [path('M12 3v12'), path('m17 8-5-5-5 5'), path('M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4')],
  download: [path('M12 15V3'), path('M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4'), path('m7 10 5 5 5-5')],
  close: [path('M18 6 6 18'), path('m6 6 12 12')],
  arrowLeft: [path('m12 19-7-7 7-7'), path('M19 12H5')],
  arrowRight: [path('M5 12h14'), path('m12 5 7 7-7 7')],
} satisfies Record<string, IconElement[]>

export type IconName = keyof typeof ICONS

const props = withDefaults(
  defineProps<{
    name: IconName
    size?: number
  }>(),
  { size: 16 },
)

/** 把 tag 和其餘屬性分開，屬性才不會多出一個 tag="path" 寫到 SVG 元素上 */
const elements = computed(() => ICONS[props.name].map(({ tag, ...attrs }) => ({ tag, attrs })))
</script>

<template>
  <!-- 純裝飾：按鈕本身已有文字或 aria-label，圖示不必被螢幕閱讀器念出來 -->
  <svg
    class="app-icon shrink-0"
    :width="props.size"
    :height="props.size"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <template v-for="(element, index) in elements" :key="index">
      <component :is="element.tag" v-bind="element.attrs" />
    </template>
  </svg>
</template>
