import { expect, test } from '@playwright/test'

for (const theme of ['calm', 'tech', 'game'] as const) {
  test(`${theme} 路线图主题变量与减少动画`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.addInitScript((value) => localStorage.setItem('praxis-path-theme', value), theme)
    await createGraph(page, `${theme} 图体验`)
    await expect(page.locator('html')).toHaveAttribute('data-theme', theme)
    await expect(page.locator('.task-graph')).toBeVisible()
    const routeColor = await page.locator('.task-graph').evaluate((element) => getComputedStyle(element).getPropertyValue('--graph-route-color').trim())
    expect(routeColor).toBe(theme === 'calm' ? '197 145 63' : theme === 'tech' ? '79 209 255' : '255 184 77')
    await expect(page.locator('.graph-node-active')).toHaveCount(1)
    await expect(page.locator('.graph-node-transitioning')).toHaveCount(0)
  })
}

test('连续选择和切换当前目标后节点保持可见', async ({ page }) => {
  await createGraph(page, '图稳定性测试')
  await page.getByRole('button', { name: '继续推进' }).last().click()
  await page.getByLabel('节点内容').fill('第二个稳定节点')
  await page.getByRole('button', { name: '保存节点' }).click()
  for (let index = 0; index < 6; index += 1) {
    await page.locator('.graph-node-content', { hasText: index % 2 ? '可读任务节点正文' : '第二个稳定节点' }).evaluate((element) => (element as HTMLElement).click())
    await expect(page.locator('.graph-node')).toHaveCount(2)
    await expect(page.locator('.graph-node:visible')).toHaveCount(2)
  }
  await page.locator('.graph-node-content', { hasText: '可读任务节点正文' }).evaluate((element) => (element as HTMLElement).click())
  await page.getByRole('button', { name: '设为当前目标' }).click()
  await page.getByRole('button', { name: '确认当前路线' }).click()
  await expect(page.locator('.graph-node')).toHaveCount(2)
  await expect(page.locator('.graph-node:visible')).toHaveCount(2)
  await expect(page.locator('.graph-node-active')).toContainText('可读任务节点正文')
  await page.waitForTimeout(1000)
  await expect(page.locator('.graph-node:visible')).toHaveCount(2)
})

test('冷静和游戏主题的节点操作保持在面板内', async ({ page }) => {
  await page.goto('/projects')
  for (const theme of ['calm', 'game'] as const) {
    await page.evaluate((value) => localStorage.setItem('praxis-path-theme', value), theme)
    await page.reload()
    await createBranchingGraph(page, `${theme} 节点操作边界`)
    const activeNode = page.locator('.graph-node-active')
    const contained = await activeNode.evaluate((node) => {
      const nodeRect = node.getBoundingClientRect()
      const actionsRect = node.querySelector('.graph-node-actions')!.getBoundingClientRect()
      const horizontalInset = Math.min(actionsRect.left - nodeRect.left, nodeRect.right - actionsRect.right)
      const verticalInset = Math.min(actionsRect.top - nodeRect.top, nodeRect.bottom - actionsRect.bottom)
      return { horizontalInset, verticalInset }
    })
    expect(contained.horizontalInset, `${theme} 主题的节点操作区应与左右边界保持间距`).toBeGreaterThanOrEqual(8)
    expect(contained.verticalInset, `${theme} 主题的节点操作区应与上下边界保持间距`).toBeGreaterThanOrEqual(8)
  }
})

test('游戏主题节点文字区域互不重叠', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('praxis-path-theme', 'game'))
  await createGraph(page, '游戏节点排版测试')
  const regions = await page.locator('.graph-node').evaluate((element) => {
    const rect = (selector: string) => element.querySelector(selector)!.getBoundingClientRect()
    return {
      header: rect('.graph-node-header'),
      state: rect('.graph-node-state-row'),
      content: rect('.graph-node-content'),
      footer: rect('.graph-node-footer'),
    }
  })
  expect(regions.header.bottom).toBeLessThanOrEqual(regions.state.top)
  expect(regions.state.bottom).toBeLessThanOrEqual(regions.content.top)
  expect(regions.content.bottom).toBeLessThanOrEqual(regions.footer.top)
})

test('冷静主题补齐聚焦路线与适应全图按钮', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('praxis-path-theme', 'calm'))
  await createGraph(page, '冷静工具栏按钮')
  const actions = page.locator('.graph-paper-action:visible')
  await expect(actions).toHaveCount(2)
  await expect(actions.filter({ hasText: '聚焦路线' })).toBeEnabled()
  await expect(actions.filter({ hasText: '适应全图' })).toBeEnabled()
  await expect(page.locator('.graph-paper-readout')).toBeVisible()
})

test('冷静专属工具栏元素不出现在科技与游戏主题', async ({ page }) => {
  for (const theme of ['tech', 'game'] as const) {
    await page.goto('/projects')
    await page.evaluate((value) => localStorage.setItem('praxis-path-theme', value), theme)
    await page.reload()
    await createGraph(page, `${theme} 不含冷静工具栏`)
    await expect(page.locator('.graph-paper-action:visible')).toHaveCount(0)
    await expect(page.locator('.graph-paper-readout')).toBeHidden()
  }
})

