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
  // 等待取消置顶的写入完成（toast 在 await repository.toggleProjectPin 之后弹出）再跳转，
  // 否则立即 goto 会在 IndexedDB 事务提交前卸载页面，重载后置顶状态回退
  await expect(page.getByText('已取消置顶')).toBeVisible()
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
  // 拉长节点链，让深链目标（链首的核心节点）偏离初始全图视野中心，聚焦断言才有区分度
  for (const content of ['延伸方案一', '延伸方案二', '延伸方案三']) {
    await page.locator('.graph-intel-panel').getByRole('button', { name: '继续推进' }).click()
    await page.getByLabel('节点内容').fill(content)
    await page.getByRole('button', { name: '保存节点' }).click()
  }

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
  await expectViewportFocusedOn(page, '已在核心表更新内容')

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

test('搜索节点并定位选中', async ({ page }) => {
  await page.goto('/projects')
  await page.getByRole('button', { name: '开启新项目', exact: true }).click()
  await page.getByLabel('项目名称').fill('搜索验证')
  await page.getByLabel('现实触发').fill('验证节点搜索')
  await page.getByRole('button', { name: '创建项目' }).click()
  await page.getByRole('link', { name: /搜索验证/ }).click()
  await page.getByRole('button', { name: '添加节点' }).hover()
  await page.getByRole('button', { name: '问题节点', exact: true }).click()
  await page.getByLabel('节点内容').fill('起点问题正文')
  await page.getByRole('button', { name: '保存节点' }).click()
  // 建立五节点链，让目标节点（第 4 个）偏离初始全图视野中心，聚焦断言才有区分度
  for (const content of ['垫层方案一', '垫层方案二', '深处的目标方案', '垫层方案四']) {
    await page.locator('.graph-intel-panel').getByRole('button', { name: '继续推进' }).click()
    await page.getByLabel('节点内容').fill(content)
    await page.getByRole('button', { name: '保存节点' }).click()
  }

  await page.getByRole('button', { name: '搜索节点' }).first().click()
  await page.getByRole('textbox', { name: '搜索节点' }).fill('目标方案')
  await page.getByRole('dialog').getByRole('button', { name: /目标方案/ }).click()
  await expect(page.locator('.graph-node-selected')).toHaveCount(1)
  await expect(page.locator('.graph-intel-panel')).toContainText('深处的目标方案')
  await expectViewportFocusedOn(page, '深处的目标方案')
})

test('单击路线图空白处一次即收起节点面板', async ({ page }) => {
  await page.goto('/projects')
  await page.getByRole('button', { name: '开启新项目', exact: true }).click()
  await page.getByLabel('项目名称').fill('收起面板验证')
  await page.getByLabel('现实触发').fill('验证单击空白收起')
  await page.getByRole('button', { name: '创建项目' }).click()
  await page.getByRole('link', { name: /收起面板验证/ }).click()
  await page.getByRole('button', { name: '添加节点' }).hover()
  await page.getByRole('button', { name: '问题节点', exact: true }).click()
  await page.getByLabel('节点内容').fill('待收起的节点')
  await page.getByRole('button', { name: '保存节点' }).click()
  await expect(page.locator('.graph-intel-panel')).toContainText('待收起的节点')
  await expect(page).toHaveURL(/\/projects\/[^/]+\?node=/)

  // 等保存节点后的聚焦动画（约 500ms）结束再点击画布左上角的空白区域（避开节点、小地图与缩放控件）：
  // 动画期间节点会在画布上移动，中途点击可能命中移动中的节点而非空白。单击后面板应收起
  //（回归：曾被路由参数竞态弹回旧选中，需要双击才收起）。
  await page.waitForTimeout(800)
  const paneBox = await page.locator('.react-flow__pane').boundingBox()
  await page.mouse.click(paneBox!.x + 48, paneBox!.y + 48)

  await expect(page.locator('.graph-intel-panel')).toContainText('选择节点或连接以查看详情')
  await expect(page).not.toHaveURL(/node=/)
})

test('科研重点关注不进入核心表而核心标记进入', async ({ page }) => {
  await page.goto('/projects')
  await page.getByRole('button', { name: '开启新项目', exact: true }).click()
  await page.getByLabel('项目名称').fill('科研双标记')
  await page.getByLabel('现实触发').fill('验证重点关注与核心分离')
  await page.getByLabel('项目类型').selectOption('research')
  await page.getByRole('button', { name: '创建项目' }).click()
  await page.getByRole('link', { name: /科研双标记/ }).click()
  await page.getByRole('button', { name: '添加节点' }).hover()
  await page.getByRole('button', { name: '问题节点', exact: true }).click()
  await page.getByLabel('节点内容').fill('研究中的关键缺陷')
  await page.getByRole('button', { name: '保存节点' }).click()
  await page.locator('.graph-intel-panel').getByRole('button', { name: '设为重点关注' }).click()

  await page.getByRole('link', { name: '核心聚焦', exact: true }).click()
  await expect(page.getByText('还没有核心节点')).toBeVisible()

  await page.getByRole('link', { name: '项目路线', exact: true }).click()
  await page.getByRole('link', { name: /科研双标记/ }).click()
  await page.locator('.graph-node-content', { hasText: '研究中的关键缺陷' }).click()
  await page.locator('.graph-intel-panel').getByRole('button', { name: '设为核心' }).click()
  await page.getByRole('link', { name: '核心聚焦', exact: true }).click()
  await expect(page.locator('.focus-table tbody tr')).toHaveCount(1)
  await expect(page.locator('.focus-table tbody tr')).toContainText('研究中的关键缺陷')
})

