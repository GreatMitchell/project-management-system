# 践途（Praxis Path）

一个以项目为锚点、以验证为驱动的本地优先个人任务管理系统。它围绕“现实触发 → 问题 → 方案 → 结果 → 验证 → 修正”组织实践，而不是围绕日期堆积待办事项。

## 功能

- 项目创建、编辑、筛选、搜索、状态流转与删除
- 问题、方案、结果节点的管理、排序和双轨日志
- 里程碑验证方式、通过标准、结果和感受
- 里程碑或项目结束后的结构化审视
- IndexedDB 本地持久化
- JSON 备份导出、合并导入和覆盖恢复
- 响应式桌面优先界面

## 本地运行

需要 Node.js 20 或更高版本。

```bash
npm install
npm run dev
```

浏览器访问终端输出的本地地址。数据仅保存在该地址对应的浏览器 IndexedDB 中。

## 质量检查

```bash
npm run lint
npm run test
npm run build
npx playwright install chromium
npm run test:e2e
```

## 数据安全

请从“数据设置”定期导出 JSON 备份。清理站点数据、使用隐私窗口、更换浏览器或更换部署域名，都会导致原 IndexedDB 数据不可见。
