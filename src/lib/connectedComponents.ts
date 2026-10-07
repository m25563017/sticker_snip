/**
 * 找出所有「相連的像素群」並逐一交給 onComponent 處理（8 方向相連，含斜角）。
 *
 * 清雜點、自動偵測貼紙都需要「把相連的像素分成一群一群」，共用這一份 BFS。
 * 採 8 方向：手繪的細斜線在像素上常常只靠斜角相連，只看上下左右會被拆成很多碎塊。
 *
 * @param isMember 判斷某個像素是否屬於要分群的對象（例如「不透明」或「是前景」）
 * @param onComponent 每找到一群就呼叫一次；pixels 是這群所有像素的一維索引。
 *   pixels 是共用緩衝區的一段，下一群會覆蓋它，需要保留請自行複製。
 */
export function forEachComponent(
  width: number,
  height: number,
  isMember: (pixelIndex: number) => boolean,
  onComponent: (pixels: Int32Array) => void,
): void {
  const total = width * height
  const visited = new Uint8Array(total)
  // 每群 BFS 都從 0 開始重複使用：處理完一群，queue[0, tail) 剛好就是這群的所有像素
  const queue = new Int32Array(total)

  for (let start = 0; start < total; start++) {
    if (visited[start] || !isMember(start)) continue

    let head = 0
    let tail = 0
    visited[start] = 1
    queue[tail++] = start

    while (head < tail) {
      const pixelIndex = queue[head++]
      const x = pixelIndex % width
      const y = (pixelIndex - x) / width

      for (let dy = -1; dy <= 1; dy++) {
        const ny = y + dy
        if (ny < 0 || ny >= height) continue
        for (let dx = -1; dx <= 1; dx++) {
          const nx = x + dx
          if ((dx === 0 && dy === 0) || nx < 0 || nx >= width) continue
          const neighbor = ny * width + nx
          if (visited[neighbor] || !isMember(neighbor)) continue
          visited[neighbor] = 1
          queue[tail++] = neighbor
        }
      }
    }

    onComponent(queue.subarray(0, tail))
  }
}
