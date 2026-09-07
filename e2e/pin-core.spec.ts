import { expect, test } from '@playwright/test'

test('项目置顶独立分组与取消置顶', async ({ page }) => {
  await page.goto('/projects')
  await createProject(page, '置顶验证甲', '验证置顶分组')
  await createProject(page, '置顶验证乙', '验证置顶分组')
  await expect(page.locator('.project-card')).toHaveCount(2)

  await page.getByRole('button', { name: '置顶：置顶验证甲' }).click()
  await expect(page.locator('.project-card-pinned')).toHaveCount(1)
  await expect(page.locator('.pinned-divider')).toHaveCount(2)
  await expect(page.locator('.project-card-pinned')).toContainText('置顶验证甲')
  const firstSlot = page.locator('.project-card-slot').first()
  await expect(firstSlot).toContainText('置顶验证甲')
  await expect(firstSlot.locator('.project-card-pinned')).toHaveCount(1)

  await page.getByRole('button', { name: '暂停' }).click()
  await expect(page.locator('.project-card')).toHaveCount(0)
  await expect(page.getByText('没有符合条件的项目')).toBeVisible()
  await page.getByRole('button', { name: '全部' }).click()

  await page.getByRole('link', { name: /置顶验证甲/ }).click()
  await page.getByRole('button', { name: '取消置顶' }).click()
  await page.goto('/projects')
  await expect(page.locator('.project-card-pinned')).toHaveCount(0)
  await expect(page.locator('.pinned-divider')).toHaveCount(0)
})

for (const theme of ['calm', 'tech', 'game'] as const) {
  test(`${theme} 主题置顶卡片高亮`, async ({ page }) => {
    await page.addInitScript((value) => localStorage.setItem('praxis-path-theme', value), theme)
    await page.goto('/projects')
    await createProject(page, `${theme} 置顶高亮`, '主题高亮验证')
    await page.getByRole('button', { name: /置顶：/ }).click()
    await expect(page.locator('html')).toHaveAttribute('data-theme', theme)
    await expect(page.locator('.project-card-pinned')).toBeVisible()
    await expect(page.locator('.project-card-pinned .project-pin-badge')).toBeVisible()
  })
}

test('核心节点跨项目聚焦、行内编辑与深链定位', async ({ page }) => {
  await page.goto('/projects')
  await page.getByRole('button', { name: '开启新项目', exact: true }).click()
  await page.getByLabel('项目名称').fill('核心聚焦验证')
  await page.getByLabel('现实触发').fill('验证核心任务表')
  await page.getByRole('button', { name: '创建项目' }).click()
  await page.getByRole('link', { name: /核心聚焦验证/ }).click()
  await page.getByRole('button', { name: '添加节点' }).hover()
  await page.getByRole('button', { name: '问题节点', exact: true }).click()
  await page.getByLabel('节点内容').fill('需要聚焦的关键问题')
  await page.getByRole('button', { name: '保存节点' }).click()
  await page.locator('.graph-intel-panel').getByRole('button', { name: '设为核心' }).click()

  await page.getByRole('link', { name: '核心聚焦', exact: true }).click()
  const row = page.locator('.focus-table tbody tr')
  await expect(row).toHaveCount(1)
  await expect(row).toContainText('核心聚焦验证')
  await expect(row).toContainText('需要聚焦的关键问题')

  await row.getByRole('button', { name: '编辑内容' }).click()
  await row.getByLabel('节点内容').fill('已在核心表更新内容')
  await row.getByRole('button', { name: '保存', exact: true }).click()
  await expect(row).toContainText('已在核心表更新内容')
  await expect(row.getByRole('button', { name: '保存', exact: true })).toHaveCount(0)

  await row.getByLabel('节点状态').selectOption('completed')
  await expect(row.getByLabel('节点状态')).toHaveValue('completed')

  await row.getByRole('link', { name: '核心聚焦验证', exact: true }).click()
  await expect(page).toHaveURL(/\/projects\/[^/]+\?node=/)
  await expect(page.locator('.graph-node-selected')).toHaveCount(1)
  await expect(page.locator('.graph-intel-panel')).toContainText('已在核心表更新内容')

  await page.getByRole('link', { name: '核心聚焦', exact: true }).click()
  await page.getByRole('button', { name: /取消核心/ }).click()
  await expect(page.locator('.focus-table')).toHaveCount(0)
  await expect(page.getByText('还没有核心节点')).toBeVisible()
})

test('已完结项目的核心默认隐藏可切换显示', async ({ page }) => {
  await page.goto('/projects')
  await page.getByRole('button', { name: '开启新项目', exact: true }).click()
  await page.getByLabel('项目名称').fill('完结聚焦验证')
  await page.getByLabel('现实触发').fill('验证完结过滤')
  await page.getByRole('button', { name: '创建项目' }).click()
  await page.getByRole('link', { name: /完结聚焦验证/ }).click()
  await page.getByRole('button', { name: '添加节点' }).hover()
  await page.getByRole('button', { name: '问题节点', exact: true }).click()
  await page.getByLabel('节点内容').fill('完结前的关键问题')
  await page.getByRole('button', { name: '保存节点' }).click()
  await page.locator('.graph-intel-panel').getByRole('button', { name: '设为核心' }).click()
  await page.getByLabel('项目状态').selectOption('abandoned')

  await page.getByRole('link', { name: '核心聚焦', exact: true }).click()
  await expect(page.locator('.focus-table tbody tr')).toHaveCount(0)
  await expect(page.getByText('已完结项目的核心节点已隐藏，勾选上方选项即可查看。')).toBeVisible()
  await expect(page.getByText('共 0 个核心节点 · 已隐藏 1 个来自已完结项目')).toBeVisible()
  await page.getByLabel('显示已完结项目的核心').check()
  await expect(page.locator('.focus-table tbody tr')).toHaveCount(1)
  await expect(page.locator('.focus-table tbody tr')).toContainText('完结前的关键问题')
})

async function createProject(page: import('@playwright/test').Page, title: string, trigger: string) {
  await page.getByRole('button', { name: '开启新项目', exact: true }).click()
  await expect(page.getByLabel('项目名称')).toBeVisible()
  // 等待表单重置副作用执行完毕，避免清空随后填入的内容（同一页面第二次打开表单时的竞态）
  await page.waitForTimeout(150)
  await page.getByLabel('项目名称').fill(title)
  await page.getByLabel('现实触发').fill(trigger)
  await page.getByRole('button', { name: '创建项目' }).click()
  await expect(page.getByRole('link', { name: new RegExp(title) })).toBeVisible()
}
