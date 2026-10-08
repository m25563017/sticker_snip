import { beforeEach, describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'
import { createPinia, setActivePinia } from 'pinia'
import { useEditorStore } from '@/stores/editor'
import type { PixelBuffer } from '@/lib/pixelBuffer'
import { processSelection } from '@/lib/processSelection'
import { useSelectionPreviews } from './useSelectionPreviews'

// 保留真正的去背邏輯，只是包一層「計數器」，用來確認快取有沒有省下重算
vi.mock('@/lib/processSelection', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/processSelection')>()
  return { processSelection: vi.fn(actual.processSelection) }
})

function makeWhiteImage(width = 20, height = 20): PixelBuffer {
  return { data: new Uint8ClampedArray(width * height * 4).fill(255), width, height }
}

function rect(x: number) {
  return { type: 'rect' as const, bounds: { x, y: 0, width: 8, height: 8 } }
}

describe('useSelectionPreviews', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.mocked(processSelection).mockClear()
  })

  it('每個範圍都產生一份預覽', async () => {
    const editorStore = useEditorStore()
    editorStore.sourcePixels = makeWhiteImage()
    const { previews } = useSelectionPreviews()

    editorStore.addSelection(rect(0))
    editorStore.addSelection(rect(10))
    await nextTick()

    expect([...previews.value.keys()]).toEqual([1, 2])
  })

  it('只修改其中一個範圍時，只重算那一個', async () => {
    const editorStore = useEditorStore()
    editorStore.sourcePixels = makeWhiteImage()
    const { previews } = useSelectionPreviews()
    editorStore.addSelection(rect(0))
    editorStore.addSelection(rect(10))
    await nextTick()
    const untouchedBefore = previews.value.get(2)
    vi.mocked(processSelection).mockClear()

    editorStore.updateSelection(1, { threshold: 80 })
    await nextTick()

    expect(processSelection).toHaveBeenCalledTimes(1)
    // 沒被修改的範圍沿用同一份結果物件
    expect(previews.value.get(2)).toBe(untouchedBefore)
  })

  it('修改不影響去背結果的欄位（自動／手動標記）時，不重算', async () => {
    const editorStore = useEditorStore()
    editorStore.sourcePixels = makeWhiteImage()
    useSelectionPreviews()
    editorStore.addSelection(rect(0))
    await nextTick()
    vi.mocked(processSelection).mockClear()

    editorStore.selections[0].createdBy = 'auto'
    await nextTick()

    expect(processSelection).not.toHaveBeenCalled()
  })

  it('切換邊緣品質時，所有範圍都重算', async () => {
    const editorStore = useEditorStore()
    editorStore.sourcePixels = makeWhiteImage()
    useSelectionPreviews()
    editorStore.addSelection(rect(0))
    editorStore.addSelection(rect(10))
    await nextTick()
    vi.mocked(processSelection).mockClear()

    editorStore.outputSettings.edgeQuality = 'pixel'
    await nextTick()

    expect(processSelection).toHaveBeenCalledTimes(2)
  })

  it('手動修改後，只重算那個範圍', async () => {
    const editorStore = useEditorStore()
    editorStore.sourcePixels = makeWhiteImage()
    useSelectionPreviews()
    editorStore.addSelection(rect(0))
    editorStore.addSelection(rect(10))
    await nextTick()
    vi.mocked(processSelection).mockClear()

    editorStore.addManualEdit(1, { tool: 'wand', point: { x: 3, y: 3 } })
    await nextTick()

    expect(processSelection).toHaveBeenCalledTimes(1)
  })

  it('刪除範圍後，預覽一併移除', async () => {
    const editorStore = useEditorStore()
    editorStore.sourcePixels = makeWhiteImage()
    const { previews } = useSelectionPreviews()
    editorStore.addSelection(rect(0))
    editorStore.addSelection(rect(10))
    await nextTick()

    editorStore.removeSelection(1)
    await nextTick()

    expect([...previews.value.keys()]).toEqual([2])
  })

  it('換新圖後，同樣編號的範圍不會沿用舊圖的結果', async () => {
    const editorStore = useEditorStore()
    editorStore.sourcePixels = makeWhiteImage()
    const { previews } = useSelectionPreviews()
    editorStore.addSelection(rect(0))
    await nextTick()
    const oldPreview = previews.value.get(1)

    // 模擬上傳新圖：reset 後編號從 1 重來，範圍座標也一模一樣
    editorStore.reset()
    editorStore.sourcePixels = makeWhiteImage()
    editorStore.addSelection(rect(0))
    await nextTick()

    expect(previews.value.get(1)).not.toBe(oldPreview)
  })
})
