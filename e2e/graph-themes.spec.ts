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
