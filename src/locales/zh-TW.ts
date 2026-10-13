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
    fitView: '適應視窗',
    close: '關閉',
  },
  locale: {
    label: '語言',
  },
  app: {
    title: '貼紙裁切去背工具',
    reupload: '重新上傳',
    preview: '預覽結果（{count} 張）',
    backToSelect: '返回框選',
    outputSettings: '輸出設定',
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
    copyrightNotice: '請只處理你有權使用的圖片。',
    copyrightLink: '了解素材版權',
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
    detectSettings: '偵測設定',
    redetect: '重新偵測',
    clearAuto: '清除自動框（改用手動）',
    hint: '兩張貼紙被框在一起就調小；旁邊的小裝飾被拆成另一張就調大。點框可選取，矩形與橢圓可拖曳控制點調整大小；調整過或手動畫的框，重新偵測時都會保留',
  },
  thumbnails: {
    title: '範圍（{count}）',
    empty: '在右側圖片上拖曳，框出每一張貼紙',
    selectHint: '點框可選取（橘框），按框旁的「刪除」移除；電腦上也可以按右鍵',
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
    zoomHintTouch: '兩指捏合縮放、兩指拖曳平移',
    original: '原圖（去背前，僅供對照）',
    panes: {
      original: '原圖',
      result: '去背結果',
    },
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
  help: {
    button: '使用說明',
    title: '使用說明',
    tabs: {
      guide: '怎麼使用',
      about: '關於',
    },
    steps: {
      upload: {
        title: '上傳合成圖',
        body: '把含有多張貼紙的圖片拖進來，或點擊選擇檔案。工具會自動找出每一張貼紙，圖片只在你的瀏覽器裡處理，不會上傳。',
      },
      select: {
        title: '檢查框選範圍',
        body: '點框可以選取，拖曳控制點調整大小、拖曳框可以移動。漏掉的用矩形、橢圓、套索補畫，不要的按框旁的「刪除」。滾輪縮放、按住空白鍵拖曳平移。',
        bodyTouch: '點框可以選取，拖曳控制點調整大小、拖曳框可以移動。漏掉的用矩形、橢圓、套索補畫，不要的按框旁的「刪除」。兩指捏合縮放、兩指拖曳平移。',
      },
      review: {
        title: '預覽與微調',
        body: '按「預覽結果」看每一張去背後的樣子。沒去乾淨的點一下進入微調：魔術棒去掉同色區塊、橡皮擦擦掉殘留、保留筆刷救回被誤刪的地方。',
      },
      export: {
        title: '設定並下載',
        body: '在右側的輸出設定調整尺寸、邊距、白邊、陰影，按「下載」取得 PNG 或 zip。',
        bodyTouch: '點下方的「輸出設定」調整尺寸、邊距、白邊、陰影，按「下載」取得 PNG 或 zip。',
      },
    },
    stepOf: '第 {current} 步，共 {total} 步',
    skip: '略過',
    previous: '上一步',
    next: '下一步',
    start: '開始使用',
    about: {
      privacy: {
        title: '隱私',
        body: '你的圖片不會上傳到任何地方，所有處理都在你的瀏覽器裡完成，網站也禁止發出任何網路請求。瀏覽器只會記住你的偏好設定（語言、預覽背景、輸出設定），不包含圖片。',
      },
      copyright: {
        title: '素材版權',
        body: '請只處理你有權使用的圖片。從 Canva 等素材平台取得的圖片通常有授權限制，例如不得單獨轉售、再散布，或做成貼圖、商品販售。使用前請確認原平台的授權條款，因素材使用產生的責任由使用者自行負擔。',
      },
      disclaimer: {
        title: '免責聲明',
        body: '本工具依現況免費提供，不保證處理結果完全正確，下載前請自行檢查。因使用本工具產生的任何直接或間接損失，作者不負任何責任。',
      },
      licenses: {
        title: '授權',
        body: '手寫字型 Patrick Hand 與 jf open 粉圓採用 SIL Open Font License 1.1，圖示來自 Lucide（ISC License）。',
        link: '查看授權全文',
      },
    },
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