test('科研项目定位目标弹出重点关注列表并跳转', async ({ page }) => {
  await page.goto('/projects')
  await page.getByRole('button', { name: '开启新项目', exact: true }).click()
  await page.getByLabel('项目名称').fill('定位目标验证')
  await page.getByLabel('现实触发').fill('验证重点关注定位')
  await page.getByLabel('项目类型').selectOption('research')
  await page.getByRole('button', { name: '创建项目' }).click()
  await page.getByRole('link', { name: /定位目标验证/ }).click()
  await page.getByRole('button', { name: '添加节点' }).hover()
  await page.getByRole('button', { name: '问题节点', exact: true }).click()
  await page.getByLabel('节点内容').fill('重点关注缺陷')
  await page.getByRole('button', { name: '保存节点' }).click()

  // 无重点关注时按钮禁用
  await expect(page.getByRole('button', { name: '定位目标' })).toBeDisabled()

  // 拉长节点链，让重点目标（链首）偏离初始全图视野中心，聚焦断言才有区分度
  for (const content of ['垫层缺陷一', '垫层缺陷二', '垫层缺陷三']) {
    await page.getByRole('button', { name: '添加节点' }).hover()
    await page.getByRole('button', { name: '问题节点', exact: true }).click()
    await page.getByLabel('节点内容').fill(content)
    await page.getByRole('button', { name: '保存节点' }).click()
  }

  await page.locator('.graph-node-content', { hasText: '重点关注缺陷' }).click()
  await page.locator('.graph-intel-panel').getByRole('button', { name: '设为重点关注' }).click()
  await expect(page.locator('.graph-node-focused')).toHaveCount(1)
  await expect(page.getByRole('button', { name: '定位目标' })).toBeEnabled()

  await page.getByRole('button', { name: '定位目标' }).click()
  await expect(page.getByRole('dialog')).toContainText('定位重点关注节点')
  await page.getByRole('textbox', { name: '搜索节点' }).fill('重点关注')
  await expect(page.getByRole('dialog')).toContainText('重点关注缺陷')
  await expect(page.getByRole('dialog')).not.toContainText('垫层缺陷一')
  await page.getByRole('dialog').getByRole('button', { name: /重点关注缺陷/ }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(page.locator('.graph-node-selected')).toHaveCount(1)
  await expect(page.locator('.graph-intel-panel')).toContainText('重点关注缺陷')
  await expectViewportFocusedOn(page, '重点关注缺陷')
  await expect(page.locator('.graph-node-focused')).toHaveCount(1)
})

test('普通项目定位目标直接聚焦当前目标', async ({ page }) => {
  await page.goto('/projects')
  await createProject(page, '定位普通验证', '验证普通定位')
  await page.getByRole('link', { name: /定位普通验证/ }).click()
  await page.getByRole('button', { name: '添加节点' }).hover()
  await page.getByRole('button', { name: '问题节点', exact: true }).click()
  await page.getByLabel('节点内容').fill('链头问题')
  await page.getByRole('button', { name: '保存节点' }).click()
  for (const content of ['垫层方案一', '垫层方案二', '链尾目标方案']) {
    await page.locator('.graph-intel-panel').getByRole('button', { name: '继续推进' }).click()
    await page.getByLabel('节点内容').fill(content)
    await page.getByRole('button', { name: '保存节点' }).click()
  }

  // 先等保存节点触发的链尾聚焦动画（420ms 延迟 + ~520ms 动画）结束，再适应全图，
  // 否则排队的聚焦会覆盖适应全图的结果，链头节点仍在视口外且位置不稳定，无法点击
  await page.waitForTimeout(1100)
  await page.getByRole('button', { name: '适应全图' }).click()
  await page.locator('.graph-node-content', { hasText: '链头问题' }).click()
  await page.getByRole('button', { name: '定位目标' }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expectViewportFocusedOn(page, '链尾目标方案')
  // 定位只移动视野，不改变选中状态
  await expect(page.locator('.graph-node-selected')).toHaveCount(1)
  await expect(page.locator('.graph-intel-panel')).toContainText('链头问题')
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

// 断言路线图视野已聚焦到指定节点：节点中心应接近路线图容器中心（fitView 单节点聚焦的结果）
async function expectViewportFocusedOn(page: import('@playwright/test').Page, text: string) {
  const graph = page.locator('.task-graph')
  await expect
    .poll(async () => {
      const graphBox = await graph.boundingBox()
      const nodeBox = await page.locator('.react-flow__node').filter({ hasText: text }).first().boundingBox()
      if (!graphBox || !nodeBox) return Number.NaN
      return Math.hypot(
        nodeBox.x + nodeBox.width / 2 - (graphBox.x + graphBox.width / 2),
        nodeBox.y + nodeBox.height / 2 - (graphBox.y + graphBox.height / 2),
      )
    })
    .toBeLessThan(120)
}
