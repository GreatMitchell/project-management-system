import { expect, test, type Page } from '@playwright/test'

test('路线图可以进入页面内全屏并用 Esc 退出', async ({ page }) => {
  await createGeneralGraph(page, '全屏体验项目')
  await page.getByRole('button', { name: '全屏', exact: true }).click()
  const fullscreenLayout = page.locator('.task-graph-fullscreen')
  await expect(fullscreenLayout).toBeVisible()
  await expect(fullscreenLayout.locator('.graph-intel-panel')).toBeVisible()
  expect(await page.evaluate(() => document.body.style.overflow)).toBe('hidden')

  // 打开搜索弹窗时 Esc 只被对话框场景守卫，不退出全屏
  await fullscreenLayout.getByRole('button', { name: '搜索节点' }).click()
  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.locator('.task-graph-fullscreen')).toBeVisible()
  await dialog.getByRole('button', { name: '关闭' }).click()

  await page.keyboard.press('Escape')
  await expect(page.locator('.task-graph-fullscreen')).toHaveCount(0)
  expect(await page.evaluate(() => document.body.style.overflow)).toBe('')
})

test('侧栏收起时全屏的情报面板悬浮在路线图右下方', async ({ page }) => {
  await createGeneralGraph(page, '全屏悬浮面板项目')
  await page.getByRole('button', { name: '收起侧边栏' }).click()
  await selectGraphNode(page, '可读任务节点正文')
  await page.getByRole('button', { name: '全屏', exact: true }).click()
  const fullscreenLayout = page.locator('.task-graph-fullscreen')
  await expect(fullscreenLayout).toBeVisible()
  const panel = fullscreenLayout.locator('.graph-intel-panel')
  await expect(panel).toBeVisible()
  await expect(panel).toHaveCSS('position', 'absolute')
  const panelBox = await panel.boundingBox()
  const viewport = page.viewportSize()
  expect(panelBox).toBeTruthy()
  expect(viewport).toBeTruthy()
  expect(panelBox!.x + panelBox!.width).toBeLessThanOrEqual(viewport!.width)
  expect(panelBox!.y + panelBox!.height).toBeLessThanOrEqual(viewport!.height)
  // 小地图让位到悬浮面板左侧，不被遮住
  const minimapBox = await fullscreenLayout.locator('.graph-minimap-panel').boundingBox()
  expect(minimapBox).toBeTruthy()
  expect(minimapBox!.x + minimapBox!.width).toBeLessThanOrEqual(panelBox!.x)
  await page.keyboard.press('Escape')
  await expect(page.locator('.task-graph-fullscreen')).toHaveCount(0)
})

test('全屏覆盖层盖住侧栏（展开与收起）', async ({ page }) => {
  await createGeneralGraph(page, '全屏遮挡侧栏项目')
  const assertSidebarCovered = async () => {
    const sidebarBox = await page.locator('.app-sidebar').boundingBox()
    expect(sidebarBox).toBeTruthy()
    const covered = await page.evaluate(({ x, y }) => document.elementFromPoint(x, y)?.closest('.task-graph-fullscreen') != null, { x: sidebarBox!.x + sidebarBox!.width / 2, y: sidebarBox!.y + sidebarBox!.height / 2 })
    expect(covered).toBe(true)
  }
  await page.getByRole('button', { name: '全屏', exact: true }).click()
  await expect(page.locator('.task-graph-fullscreen')).toBeVisible()
  await assertSidebarCovered()
  await page.keyboard.press('Escape')
  await expect(page.locator('.task-graph-fullscreen')).toHaveCount(0)

  await page.getByRole('button', { name: '收起侧边栏' }).click()
  await page.getByRole('button', { name: '全屏', exact: true }).click()
  await expect(page.locator('.task-graph-fullscreen')).toBeVisible()
  await assertSidebarCovered()
  await page.keyboard.press('Escape')
  await expect(page.locator('.task-graph-fullscreen')).toHaveCount(0)
})

test('全屏工具栏可以添加节点', async ({ page }) => {
  await createGeneralGraph(page, '全屏添加节点项目')
  await page.getByRole('button', { name: '全屏', exact: true }).click()
  const fullscreenLayout = page.locator('.task-graph-fullscreen')
  await expect(fullscreenLayout).toBeVisible()
  // 头部同名按钮仍在 DOM（被覆盖层遮挡），必须 scope 到全屏容器
  await fullscreenLayout.getByRole('button', { name: '添加节点' }).hover()
  // hover 弹层与按钮之间有空隙，与页面头部下拉一致地用 dispatchEvent 绕开竞态
  await fullscreenLayout.getByRole('button', { name: '方案节点', exact: true }).dispatchEvent('click')
  await page.getByLabel('节点内容').fill('全屏中创建的方案节点')
  await page.getByRole('button', { name: '保存节点' }).click()
  await expect(graphNode(page, '全屏中创建的方案节点')).toBeVisible()
  // Esc 不会误退全屏（对话框关闭后覆盖层保留）
  await expect(page.locator('.task-graph-fullscreen')).toBeVisible()
  await expect(fullscreenLayout.locator('.graph-intel-panel')).toContainText('全屏中创建的方案节点')
})

