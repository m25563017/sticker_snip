/**
 * 繁體中文翻譯：這份是「標準答案」，英文檔的結構必須和它一模一樣，
 * 少翻或多打一個 key，型別檢查就會報錯。
 * 依畫面區塊分組，key 用英文描述用途（不是翻譯內容），改文案時不必改程式。
 * 注意：{ } @ $ | 在翻譯裡有特殊意義（帶入變數、單複數），要當一般文字用時得跳脫。
 */
export default {
  common: {
    ok: '確定',
    cancel: '取消',
    color: '顏色',
    delete: '刪除',
    transparent: '透明',
  },
  locale: {
    label: '語言',
  },
  app: {
    title: '貼紙裁切去背工具',
    reupload: '重新上傳',
    preview: '預覽結果（{count} 張）',
    backToSelect: '返回框選',
    exporting: '處理中…（{done} / {total}）',
    downloadPng: '下載 PNG',
    downloadZip: '下載 zip（{count} 張）',
    reuploadConfirm: {
      title: '重新上傳',
      message: '目前的範圍會全部清除，確定要重新上傳嗎？',
    },
  },
  upload: {
    loading: '讀取圖片中…',
    drop: '拖曳合成圖到這裡',
    browse: '或點擊選擇檔案',
    tagline: '一張合成圖、多張貼紙、單一底色',
    invalidType: {
      title: '檔案格式錯誤',
      message: '請上傳圖片檔案（PNG、JPG 等），目前選到的不是圖片。',
    },
    downscaled: '圖片太大，已自動縮小為 {width} × {height}，處理起來更順暢',
    readFailed: {
      title: '讀取失敗',
      message: '圖片讀取時發生錯誤，請再試一次。',
    },
  },
  selectToolbar: {
    shapeGroup: '框選形狀',
    shape: '形狀',
    shapes: {
      rect: { label: '矩形', hint: '拖曳對角線畫出矩形' },
      ellipse: { label: '橢圓', hint: '拖曳對角線畫出內切的橢圓' },
      lasso: { label: '套索', hint: '按住滑鼠描出形狀，放開時自動以直線連回起點；畫好後無法調整大小' },
    },
    autoCount: '自動偵測到 {count} 張',
    mergeDistance: '合併距離',
    redetect: '重新偵測',
    clearAuto: '清除自動框（改用手動）',
    hint: '兩張貼紙被框在一起就調小；旁邊的小裝飾被拆成另一張就調大。點框可選取，矩形與橢圓可拖曳控制點調整大小；調整過或手動畫的框，重新偵測時都會保留',
  },
  thumbnails: {
    title: '範圍（{count}）',
    empty: '在右側圖片上拖曳，框出每一張貼紙',
    rightClickHint: '在圖片上按右鍵，可刪除目前選取（橘框）的範圍',
    backgroundColor: '背景色 {color}',
  },
  backdrop: {
    label: '預覽背景',
    checker: '棋盤格',
    dark: '深色',
    light: '淺色',
  },
  review: {
    hint: '確認每一張的去背與輸出效果，不滿意的點一下進入微調',
    empty: '沒有貼紙了，回上一步重新框選',
    adjusted: '已微調',
    removeLabel: '刪除 #{number}',
  },
  outputSettings: {
    title: '輸出設定',
    filePrefix: '檔名前綴',
    exportSize: '輸出尺寸',
    originalSize: '原尺寸（不縮放）',
    padding: '邊距',
    edgeQuality: '邊緣品質',
    edgeQualities: {
      pixel: { label: '硬邊', hint: '不處理邊緣，適合像素風格的素材' },
      smooth: { label: '平滑', hint: '去除邊緣混入的背景色（建議）' },
      ultra: { label: '超平滑', hint: '處理範圍更寬，並把鋸齒羽化' },
    },
  },
  border: {
    title: '白邊',
    width: '粗細',
  },
  shadow: {
    title: '陰影',
    opacity: '透明度',
    angle: '角度',
    angleHint: '陰影落下的方向：0° 往右、90° 往下',
    distance: '距離',
    spread: '擴散',
    spreadHint: '模糊前先把陰影往外擴，數值越大陰影越大塊、越實',
    blur: '大小',
    blurHint: '模糊程度，數值越大陰影邊緣越柔和',
  },
  background: {
    title: '實色背景',
    radius: '圓角',
  },
  fineTune: {
    title: '#{number} 微調',
    zoomHint: '滾輪縮放、按住空白鍵拖曳平移',
    fitView: '適應視窗',
    close: '關閉',
    original: '原圖（去背前，僅供對照）',
    backgroundColor: '背景色',
    threshold: '閾值',
    thresholdHint: '數值越大，越多「接近背景色」的像素會被去除；背景沒去乾淨就調高，貼紙被吃掉就調低',
    revert: '還原到打開前',
    done: '完成',
  },
  manualEdit: {
    result: '去背結果',
    tools: {
      wand: { label: '魔術棒', hint: '點一下，去掉同色的一整塊' },
      erase: { label: '橡皮擦', hint: '按住拖曳，擦掉經過的地方' },
      keep: { label: '保留', hint: '按住拖曳，把被去掉的地方還原成原圖' },
    },
    brush: '筆刷',
    undo: '復原',
    redo: '重做',
  },
  export: {
    empty: {
      title: '沒有可匯出的範圍',
      message: '請先在圖片上拖曳，框選至少一張貼紙。',
    },
    failed: {
      title: '匯出失敗',
      message: '產生圖片時發生錯誤，請重新整理頁面後再試一次。',
    },
  },
}
