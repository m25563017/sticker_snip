/**
 * 手寫字體子集化：只留下介面會用到的字，打包進 HTML 才不會太大。
 *
 * 中文字型完整檔有好幾 MB，但介面上的字是固定的（都在翻譯檔裡），
 * 所以把翻譯檔掃一遍、收集用到的字，只保留這些字的字形，就像只影印字典裡會用到的那幾頁。
 *
 * 使用方式：翻譯檔改了文字之後執行 `npm run fonts`，再把產生的 woff2 一起 commit。
 * 原始字型檔會下載到 .font-cache/（不 commit），只有第一次執行需要網路。
 * 字型授權檔放在 public/licenses/，會跟著網站一起發佈（OFL 要求散布字型時附上授權）。
 */
import { mkdir, readFile, writeFile, access } from 'node:fs/promises'
import subsetFont from 'subset-font'

const CACHE_DIR = '.font-cache'
const OUTPUT_DIR = 'src/assets/fonts'

/** 掃描這些檔案裡出現的所有字元 */
const TEXT_SOURCES = ['src/locales/zh-TW.ts', 'src/locales/en.ts', 'src/i18n.ts']
/** 一律保留：英數、常用符號，使用者輸入的英文檔名前綴也能用手寫字顯示 */
const ALWAYS_INCLUDE = Array.from({ length: 95 }, (_, i) => String.fromCharCode(32 + i)).join('')

const FONTS = [
  {
    // 英文：Patrick Hand（OFL，沒有保留字型名稱）
    source: `${CACHE_DIR}/PatrickHand-Regular.ttf`,
    url: 'https://github.com/google/fonts/raw/main/ofl/patrickhand/PatrickHand-Regular.ttf',
    output: `${OUTPUT_DIR}/hand-latin.woff2`,
    pick: (char) => char.charCodeAt(0) < 0x2e80,
  },
  {
    // 中文：jf open 粉圓（OFL）
    source: `${CACHE_DIR}/jf-openhuninn.ttf`,
    url: 'https://github.com/justfont/open-huninn-font/releases/download/v2.1/jf-openhuninn-2.1.ttf',
    output: `${OUTPUT_DIR}/hand-cjk.woff2`,
    // 英數交給 Patrick Hand，這裡只留中文字與全形標點：中文字筆畫多，每個字都很佔空間
    pick: (char) => char.charCodeAt(0) >= 0x2e80,
    /**
     * 粉圓有「保留字型名稱」（open huninn、huninn、Varela Round）：
     * 依 OFL 第 3 條，子集化這類修改過的版本不能再用原名，所以把字型檔內的名稱換掉；
     * 版權聲明照原樣保留（OFL 要求保留）。
     */
    rename: {
      family: 'Hand CJK',
      copyright:
        'Copyright (c) 2020-2024 The jf open huninn font is redistributed by justfont Co., LTD., with Reserved Font Names \'open huninn\' and \'huninn\'. Copyright (c) 2010 MOTOYA CO.,LTD. Copyright (c) 2011-2016 The Varela Round Project Authors, with Reserved Font Names \'Varela\' and \'Varela Round\'. Modified (subset and renamed) for Sticker Snip.',
    },
  },
]

const exists = (path) =>
  access(path).then(
    () => true,
    () => false,
  )

async function ensureSource(font) {
  if (await exists(font.source)) return
  console.log(`下載 ${font.url}`)
  const response = await fetch(font.url)
  if (!response.ok) throw new Error(`下載失敗：${font.url}（${response.status}）`)
  await writeFile(font.source, Buffer.from(await response.arrayBuffer()))
}

async function collectText() {
  const contents = await Promise.all(TEXT_SOURCES.map((file) => readFile(file, 'utf8')))
  // 去掉註解行：註解裡的字不會出現在畫面上
  const visible = contents.map((content) =>
    content
      .split('\n')
      .filter((line) => !/^\s*(\/\/|\/?\*)/.test(line))
      .join('\n'),
  )
  // 用 Set 去掉重複的字；Array.from 以「字」為單位切開，不會把罕用字切成兩半
  return Array.from(new Set(Array.from(visible.join('') + ALWAYS_INCLUDE))).join('')
}