test('搜索节点支持按类型筛选且筛选跨开合保留', async ({ page }) => {
  await createGeneralGraph(page, '搜索筛选项目')
  await addNode(page, '方案节点', '待办方案节点正文')
  await page.getByRole('button', { name: '搜索节点' }).click()
  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()
  await expect(dialog.locator('button').filter({ hasText: '可读任务节点正文' })).toHaveCount(1)
  await expect(dialog.locator('button').filter({ hasText: '待办方案节点正文' })).toHaveCount(1)

  await dialog.locator('.filter-chip').filter({ hasText: '方案' }).click()
  await expect(dialog.locator('button').filter({ hasText: '待办方案节点正文' })).toHaveCount(1)
  await expect(dialog.locator('button').filter({ hasText: '可读任务节点正文' })).toHaveCount(0)

  await dialog.getByRole('button', { name: '关闭' }).click()
  await expect(dialog).toHaveCount(0)
  await page.getByRole('button', { name: '搜索节点' }).click()
  await expect(dialog.locator('.filter-chip-active').filter({ hasText: '方案' })).toHaveCount(1)
  await expect(dialog.locator('button').filter({ hasText: '可读任务节点正文' })).toHaveCount(0)
})

test('科研项目搜索可按无状态与缺陷状态筛选', async ({ page }) => {
  await createResearchProject(page, '科研筛选项目')
  await addNode(page, '问题节点', '科研筛选问题正文')
  await addNode(page, '假设节点', '科研筛选假设正文')
  await addNode(page, '缺陷节点', '科研筛选缺陷正文')
  await page.getByRole('button', { name: '搜索节点' }).click()
  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()
  await dialog.locator('.filter-chip').filter({ hasText: '无状态' }).click()
  await expect(dialog.locator('button').filter({ hasText: '科研筛选假设正文' })).toHaveCount(1)
  await expect(dialog.locator('button').filter({ hasText: '科研筛选问题正文' })).toHaveCount(0)
  await expect(dialog.locator('button').filter({ hasText: '科研筛选缺陷正文' })).toHaveCount(0)
  await dialog.locator('.filter-chip').filter({ hasText: '无状态' }).click()
  await dialog.locator('.filter-chip').filter({ hasText: '待探索' }).click()
  await expect(dialog.locator('button').filter({ hasText: '科研筛选缺陷正文' })).toHaveCount(1)
  await expect(dialog.locator('button').filter({ hasText: '科研筛选假设正文' })).toHaveCount(0)
  await expect(dialog.locator('button').filter({ hasText: '科研筛选问题正文' })).toHaveCount(0)
})

test('情报面板展示连入连出与边类型并支持双向跳转', async ({ page }) => {
  await createResearchProject(page, '连接跳转项目')
  await addNode(page, '问题节点', '科研起点')
  await addNode(page, '方案节点', '默认连接节点')
  await expect(page.locator('.react-flow__edge')).toHaveCount(1)

  await selectGraphNode(page, '科研起点')
  const panel = page.locator('.graph-intel-panel')
  await expect(panel).toContainText('连出 (1)')
  await expect(panel).toContainText('暂无连入连接')
  await panel.getByRole('button', { name: /默认连接节点/ }).click()
  await expect(panel).toContainText('连入 (1)')
  await expect(panel).toContainText('暂无连出连接')

  await page.locator('.react-flow__edge').first().dispatchEvent('click')
  await expect(page.getByRole('heading', { name: '连接关系' })).toBeVisible()
  await page.getByLabel('边类型').selectOption('exposes')
  await panel.getByRole('button', { name: /来源/ }).click()
  await expect(panel).toContainText('连出 (1)')
  await expect(panel.getByRole('button', { name: /默认连接节点/ })).toContainText('暴露')

  await panel.getByRole('button', { name: /默认连接节点/ }).click()
  await expect(panel).toContainText('连入 (1)')
  await expect(panel.getByRole('button', { name: /科研起点/ })).toContainText('暴露')
})

async function createGeneralGraph(page: Page, title: string) {
  await openNewProject(page, title, '检查路线图新交互')
  await addNode(page, '问题节点', '可读任务节点正文')
}

async function createResearchProject(page: Page, title: string) {
  await page.goto('/projects')
  await page.getByRole('button', { name: '开启新项目', exact: true }).click()
  await page.getByLabel('项目名称').fill(title)
  await page.getByLabel('现实触发').fill('验证情报面板与筛选交互')
  await page.getByLabel('项目类型').selectOption('research')
  await page.getByRole('button', { name: '创建项目' }).click()
  await page.getByRole('link', { name: new RegExp(title) }).click()
}

async function openNewProject(page: Page, title: string, trigger: string) {
  await page.goto('/projects')
  await page.getByRole('button', { name: '开启新项目', exact: true }).click()
  await page.getByLabel('项目名称').fill(title)
  await page.getByLabel('现实触发').fill(trigger)
  await page.getByRole('button', { name: '创建项目' }).click()
  await page.getByRole('link', { name: new RegExp(title) }).click()
}

async function addNode(page: Page, typeName: string, content: string) {
  await page.getByRole('button', { name: '添加节点' }).hover()
  // hover 弹层与按钮之间有空隙，高并发下命中测试可能被情报面板拦截；直接派发 click 绕开竞态
  await page.getByRole('button', { name: typeName, exact: true }).dispatchEvent('click')
  await page.getByLabel('节点内容').fill(content)
  await page.getByRole('button', { name: '保存节点' }).click()
  await expect(graphNode(page, content)).toBeVisible()
}

async function selectGraphNode(page: Page, content: string) {
  const node = graphNode(page, content)
  await node.locator('.graph-node-content').evaluate((element) => (element as HTMLElement).click())
  const panel = page.locator('.graph-intel-panel')
  await expect(panel).toContainText(content)
}

const graphNode = (page: Page, content: string) => page.locator('.react-flow__node', { hasText: content })
