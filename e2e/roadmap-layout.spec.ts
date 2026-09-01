import { expect, test, type Locator, type Page } from '@playwright/test'

test('科研节点连接与路线图坐标仅按用户操作变化并持久化', async ({ page }) => {
  await createResearchProject(page, '科研路线图布局')
  await addNode(page, '问题节点', '科研起点')
  await addNode(page, '方案节点', '默认连接节点')
  await expect(page.locator('.react-flow__edge')).toHaveCount(1)

  await page.locator('.react-flow__pane').dispatchEvent('click')
  const viewportCenter = await getFlowViewportCenter(page)
  await addNode(page, '问题节点', '视口独立节点')
  await expect(page.locator('.react-flow__edge')).toHaveCount(1)
  const independent = graphNode(page, '视口独立节点'); const independentPosition = await getGraphPosition(independent)
  expect(Math.hypot(independentPosition.x + 336 / 2 - viewportCenter.x, independentPosition.y + 236 / 2 - viewportCenter.y)).toBeLessThanOrEqual(500)
  await expectNodesNotToOverlap(page)

  await page.getByRole('button', { name: '适应全图' }).click()
  await page.waitForTimeout(600)
  const beforeDrag = await getGraphPosition(independent)
  const dragResult = await dragNodeBy(page, independent, 170, 120)
  const afterDrag = await getGraphPosition(independent)
  expect(Math.hypot(afterDrag.x - beforeDrag.x, afterDrag.y - beforeDrag.y)).toBeGreaterThan(50)
  expectPosition(afterDrag, dragResult.releasePosition)
  for (const sample of dragResult.postReleasePositions) expectPosition(sample, dragResult.releasePosition)
  await page.reload(); await expect(graphNode(page, '视口独立节点')).toBeVisible()
  expectPosition(await getGraphPosition(graphNode(page, '视口独立节点')), afterDrag)

  await page.getByRole('button', { name: '路线重组' }).click()
  await expect(page.getByText('路线图已重组')).toBeVisible()
  const reorganized = await getGraphPosition(graphNode(page, '视口独立节点'))
  expect(Math.hypot(reorganized.x - afterDrag.x, reorganized.y - afterDrag.y)).toBeGreaterThan(50)
  await expectNodesNotToOverlap(page)
  await page.reload(); await expect(graphNode(page, '视口独立节点')).toBeVisible()
  expectPosition(await getGraphPosition(graphNode(page, '视口独立节点')), reorganized)

  const connectedBefore = await Promise.all([getGraphPosition(graphNode(page, '科研起点')), getGraphPosition(graphNode(page, '默认连接节点'))])
  await page.locator('.react-flow__edge').first().dispatchEvent('click')
  await expect(page.getByRole('heading', { name: '连接关系' })).toBeVisible()
  await page.getByRole('button', { name: '删除边' }).click()
  await expect(page.locator('.react-flow__edge')).toHaveCount(0)
  const connectedAfter = await Promise.all([getGraphPosition(graphNode(page, '科研起点')), getGraphPosition(graphNode(page, '默认连接节点'))])
  expectPosition(connectedAfter[0], connectedBefore[0]); expectPosition(connectedAfter[1], connectedBefore[1])
  await page.reload(); await expect(page.locator('.react-flow__edge')).toHaveCount(0)
  expectPosition(await getGraphPosition(graphNode(page, '科研起点')), connectedBefore[0]); expectPosition(await getGraphPosition(graphNode(page, '默认连接节点')), connectedBefore[1])
})

async function createResearchProject(page: Page, title: string) {
  await page.goto('/projects')
  await page.getByRole('button', { name: '开启新项目', exact: true }).click()
  await page.getByLabel('项目名称').fill(title)
  await page.getByLabel('现实触发').fill('验证科研路线图布局行为')
  await page.getByLabel('项目类型').selectOption('research')
  await page.getByRole('button', { name: '创建项目' }).click()
  await page.getByRole('link', { name: new RegExp(title) }).click()
}

async function addNode(page: Page, typeName: string, content: string) {
  await page.getByRole('button', { name: '添加节点' }).hover()
  await page.getByRole('button', { name: typeName, exact: true }).click()
  await page.getByLabel('节点内容').fill(content)
  await page.getByRole('button', { name: '保存节点' }).click()
  await expect(graphNode(page, content)).toBeVisible()
}

const graphNode = (page: Page, content: string) => page.locator('.react-flow__node', { hasText: content })

async function getGraphPosition(node: Locator) {
  return node.evaluate((element) => { const matrix = new DOMMatrix(getComputedStyle(element).transform); return { x: matrix.m41, y: matrix.m42 } })
}

async function getFlowViewportCenter(page: Page) {
  return page.locator('.react-flow').evaluate((element) => {
    const bounds = element.getBoundingClientRect(); const viewport = element.querySelector('.react-flow__viewport')!; const matrix = new DOMMatrix(getComputedStyle(viewport).transform)
    return { x: (bounds.width / 2 - matrix.m41) / matrix.a, y: (bounds.height / 2 - matrix.m42) / matrix.d }
  })
}

async function dragNodeBy(page: Page, node: Locator, deltaX: number, deltaY: number) {
  await node.scrollIntoViewIfNeeded()
  const bounds = await node.locator('.graph-node-content').boundingBox(); if (!bounds) throw new Error('路线图节点不可见')
  const nodeId = await node.getAttribute('data-id'); if (!nodeId) throw new Error('路线图节点缺少标识')
  const start = { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 }
  await page.mouse.move(start.x, start.y); await page.mouse.down(); await page.mouse.move(start.x + deltaX, start.y + deltaY, { steps: 8 }); await page.waitForTimeout(50)
  const releasePosition = await getGraphPosition(node)
  await page.evaluate((id) => {
    type DragSampleWindow = Window & { __roadmapDragSamples?: { x: number; y: number }[] }
    const target = window as DragSampleWindow; target.__roadmapDragSamples = []; let frames = 0
    const sample = () => { const element = document.querySelector<HTMLElement>(`.react-flow__node[data-id="${id}"]`); if (element) { const matrix = new DOMMatrix(getComputedStyle(element).transform); target.__roadmapDragSamples!.push({ x: matrix.m41, y: matrix.m42 }) } if (frames < 10) { frames += 1; requestAnimationFrame(sample) } }
    requestAnimationFrame(sample)
  }, nodeId)
  await page.mouse.up(); await page.waitForTimeout(200)
  const postReleasePositions = await page.evaluate(() => (window as Window & { __roadmapDragSamples?: { x: number; y: number }[] }).__roadmapDragSamples ?? [])
  return { releasePosition, postReleasePositions }
}

async function expectNodesNotToOverlap(page: Page) {
  const positions = await page.locator('.react-flow__node[data-id]:not([data-id^="branch-summary:"])').evaluateAll((elements) => elements.map((element) => { const matrix = new DOMMatrix(getComputedStyle(element).transform); return { x: matrix.m41, y: matrix.m42, width: 336, height: 236 } }))
  expect(positions.length).toBeGreaterThan(1)
  for (let left = 0; left < positions.length; left += 1) for (let right = left + 1; right < positions.length; right += 1) {
    const a = positions[left]; const b = positions[right]; expect(a.x + a.width <= b.x || b.x + b.width <= a.x || a.y + a.height <= b.y || b.y + b.height <= a.y).toBe(true)
  }
}

function expectPosition(actual: { x: number; y: number }, expected: { x: number; y: number }) {
  expect(actual.x).toBeCloseTo(expected.x, 3); expect(actual.y).toBeCloseTo(expected.y, 3)
}