test('桌面侧边栏可以收起并记住状态，同时将项目详情改为纵向阅读', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('praxis-path-theme', 'calm'))
  await createGraph(page, '侧边栏收起测试')
  await page.getByRole('button', { name: '收起侧边栏' }).click()
  await expect(page.locator('html')).toHaveAttribute('data-sidebar', 'collapsed')
  await expect(page.getByRole('button', { name: '展开侧边栏' })).toBeVisible()
  const layout = await page.locator('.project-workspace').evaluate((element) => getComputedStyle(element).gridTemplateColumns)
  expect(layout.split(' ').length).toBe(1)
  const graphLayout = await page.locator('.task-graph-layout').evaluate((element) => getComputedStyle(element).gridTemplateColumns)
  expect(graphLayout.split(' ').length).toBe(1)
  await expect(page.locator('.task-graph-layout .graph-intel-panel')).toHaveCSS('position', 'absolute')
  await page.reload()
  await expect(page.locator('html')).toHaveAttribute('data-sidebar', 'collapsed')
  await expect(page.getByRole('button', { name: '展开侧边栏' })).toBeVisible()
  await page.getByRole('button', { name: '展开侧边栏' }).click()
  await expect(page.locator('html')).toHaveAttribute('data-sidebar', 'expanded')
})

test('侧栏收起后品牌图标居中且各主题装饰文字不越界', async ({ page }) => {
  for (const theme of ['calm', 'tech', 'game'] as const) {
    await page.goto('/projects')
    await page.evaluate((value) => localStorage.setItem('praxis-path-theme', value), theme)
    await page.reload()
    await page.getByRole('button', { name: '收起侧边栏' }).click()
    await expect(page.locator('html')).toHaveAttribute('data-sidebar', 'collapsed')
    await expect(page.locator('.app-sidebar')).toHaveCSS('width', '72px')
    const centering = await page.locator('.app-sidebar').evaluate((sidebar) => {
      const rail = sidebar.getBoundingClientRect()
      const mark = sidebar.querySelector('.sidebar-header span')!.getBoundingClientRect()
      return { left: mark.left - rail.left, right: rail.right - mark.right }
    })
    expect(Math.abs(centering.left - centering.right), `${theme} 主题的图标应左右居中`).toBeLessThanOrEqual(1)
    const overflow = await page.locator('.app-sidebar').evaluate((sidebar) => {
      const rail = sidebar.getBoundingClientRect()
      const nav = sidebar.querySelector('nav')!
      const label = getComputedStyle(nav, '::before')
      const raw = label.content
      const text = raw === 'none' || raw === 'normal' ? '' : raw.replace(/^"|"$/g, '')
      const probe = document.createElement('span')
      probe.style.font = label.font
      probe.style.letterSpacing = label.letterSpacing
      probe.style.whiteSpace = 'pre'
      probe.style.position = 'absolute'
      probe.style.visibility = 'hidden'
      probe.textContent = text
      document.body.append(probe)
      const labelWidth = text ? probe.getBoundingClientRect().width : 0
      probe.remove()
      return { railWidth: rail.width, clientWidth: nav.clientWidth, labelWidth, text }
    })
    expect(overflow.railWidth, `${theme} 主题收起后侧栏应为窄图标栏`).toBeLessThanOrEqual(80)
    expect(overflow.labelWidth, `${theme} 主题的导航装饰文字（${overflow.text || '无'}）不应超出侧栏宽度`).toBeLessThanOrEqual(overflow.clientWidth)
    await page.getByRole('button', { name: '展开侧边栏' }).click()
    await expect(page.locator('html')).toHaveAttribute('data-sidebar', 'expanded')
  }
})

test('窄屏默认收起路线导航图', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await createGraph(page, '窄屏路线图')
  await expect(page.getByRole('button', { name: '展开路线导航图' })).toBeVisible()
  await expect(page.locator('.task-graph')).toBeVisible()
})

async function createBranchingGraph(page: import('@playwright/test').Page, title: string) {
  await page.goto('/projects')
  await page.getByRole('button', { name: '开启新项目', exact: true }).click()
  await page.getByLabel('项目名称').fill(title)
  await page.getByLabel('现实触发').fill('检查节点操作边界')
  await page.getByRole('button', { name: '创建项目' }).click()
  await page.getByRole('link', { name: new RegExp(title) }).click()
  await page.getByRole('button', { name: '添加节点' }).hover()
  await page.getByRole('button', { name: '问题节点', exact: true }).click()
  await page.getByLabel('节点内容').fill('起点节点')
  await page.getByRole('button', { name: '保存节点' }).click()
  await page.getByRole('button', { name: '创建支线' }).click()
  await page.getByLabel('节点内容').fill('用于触发折叠按钮的支线节点')
  await page.getByRole('button', { name: '保存节点' }).click()
  await expect(page.locator('.graph-node-active').getByRole('button', { name: /折叠包含 1 个节点的支线/ })).toBeVisible()
  await expect(page.locator('.graph-node-active').getByRole('button', { name: '继续推进' })).toBeVisible()
}

async function createGraph(page: import('@playwright/test').Page, title: string) {
  await page.goto('/projects')
  await page.getByRole('button', { name: '开启新项目', exact: true }).click()
  await page.getByLabel('项目名称').fill(title)
  await page.getByLabel('现实触发').fill('检查主题路线图')
  await page.getByRole('button', { name: '创建项目' }).click()
  await page.getByRole('link', { name: new RegExp(title) }).click()
  await page.getByRole('button', { name: '添加节点' }).hover()
  await page.getByRole('button', { name: '问题节点', exact: true }).click()
  await page.getByLabel('节点内容').fill('可读任务节点正文')
  await page.getByRole('button', { name: '保存节点' }).click()
}