// ======== 字型改名：換掉 name 表 ========
/**
 * 字型檔（sfnt）的結構像一本書：開頭是目錄（每個表的名稱、位置、長度），後面是各個表的內容。
 * 這裡只把其中的 name 表（記錄字型名稱、版權）換成新的，其他表原封不動搬過去，再重新排目錄。
 */
function renameFont(font, { family, copyright }) {
  const numTables = font.readUInt16BE(4)
  const tables = Array.from({ length: numTables }, (_, i) => {
    const entry = 12 + i * 16
    const tag = font.toString('latin1', entry, entry + 4)
    const offset = font.readUInt32BE(entry + 8)
    const data = tag === 'name' ? null : font.subarray(offset, offset + font.readUInt32BE(entry + 12))
    return { tag, data }
  })
  const postScriptName = `${family.replace(/\s/g, '')}-Regular`
  const nameTable = buildNameTable([copyright, family, 'Regular', postScriptName, family, 'Version 1.0', postScriptName])
  for (const table of tables) table.data ??= nameTable

  // 每個表的起點要對齊 4 bytes
  let offset = 12 + numTables * 16
  const layout = tables.map((table) => {
    const start = offset
    offset += Math.ceil(table.data.length / 4) * 4
    return start
  })
  const output = Buffer.alloc(offset)
  font.copy(output, 0, 0, 12)
  tables.forEach((table, i) => {
    const entry = 12 + i * 16
    output.write(table.tag, entry, 'latin1')
    output.writeUInt32BE(checksum(table.data), entry + 4)
    output.writeUInt32BE(layout[i], entry + 8)
    output.writeUInt32BE(table.data.length, entry + 12)
    table.data.copy(output, layout[i])
  })
  return output
}

/** name 表格式 0：名稱 ID 0～6 依序為版權、家族名、樣式、唯一名稱、全名、版本、PostScript 名稱 */
function buildNameTable(strings) {
  const encoded = strings.map((text) => Buffer.from(text, 'utf16le').swap16()) // Windows 平台用 UTF-16 大端序
  const header = Buffer.alloc(6 + encoded.length * 12)
  header.writeUInt16BE(0, 0)
  header.writeUInt16BE(encoded.length, 2)
  header.writeUInt16BE(header.length, 4)
  let stringOffset = 0
  encoded.forEach((bytes, nameId) => {
    const record = 6 + nameId * 12
    header.writeUInt16BE(3, record) // 平台：Windows
    header.writeUInt16BE(1, record + 2) // 編碼：Unicode BMP
    header.writeUInt16BE(0x409, record + 4) // 語言：英文（美國），字型名稱慣例
    header.writeUInt16BE(nameId, record + 6)
    header.writeUInt16BE(bytes.length, record + 8)
    header.writeUInt16BE(stringOffset, record + 10)
    stringOffset += bytes.length
  })
  return Buffer.concat([header, ...encoded])
}

/** 表的校驗碼：以 4 bytes 為單位加總（不足 4 bytes 補 0） */
function checksum(data) {
  const padded = Buffer.alloc(Math.ceil(data.length / 4) * 4)
  data.copy(padded)
  let sum = 0
  for (let i = 0; i < padded.length; i += 4) sum = (sum + padded.readUInt32BE(i)) >>> 0
  return sum
}

await mkdir(CACHE_DIR, { recursive: true })
await mkdir(OUTPUT_DIR, { recursive: true })
const text = await collectText()

for (const font of FONTS) {
  await ensureSource(font)
  const chars = Array.from(text).filter(font.pick).join('')
  const source = await readFile(font.source)
  const input = font.rename ? renameFont(source, font.rename) : source
  const subset = await subsetFont(input, chars, { targetFormat: 'woff2' })
  await writeFile(font.output, subset)
  console.log(`${font.output}：${chars.length} 字，${(subset.length / 1024).toFixed(1)} KB`)
}
