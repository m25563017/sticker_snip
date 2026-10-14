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
    fitView: 'Fit to view',
    close: 'Close',
  },
  locale: {
    label: 'Language',
  },
  app: {
    title: 'Sticker Snip',
    reupload: 'Upload new image',
    preview: 'Preview ({count} stickers) | Preview ({count} sticker) | Preview ({count} stickers)',
    backToSelect: 'Back to selection',
    outputSettings: 'Settings',
    exporting: 'Processing… ({done} / {total})',
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
    copyrightNotice: 'Images remain the property of their copyright holders. Check the license scope before use.',
    copyrightLink: 'Copyright notice',
    invalidType: {
      title: 'Unsupported file',
      message: 'Please upload an image file (PNG, JPG, etc.). The selected file is not an image.',
    },
    downscaled: 'Large image resized to {width} × {height} for smoother processing',
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
    detectSettings: 'Detection settings',
    redetect: 'Re-detect',
    clearAuto: 'Clear auto boxes (draw manually)',
    hint: 'Lower it if two stickers share one box; raise it if a small decoration gets split off. Click a box to select it; drag the handles of rectangles and ellipses to resize. Edited and hand-drawn boxes are kept when re-detecting',
  },
  thumbnails: {
    title: 'Selections ({count})',
    empty: 'Drag on the image to box each sticker',
    selectHint: 'Click a box to select it (orange), then press Delete next to it. On desktop you can also right-click',
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
    zoomHintTouch: 'Pinch to zoom, drag with two fingers to pan',
    original: 'Original (reference only)',
    panes: {
      original: 'Original',
      result: 'Result',
    },
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
  help: {
    button: 'Help',
    title: 'Help',
    tabs: {
      guide: 'How to use',
      about: 'About',
    },
    steps: {
      upload: {
        title: 'Upload a sticker sheet',
        body: 'Drop an image with several stickers, or click to choose a file. Each sticker is detected automatically. Your image is processed in your browser and never uploaded.',
      },
      select: {
        title: 'Check the boxes',
        body: 'Click a box to select it, drag its handles to resize, or drag it to move. Add missing ones with the rectangle, ellipse or lasso, and press Delete next to a box to remove it. Scroll to zoom, hold Space and drag to pan.',
        bodyTouch: 'Tap a box to select it, drag its handles to resize, or drag it to move. Add missing ones with the rectangle, ellipse or lasso, and press Delete next to a box to remove it. Pinch to zoom, drag with two fingers to pan.',
      },
      review: {
        title: 'Preview and fine-tune',
        body: 'Press Preview to see each cutout. Click one that needs fixing: the magic wand removes same-colored areas, the eraser wipes leftovers, and Restore brings back parts removed by mistake.',
      },
      inApp: {
    title: 'Open in your browser',
    body: 'You are in an app\'s built-in browser (such as LINE, Facebook or Instagram), where uploading images or downloading files may not work. Please open this page in Safari or Chrome.',
    open: 'Open in browser',
    copyHint: 'If the button does nothing, copy the link and paste it into your browser:',
    copy: 'Copy',
    copied: 'Copied',
    manualHint: 'You can also tap the ⋯ menu in a corner of the screen and choose Open in browser.',
    continue: 'Continue here anyway',
  },
  export: {
        title: 'Set up and download',
        body: 'Adjust size, padding, border and shadow in the settings on the right, then press Download to get PNGs or a zip.',
        bodyTouch: 'Tap Settings at the bottom to adjust size, padding, border and shadow, then press Download to get PNGs or a zip.',
      },
    },
    stepOf: 'Step {current} of {total}',
    environmentNotice: 'Best experienced on a computer. On a phone, open this page in a browser such as Safari or Chrome rather than the built-in browser of apps like LINE or Facebook.',
    skip: 'Skip',
    previous: 'Back',
    next: 'Next',
    start: 'Get started',
    about: {
      environment: {
        title: 'Supported environment',
        body: 'This tool works best in a desktop browser, where precise tasks such as boxing and fine-tuning are easiest with a large screen and a mouse. Phones are supported in browsers such as Safari or Chrome. The built-in browsers of apps such as LINE, Facebook or Instagram may not be able to upload images or download files.',
      },
      privacy: {
        title: 'Privacy',
        body: 'Your images are never uploaded. Everything is processed in your browser, and the site is blocked from making any network requests. Only your preferences (language, preview background, output settings) are saved in your browser, never your images.',
      },
      copyright: {
        title: 'Copyright notice',
        points: [
          'This tool only provides technical functions for cropping and removing image backgrounds. It does not provide or license any image assets, and no rights are acquired or transferred through processing.',
          'Users are responsible for ensuring that the images they process are lawfully licensed by the copyright holder or fall within fair use under applicable copyright law.',
          'The license terms of some asset platforms (such as Canva) may prohibit extracting assets on their own, reselling or redistributing them, or selling them as stickers or merchandise. Please review the original license terms before use.',
          'Users bear sole responsibility for any infringement or legal liability arising from processing, using or distributing images. The tool and its author assume no liability.',
        ],
      },
      disclaimer: {
        title: 'Disclaimer',
        body: 'This tool is provided free and as is, with no guarantee that the results are correct. Please check them before use. The author is not liable for any direct or indirect loss arising from the use of this tool.',
      },
      licenses: {
        title: 'Licenses',
        body: 'The handwriting fonts Patrick Hand and jf open huninn are licensed under the SIL Open Font License 1.1. Icons are from Lucide (ISC License).',
        link: 'View full licenses',
      },
    },
  },
  inApp: {
    title: 'Open in your browser',
    body: 'You are in an app\'s built-in browser (such as LINE, Facebook or Instagram), where uploading images or downloading files may not work. Please open this page in Safari or Chrome.',
    open: 'Open in browser',
    copyHint: 'If the button does nothing, copy the link and paste it into your browser:',
    copy: 'Copy',
    copied: 'Copied',
    manualHint: 'You can also tap the ⋯ menu in a corner of the screen and choose Open in browser.',
    continue: 'Continue here anyway',
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
