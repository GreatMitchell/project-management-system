import { expect, test, type Page } from '@playwright/test'
import { copyFile, mkdir, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

// 只读分享全链路：对话框生成自包含 HTML → file:// 打开 → 只读渲染与门控断言。
// 复用 pin-core 的 UI 驱动造数模式：项目 + 两节点链 + 通过的里程碑（连带触发复盘表单）。
async function seedProject(page: Page) {
  await page.goto('/projects')
  await createProject(page, 'Share Snapshot', 'e2e 分享快照验证')
  await page.getByRole('link', { name: /Share Snapshot/ }).click()
  await page.getByRole('button', { name: '添加节点' }).hover()
  await page.getByRole('button', { name: '问题节点', exact: true }).click()
  await page.getByLabel('节点内容').fill('分享链路的起点问题')
  await page.getByLabel(/附加日志/).fill('起点已完成，记录一笔成果。')
  await page.getByRole('button', { name: '保存节点' }).click()
  await expect(page.locator('.graph-node')).toHaveCount(1)
  // 保存后首节点已选中：直接设为通过的里程碑（会自动弹出复盘表单，一并完成两份数据）
  await page.locator('.graph-intel-panel').getByRole('button', { name: '设为里程碑' }).click()
  await page.getByLabel('里程碑名称').fill('首问里程碑')
  await page.getByLabel('验证方式').fill('人工核对')
  await page.getByLabel('通过标准').fill('能说清问题')
  await page.getByLabel('验证结果').selectOption('passed')
  await page.getByRole('button', { name: '创建里程碑' }).click()
  await expect(page.getByRole('dialog')).toContainText('停下来审视路线')
  await page.getByLabel('1. 当前项目健康度如何？').fill('健康度良好')
  await page.getByLabel('2. 最近的执行模式是否有问题？').fill('节奏稳定')
  await page.getByLabel('3. 系统本身是否需要调整？').fill('暂不调整')
  await page.getByRole('button', { name: '保存审视' }).click()
  await expect(page.getByText('审视记录已保存')).toBeVisible()
  await page.locator('.graph-intel-panel').getByRole('button', { name: '继续推进' }).click()
  await page.getByLabel('节点内容').fill('推进中的解决方案')
  await page.getByRole('button', { name: '保存节点' }).click()
  await expect(page.locator('.graph-node')).toHaveCount(2)
}

async function createProject(page: Page, title: string, trigger: string) {
  await page.getByRole('button', { name: '开启新项目', exact: true }).click()
  await expect(page.getByLabel('项目名称')).toBeVisible()
  // 等待表单重置副作用执行完毕，避免清空随后填入的内容（同一页面第二次打开表单时的竞态）
  await page.waitForTimeout(150)
  await page.getByLabel('项目名称').fill(title)
  await page.getByLabel('现实触发').fill(trigger)
  await page.getByRole('button', { name: '创建项目' }).click()
  await expect(page.getByRole('link', { name: new RegExp(title) })).toBeVisible()
}

// 并行 worker 各自隔离的临时目录，避免 afterAll 互删其他 worker 正在使用的分享文件
const shareDirFor = (workerIndex: number) => join(tmpdir(), `praxis-share-e2e-${workerIndex}`)

async function generateShare(page: Page, passphrase?: string) {
  await page.getByRole('button', { name: '分享' }).click()
  await expect(page.getByRole('dialog')).toContainText('生成只读分享页')
  if (passphrase) {
    await page.getByPlaceholder('设置口令').fill(passphrase)
    await page.getByPlaceholder('确认口令').fill(passphrase)
  }
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: '生成分享文件' }).click(),
  ])
  const fileName = download.suggestedFilename()
  const source = await download.path()
  expect(source).toBeTruthy()
  // download.path() 落盘为无扩展名的工件文件，chromium 对其按纯文本渲染；复制成 .html 再访问
  const shared = join(shareDirFor(test.info().workerIndex), fileName)
  await mkdir(shareDirFor(test.info().workerIndex), { recursive: true })
  await copyFile(source!, shared)
  return { fileName, fileUrl: 'file:///' + shared.replaceAll('\\', '/'), filePath: shared }
}

test('无口令分享：只读渲染、内容范围与深链', async ({ page }) => {
  await seedProject(page)
  const { fileName, fileUrl, filePath } = await generateShare(page)
  await expect(fileName).toMatch(/^praxis-share-share-snapshot-\d{8}\.html$/)

  await page.goto(fileUrl)
  await page.waitForSelector('.graph-node')
  await expect(page.locator('.graph-node')).toHaveCount(2)
  await expect(page.getByRole('heading', { name: 'Share Snapshot' })).toBeVisible()
  await expect(page.locator('.project-detail-hero')).toContainText('e2e 分享快照验证')

  // 内容范围：里程碑默认包含，复盘默认不包含
  await expect(page.getByText('首问里程碑').first()).toBeVisible()
  await expect(page.getByText('审视记录')).toHaveCount(0)

  // 变更入口全部隐藏，浏览交互保留
  for (const name of ['路线重组', '设为核心', '继续推进', '删除边', '编辑']) await expect(page.getByRole('button', { name })).toHaveCount(0)
  await expect(page.getByRole('button', { name: '搜索节点' }).first()).toBeVisible()
  await expect(page.getByRole('button', { name: '适应全图' }).first()).toBeVisible()

  // 选中节点：内容 + 附加日志（成果与感受）都在情报面板展示
  await page.locator('.graph-node').first().click()
  await expect(page.locator('.graph-intel-panel')).toContainText('分享链路的起点问题')
  await expect(page.locator('.graph-intel-panel')).toContainText('起点已完成，记录一笔成果。')

  // 深链 ?node= 选中指定节点；页内切换节点同步 URL
  const nodeIds = await page.locator('.react-flow__node').evaluateAll((nodes) => nodes.map((node) => (node as HTMLElement).dataset.id))
  await page.goto(`${fileUrl}?node=${nodeIds[1]}`)
  await expect(page.locator('.graph-node-selected')).toHaveCount(1)
  await page.locator('.graph-node').first().click()
  await expect(page).toHaveURL(new RegExp(`node=${nodeIds[0]}`))
  await rm(filePath, { force: true })
})

test('口令分享：文件名不含标题，错误口令被拒、正确口令渲染', async ({ page }) => {
  await seedProject(page)
  const { fileName, fileUrl, filePath } = await generateShare(page, 'e2e-口令')
  await expect(fileName).toMatch(/^praxis-share-\d{8}\.html$/)

  await page.goto(fileUrl)
  await expect(page.getByRole('heading', { name: '此分享已加密' })).toBeVisible()
  await expect(page.locator('.graph-node')).toHaveCount(0)

  await page.getByLabel('口令').fill('错误口令')
  await page.getByRole('button', { name: '解锁查看' }).click()
  await expect(page.getByText('口令错误，或文件已被篡改。')).toBeVisible()

  await page.getByLabel('口令').fill('e2e-口令')
  await page.getByRole('button', { name: '解锁查看' }).click()
  await expect(page.locator('.graph-node')).toHaveCount(2)
  await expect(page.getByRole('heading', { name: 'Share Snapshot' })).toBeVisible()
  await expect(page.getByRole('button', { name: '路线重组' })).toHaveCount(0)
  await rm(filePath, { force: true })
})
