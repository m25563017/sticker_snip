<script setup lang="ts">
/**
 * 手繪抖動濾鏡：讓工整的向量圖示看起來像徒手畫的（需求第 6 節「工具圖示以手繪線條呈現」）。
 *
 * 原理像隔著一層起伏的毛玻璃看線條：
 * 1. feTurbulence 產生一張雜訊圖（一片不規則起伏的「地形」）
 * 2. feDisplacementMap 依地形高低，把圖示的每個點往旁邊推一點點，直線就變得歪歪扭扭
 *
 * 全站只放一份，圖示用 CSS 的 filter: url(#hand-drawn) 引用。
 * 雜訊是固定的（seed 固定），每次打開長得一樣，不會閃動。
 */
</script>

<template>
  <!-- 只用來放濾鏡定義，本身不顯示、不佔版面 -->
  <svg class="hand-drawn-filter" width="0" height="0" aria-hidden="true">
    <defs>
      <!-- 濾鏡範圍放大一點：線條被推出原本的外框時才不會被切掉 -->
      <filter id="hand-drawn" x="-20%" y="-20%" width="140%" height="140%">
        <!-- baseFrequency：起伏的密度。越大抖得越碎，0.06 約每 16 px 起伏一次，像手微微顫動 -->
        <feTurbulence type="fractalNoise" baseFrequency="0.06" numOctaves="2" seed="3" result="noise" />
        <!-- scale：推移的最大距離（px）。太大會糊成一團，1.6 剛好看得出歪又認得出圖形 -->
        <feDisplacementMap in="SourceGraphic" in2="noise" scale="1.6" xChannelSelector="R" yChannelSelector="G" />
      </filter>
    </defs>
  </svg>
</template>

<style scoped>
.hand-drawn-filter {
  position: absolute;
  width: 0;
  height: 0;
  overflow: hidden;
}
</style>
