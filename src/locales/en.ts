import type zhTW from './zh-TW'

/**
 * 英文翻譯：`satisfies typeof zhTW` 讓結構和中文檔對不上時直接報錯。
 * 設定欄的標籤寬度固定，英文盡量挑短的字（Size、Edges、Blur），版面才不會被撐開。
 * 單複數用 | 分隔成「0 個 | 1 個 | 多個」三種寫法，呼叫 t() 時要多傳一個數量。
 */
export default {
  common: {
    ok: 'OK',
    cancel: 'Cancel',
    color: 'Color',
    delete: 'Delete',
    transparent: 'Transparent',
  },
  locale: {
    label: 'Language',
  },
  app: {
    title: 'Sticker Snip',
    reupload: 'Upload new image',
    preview: 'Preview ({count} stickers) | Preview ({count} sticker) | Preview ({count} stickers)',
    backToSelect: 'Back to selection',
    exporting: 'Processing…',
    downloadPng: 'Download PNG',
    downloadZip: 'Download zip ({count} files)',
    reuploadConfirm: {
      title: 'Upload new image',
      message: 'All current selections will be cleared. Upload a new image?',
    },
  },
  upload: {
    loading: 'Loading image…',
    drop: 'Drop your sticker sheet here',
    browse: 'or click to choose a file',
    tagline: 'One image, many stickers, one flat background color',
    invalidType: {
      title: 'Unsupported file',
      message: 'Please upload an image file (PNG, JPG, etc.). The selected file is not an image.',
    },
    readFailed: {
      title: 'Could not read image',
      message: 'Something went wrong while reading the image. Please try again.',
    },
  },
  selectToolbar: {
    shapeGroup: 'Selection shape',
    shape: 'Shape',
    shapes: {
      rect: { label: 'Rectangle', hint: 'Drag diagonally to draw a rectangle' },
      ellipse: { label: 'Ellipse', hint: 'Drag diagonally to draw an ellipse inside the box' },
      lasso: {
        label: 'Lasso',
        hint: 'Hold and trace a shape; it closes back to the start when released. Lasso shapes cannot be resized',
      },
    },
    autoCount: 'No stickers detected | 1 sticker detected | {count} stickers detected',
    mergeDistance: 'Merge distance',
    redetect: 'Re-detect',
    clearAuto: 'Clear auto boxes (draw manually)',
    hint: 'Lower it if two stickers share one box; raise it if a small decoration gets split off. Click a box to select it; drag the handles of rectangles and ellipses to resize. Edited and hand-drawn boxes are kept when re-detecting',
  },
  thumbnails: {
    title: 'Selections ({count})',
    empty: 'Drag on the image to box each sticker',
    rightClickHint: 'Right-click the image to delete the selected (orange) box',
    backgroundColor: 'Background {color}',
  },
  backdrop: {
    label: 'Preview background',
    checker: 'Checker',
    dark: 'Dark',
    light: 'Light',
  },
  review: {
    hint: 'Check each sticker’s cutout and output. Click one to fine-tune it',
    empty: 'No stickers left. Go back to box some',
    adjusted: 'Edited',
    removeLabel: 'Delete #{number}',
  },
  outputSettings: {
    title: 'Output settings',
    filePrefix: 'Prefix',
    exportSize: 'Size',
    originalSize: 'Original (no scaling)',
    padding: 'Padding',
    edgeQuality: 'Edges',
    edgeQualities: {
      pixel: { label: 'Hard', hint: 'Leave edges as is; good for pixel art' },
      smooth: { label: 'Smooth', hint: 'Remove background color blended into edges (recommended)' },
      ultra: { label: 'Extra smooth', hint: 'Wider cleanup with feathered, anti-aliased edges' },
    },
  },
  border: {
    title: 'Border',
    width: 'Width',
  },
  shadow: {
    title: 'Shadow',
    opacity: 'Opacity',
    angle: 'Angle',
    angleHint: 'Direction of the shadow: 0° right, 90° down',
    distance: 'Offset',
    spread: 'Spread',
    spreadHint: 'Expands the shadow before blurring; higher is larger and more solid',
    blur: 'Blur',
    blurHint: 'How soft the shadow edge is',
  },
  background: {
    title: 'Background',
    radius: 'Radius',
  },
  fineTune: {
    title: 'Fine-tune #{number}',
    zoomHint: 'Scroll to zoom, hold Space and drag to pan',
    fitView: 'Fit to view',
    close: 'Close',
    original: 'Original (reference only)',
    backgroundColor: 'Bg color',
    threshold: 'Threshold',
    thresholdHint: 'Higher removes more pixels close to the background color. Raise it if background remains; lower it if the sticker gets eaten',
    revert: 'Revert all changes',
    done: 'Done',
  },
  manualEdit: {
    result: 'Result',
    tools: {
      wand: { label: 'Magic wand', hint: 'Click to remove a same-colored area' },
      erase: { label: 'Eraser', hint: 'Drag to erase' },
      keep: { label: 'Restore', hint: 'Drag to bring removed areas back from the original' },
    },
    brush: 'Brush',
    undo: 'Undo',
    redo: 'Redo',
  },
  export: {
    empty: {
      title: 'Nothing to export',
      message: 'Drag on the image to box at least one sticker first.',
    },
    failed: {
      title: 'Export failed',
      message: 'Something went wrong while creating the images. Please reload the page and try again.',
    },
  },
} satisfies typeof zhTW
