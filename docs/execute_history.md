# Scientific research design ideas

## User

我们现在的工作区是我个人任务管理系统的代码。我的每一个任务项目都由许多节点构成，这些节点形成一个有向无环图 RAG。但我发现这个系统适合一般的项目，但还不太适合科研项目。为此，我把我咨询的建议和我自己的想法写在@docs/scientific_research_design.md里了。关于这个想法，你有什么实现的建议，以及有什么设计是还需要明确的？

### Tool Read File V2

```
{"path":"project-management-system\\docs\\scientific_research_design.md"}
```

### Tool List Dir V2

```
{"path":"project-management-system","ignore":[],"toolCallId":""}
```

### Tool Read File V2

```
{"path":"project-management-system\\src\\domain\\types.ts"}
```

### Tool Read File V2

```
{"path":"project-management-system\\src\\domain\\graph.ts"}
```

### Tool Read File V2

```
{"path":"project-management-system\\docs\\original_design.md"}
```

## Assistant

看完你的设计文档和现有代码，我认为这个扩展方案很有洞察力。"教科书是树状，科研是网状"这个对比抓住了本质差异。现有系统的确适合线性学习，但科研的攻防博弈需要图的表达能力更强。

## 实现建议

### 1. 类型系统扩展策略

建议采用**共存而非替换**的策略：

```typescript
// 保留原有类型，扩展新类型
export const nodeTypes = ['question', 'solution', 'result', 'assumption', 'vulnerability'] as const;

// 新增边类型
export const edgeTypes = ['exposes', 'patches', 'inherits', 'weakens'] as const;

// 缺陷节点的特殊状态
export const vulnerabilityStatuses = ['unexplored', 'patched', 'open'] as const;

// 项目类型
export const projectTypes = ['general', 'research'] as const;
```

核心数据结构需要调整：

```typescript
interface Project {
  // ... 现有字段
  type: ProjectType  // 新增：项目类型
  focusedNodeIds: string[]  // 新增：重点关注的节点ID列表（替代单一activeNodeId）
}

interface PraxisNode {
  // ... 现有字段
  vulnerabilityStatus?: VulnerabilityStatus  // 仅当type='vulnerability'时有效
}

interface NodeConnection {
  // ... 现有字段
  edgeType?: EdgeType  // 新增：仅科研项目使用，普通项目为undefined
}
```

### 2. 图验证逻辑的分离

现在的 `validateConnectionSet` 强制DAG，需要改造：

```typescript
// graph.ts 中拆分为两个函数
export function validateDAGConnections(nodes, connections) {
  // 现有逻辑，用于普通项目
}

export function validateResearchConnections(nodes, connections) {
  // 新逻辑：允许环，但禁止自环
  // 检查边类型是否填写
  // 检查边类型的语义合理性（例如 'patches' 的目标必须是 vulnerability）
}
```

### 3. UI层的条件渲染

不建议创建完全独立的科研项目UI组件，而是在现有组件中根据 `project.type` 条件渲染：

```typescript
// TaskGraph.tsx 中
const isResearch = project.type === 'research';

// 根据项目类型选择不同的图布局算法
const layoutAlgorithm = isResearch ? 'dagre' : 'elk';

// 根据项目类型显示不同的工具栏
{isResearch ? <ResearchToolbar /> : <GeneralToolbar />}
```

### 4. 边选择和编辑的UI实现

现在连接是直接创建的，科研项目需要弹窗选择边类型：

```typescript
// 连接创建时
onConnect={(params) => {
  if (project.type === 'research') {
    openEdgeTypeDialog(params);  // 弹窗选择边类型
  } else {
    createConnection(params);  // 直接创建
  }
}}

// 边的右键菜单或选中面板
<EdgeContextMenu>
  <MenuItem onClick={handleChangeEdgeType}>修改边类型</MenuItem>
  <MenuItem onClick={handleDeleteEdge}>删除边</MenuItem>
</EdgeContextMenu>
```

### 5. 重点关注的高亮逻辑

替代现有的 `resolveCurrentRoute`：

```typescript
export function resolveFocusedSubgraph(
  nodes: PraxisNode[], 
  connections: NodeConnection[], 
  focusedNodeIds: string[]
) {
  const focusedSet = new Set(focusedNodeIds);
  const highlightedConnections = connections.filter(conn => 
    focusedSet.has(conn.sourceNodeId) || focusedSet.has(conn.targetNodeId)
  );
  
  return {
    nodeIds: focusedNodeIds,
    connectionIds: highlightedConnections.map(c => c.id)
  };
}
```

---

## 需要明确的设计问题

### 1. 边类型的语义约束

你定义了四种边类型，但它们的起点和终点是否有类型限制？例如：

- **暴露边**：是否只能从 `solution` 指向 `vulnerability`？还是 `assumption` 也能暴露 `vulnerability`？
- **填补边**：是否只能从 `solution` 指向 `vulnerability`？
- **继承边**：是否只能在两个 `solution` 之间？
- **弱化边**：是否只能从 `solution` 指向 `assumption`？

**建议**：明确定义一个边类型约束表，否则用户可能创建语义不合理的边（比如 `question` 填补 `vulnerability`）。

### 2. 缺陷节点的状态转换

缺陷节点有三种状态（待探索、已被填、待攻克），转换逻辑是：

- 创建时默认"待探索"
- 用户找到填补论文后手动改为"已被填"？还是系统检测到有"填补边"指向它就自动变为"已被填"？
- "待攻克"是用户手动标记？还是系统检测"搜索后无人填补"的某种标记？

**建议**：我倾向于半自动化：
- 当有"填补边"指向某 `vulnerability` 时，系统提示"是否标记为已被填"，但不强制
- "待攻克"由用户手动标记，因为"是否真的无人填补"需要人工判断

### 3. 项目类型的迁移

你说"项目类别在项目初创时确定，后续不允许更改"。但用户可能先创建了普通项目，后来发现需要科研模式。完全禁止转换会很僵硬。

**两个方案：**
- **A. 允许单向转换**：普通→科研可以（升级图能力），但科研→普通不行（因为可能已经有环）
- **B. 提供"复制为科研项目"功能**：保留原项目，创建科研副本，节点和边都复制过去，用户可以在副本中改造

你倾向哪个？

### 4. 里程碑在科研项目中的定位

普通项目中，里程碑是路线上的关键节点。科研项目不再有"当前路线"的概念，那里程碑是：

- **方案A**：仍然沿用，但语义变为"重要节点标记"（不再与路线绑定）
- **方案B**：科研项目的里程碑专门用于标记"重大突破"，比如"找到一个待攻克的缺陷"

现有的里程碑验证逻辑（method, criteria, result）在科研项目中仍然适用吗？还是科研项目的里程碑更像是"标记+注释"？

### 5. 统计面板的调整

现有系统会统计"路线进度"（已完成节点/总节点）。科研项目没有单一路线，统计逻辑需要重新设计：

- **全图统计**：所有节点的状态分布
- **缺陷统计**：待探索/已被填/待攻克的数量，特别是"待攻克"作为优先级指标
- **边类型统计**：暴露/填补/继承/弱化的数量，反映论文阅读的深度

你希望科研项目的"进度"如何衡量？是看"待攻克缺陷数"（越多越好，代表创新点）？还是看"已完成节点比例"？

### 6. 批量操作的需求

科研项目的图可能会很大（一篇论文可能产生十几个节点）。是否需要：

- **节点分组/折叠**：把同一篇论文的节点折叠成一个超级节点
- **批量导入**：从 Zotero 或 LLM 总结中快速创建节点
- **子图筛选**：只显示某个类型的节点（比如只看 vulnerability）

这些功能是否在MVP范围内？

---

## 我的总体评估

你的设计在理论上是**自洽且优雅**的。现有系统的技术栈（React Flow + TypeScript）完全可以支撑这个扩展，改动量在可控范围内。

最大的挑战不是技术实现，而是**交互设计**：科研项目的图会比普通项目复杂得多，如何在保持可读性的同时提供足够的编辑灵活性？我建议：

1. **分阶段实现**：先做核心的"任意有向图 + 边类型"，UI暂时简陋一点没关系，先验证工作流是否顺畅
2. **尽早实战**：用它管理一篇真实论文的阅读，看看哪些设计是理论上美好、实践中别扭的
3. **保持普通项目的简洁**：不要为了科研项目的复杂性而让普通项目变得臃肿

需要我先从哪个模块开始动手吗？还是你想先确定上面几个设计问题？

## User

让我确定一下上面的设计问题。关于第一和第二，因为这个系统是给我自己用的，就不用搞太复杂的设计了。因此，无需边类型的语义约束，允许任意类型的边连接任意类型的节点；也无需对缺陷节点的状态转换做限制，就像现在已有的问题、方案、结果节点状态那样由使用者自己调整。第三，项目类型迁移时提供"复制为科研项目"功能吧，但这个功能后面再增加，不在现在 MVP 阶段实现。第四，采用方案 B：科研项目的里程碑专门用于标记"重大突破"，比如"找到一个待攻克的缺陷"，验证逻辑也完全沿用。第五，这提醒我了已被填充的缺陷节点应该分为自己填补的和他人填补的，因此将缺陷节点的状态调整为四类：待探索、已被填、待攻克、已攻克（@docs/scientific_research_design.md也相应更改了）。故进度衡量为"待攻克缺陷数"比"已攻克缺陷数"吧。第六，暂且不考虑批量操作。如若“定位目标”按钮的节点搜索功能也太复杂，则也可以暂不加以实现。

接下来你可以进行计划和实现了。如果在实现前或实现中仍存在一些设计问题需要我澄清，请停下来询问我。

### Tool Read File V2

```
{"path":"project-management-system\\docs\\scientific_research_design.md"}
```

### Tool Todo Write

### Tool Read File V2

```
{"path":"project-management-system\\src\\features\\projects\\ProjectForm.tsx"}
```

### Tool Read File V2

```
{"path":"project-management-system\\src\\features\\nodes\\TaskGraph.tsx"}
```

## Assistant

好的，我开始实现。先从类型系统扩展开始，然后逐步修改相关组件。

### Tool Edit File V2

### Tool Edit File V2

### Tool Edit File V2

### Tool Edit File V2

### Tool Edit File V2

### Tool Edit File V2

### Tool Edit File V2

### Tool Edit File V2

### Tool Read File V2

```
{"path":"project-management-system\\src\\domain\\rules.ts"}
```

### Tool Edit File V2

### Tool Edit File V2

### Tool Todo Write

### Tool Edit File V2

### Tool Read File V2

```
{"path":"project-management-system\\src\\domain\\graph.ts","offset":30,"limit":40}
```

### Tool Read File V2

```
{"path":"project-management-system\\src\\domain\\graph.ts"}
```

## Assistant

看到问题了，我替换时留下了旧代码的残余。让我修复这个文件：

### Tool Edit File V2

### Tool Edit File V2

### Tool Edit File V2

### Tool Todo Write

### Tool Todo Write

### Tool Read File V2

```
{"path":"project-management-system\\src\\repositories\\repository.ts","limit":100}
```

## Assistant

看到 repository 中需要更新创建项目和验证的逻辑。让我继续修改：

### Tool Edit File V2

### Tool Edit File V2

### Tool Read File V2

```
{"path":"project-management-system\\src\\repositories\\repository.ts","limit":15}
```

### Tool Edit File V2

### Tool Ripgrep Raw Search

```
{"pattern":"function validateProjects","path":"project-management-system\\src\\repositories\\repository.ts","outputMode":"files_with_matches","caseInsensitive":false,"multiline":false,"toolCallId":""}
```

### Tool Read File V2

```
{"path":"project-management-system\\src\\repositories\\repository.ts","offset":10,"limit":5}
```

### Tool Edit File V2

## Assistant

让我读取更精确的内容：

### Tool Run Terminal Command V2

## Assistant

让我直接用Read工具读取更多行来看完整格式：

### Tool Read File V2

```
{"path":"project-management-system\\src\\repositories\\repository.ts","offset":10,"limit":20}
```

## Assistant

现在看到格式了。这个文件使用了极简的单行格式。让我修改：

### Tool Edit File V2

## Assistant

让我用Write工具重新写入整个文件，因为格式匹配有问题。先读取完整文件：

### Tool Read File V2

```
{"path":"project-management-system\\src\\repositories\\repository.ts"}
```

### Tool Edit File V2

## Assistant

看起来格式问题仍然存在。让我使用分块写入的方式处理这个大文件。先写入前半部分：

### Tool Edit File V2

### Tool Edit File V2

### Tool Read File V2

```
{"path":"project-management-system\\src\\repositories\\repository.ts","offset":30,"limit":5}
```

### Tool Edit File V2

## Assistant

内容太大了。让我分步替换。先处理 createConnection 方法：

### Tool Read File V2

```
{"path":"project-management-system\\src\\repositories\\repository.ts","offset":45,"limit":10}
```

## Assistant

文件被截断了，我需要完整写入。让我分多次添加内容：

### Tool Edit File V2

## Assistant

让我检查文件当前状态：

### Tool Read File V2

```
{"path":"project-management-system\\src\\repositories\\repository.ts"}
```

## Assistant

文件被截断了。让我删除并重新创建完整文件。先备份原文件内容，从git获取：

### Tool Run Terminal Command V2

## Assistant

让我用分号替代：

### Tool Run Terminal Command V2

### Tool Read File V2

```
{"path":"project-management-system\\src\\repositories\\repository.ts.backup"}
```

## Assistant

好的，现在我看到原始文件了。我会基于这个文件进行修改。由于文件很大，我将分段修改关键部分。先修改imports和validateProjects函数：

### Tool Edit File V2

### Tool Edit File V2

## Assistant

原文件有乱码。让我直接修改主文件并重新写入完整的repository.ts。我会先读取项目结构来了解所需的其他部分：

### Tool Glob File Search

```
{"targetDirectory":"project-management-system\\src\\repositories","globPattern":"*.ts"}
```

## Assistant

让我停下来询问一个设计问题。我发现实现过程中遇到了一些技术细节需要确认：

## 需要确认的设计问题

### 1. 项目创建时的默认字段

对于科研项目，我准备在创建时设置：
- `activeNodeId` 为 `undefined`（因为科研项目没有单一活动节点）
- `focusedNodeIds` 为空数组 `[]`（用户后续可以添加重点关注的节点）

对于普通项目，保持现有逻辑：
- `activeNodeId` 为 `null`（创建节点后会设置）
- `focusedNodeIds` 为 `undefined`（不使用该字段）

这样设计是否合适？还是科研项目也应该有 `activeNodeId` 但只是不强制使用？

### 2. 科研项目的"继续推进"模式

现有的 `saveNode` 方法有三种模式：
- `independent`：独立节点
- `advance`：从当前目标继续推进（会自动更新activeNodeId）
- `branch`：从指定前驱分支

对于科研项目，`advance` 模式的语义不太适用（因为没有"当前目标"）。我有两个方案：

**方案A**：科研项目禁用 `advance` 模式，只允许 `independent` 和 `branch`

**方案B**：科研项目的 `advance` 模式改为"从重点关注节点之一继续推进"，但不自动更新 `focusedNodeIds`

你倾向哪个？我个人倾向方案A，因为更简洁。

### 3. 数据库schema兼容性

由于我们修改了 `Project` 类型（增加了 `type`、`focusedNodeIds` 字段），需要考虑向后兼容：

- 旧数据导入时，没有 `type` 字段的项目会被视为 `'general'` 类型
- `NodeConnection` 的 `edgeType` 字段是可选的，旧连接会是 `undefined`

这意味着用户升级后，旧项目仍然按普通项目运行，不会出现错误。这样处理可以吗？

请确认这些设计，我会继续完成实现。

## User

好的，我来回答。第一，这样设计很合适。第二，方案 A 很好。第三，可以这样处理。

另外，我注意到你有很多编辑失败，浪费了很多 token。后续可能需要确定是否能修改，再准备好要写入的代码。

## Assistant

好的，明白了。我会更谨慎地处理文件修改。让我重新开始，这次先准备好完整的代码再一次性写入。

首先让我检查现有的文件结构，确保我理解所有需要修改的地方：

### Tool Glob File Search

```
{"targetDirectory":"project-management-system\\src\\domain","globPattern":"**/*.ts"}
```

### Tool Read File V2

```
{"path":"project-management-system\\src\\domain\\types.ts"}
```

## Assistant

好的，我看到types.ts已经更新了。现在让我读取graph.ts看看它的结构：

### Tool Read File V2

```
{"path":"project-management-system\\src\\domain\\graph.ts"}
```

## Assistant

好的，我看到 graph.ts 也已经更新了（包含了 `validateResearchConnectionSet` 和 `resolveFocusedSubgraph`）。现在让我准备完整的 repository.ts 文件。我会基于备份文件进行修改，一次性写入：

### Tool Run Terminal Command V2

### Tool Read File V2

```
{"path":"project-management-system\\src\\repositories\\repository.ts"}
```

## Assistant

好的，现在我看到了原始文件。让我创建一个修改计划，然后逐步修改关键位置。我会先创建TODO来跟踪进度：

### Tool Todo Write

## Assistant

现在开始修改。首先更新导入语句：

### Tool Edit File V2

### Tool Edit File V2

## Assistant

让我检查文件的确切内容，看看是否有空格或格式差异：

### Tool Read File V2

```
{"path":"project-management-system\\src\\repositories\\repository.ts","offset":10,"limit":5}
```

### Tool Edit File V2

## Assistant

让我读取更大范围来找到准确的行：

### Tool Read File V2

```
{"path":"project-management-system\\src\\repositories\\repository.ts","offset":1,"limit":20}
```

## Assistant

好的，导入已经更新了。现在更新 validateProjects 函数。我看到它是在第11-13行：

### Tool Edit File V2

## Assistant

可能有隐藏字符。让我用grep查看确切内容：

### Tool Run Terminal Command V2

## Assistant

让我使用 sed 查看这几行的十六进制内容：

### Tool Run Terminal Command V2

## Assistant

让我用另一个方法，读取整个函数并用更大的上下文进行替换：

### Tool Edit File V2

## Assistant

让我读取更完整的文件来确认格式：

### Tool Read File V2

```
{"path":"project-management-system\\src\\repositories\\repository.ts","offset":8,"limit":10}
```

## Assistant

好的，现在看到完整内容了。让我替换这个函数：

### Tool Edit File V2

## Assistant

这个奇怪的问题可能是因为文件中有不可见字符。让我直接读取整个文件，然后一次性重写它：

### Tool Read File V2

```
{"path":"project-management-system\\src\\repositories\\repository.ts"}
```

## Assistant

好的，我看到整个文件了。这是一个被压缩的代码文件（所有代码都在一行）。我现在理解问题了。让我准备完整的修改后的文件，然后一次性写入。由于文件很大，我会分块处理。先写入前半部分：

### Tool Edit File V2

## Assistant

Error: Connection failed. If the problem persists, please check your internet connection or VPN

---

## 2024-01-XX Linux 环境下继续开发

### User

我们现在的工作区是我个人任务管理系统的代码。为了将这个项目改得更适合科研活动，你之前进行了一部分工作，在@docs/execute_history.md 中有记录（当时的设计则在 @original_design.md 中）。此前的工作是在 windows 系统下进行的，经常出现编辑失败等问题，因此我已经将你此前编辑过的代码库通过 github 直接同步到现在的 linux 环境下。这可能存在潜在的编码问题，需要你注意一下。你现在可以根据此前工作历史继续改进此项目了。

### Assistant

检查了项目现状，发现之前的工作已经在 Windows 环境下部分完成了类型定义，包括：
- 在 types.ts 中添加了新的节点类型（assumption, vulnerability）
- 添加了边类型（exposes, patches, inherits, weakens）
- 添加了缺陷状态（unexplored, patched, open, conquered）
- 添加了项目类型（general, research）
- 在 graph.ts 中添加了 validateResearchConnectionSet 和 resolveFocusedSubgraph 函数
- 在 rules.ts 中添加了相关标签和辅助函数

现在需要完成的是将这些类型系统整合到实际的业务逻辑中。

### 实现内容

#### 1. 修改 repository.ts

**validateProjects 函数**：根据项目类型选择不同的验证逻辑
- 普通项目使用 validateConnectionSet（强制 DAG）
- 科研项目使用 validateResearchConnectionSet（允许环，但禁止自环）

**createProject 函数**：根据项目类型初始化不同字段
- 普通项目：activeNodeId = null, focusedNodeIds = undefined
- 科研项目：activeNodeId = undefined, focusedNodeIds = []

**saveNode 函数**：科研项目禁用 advance 模式
- 检测到科研项目使用 advance 模式时抛出错误
- 只在普通项目中自动更新 activeNodeId

**createConnection 函数**：支持边类型参数
- 添加 edgeType 可选参数
- 根据项目类型调用不同的验证函数

**importData 函数**：向后兼容旧数据
- 从 v1/v2 导入时自动设置 type = 'general'
- 自动添加 focusedNodeIds = undefined

#### 2. 修改 NodeForm.tsx

添加对科研项目节点类型的支持：
- 接收 projectType 参数
- 当项目类型为 research 时显示 assumption 和 vulnerability 选项
- 当节点类型为 vulnerability 时显示缺陷状态选择器
- 使用 watch 监听节点类型变化，动态显示/隐藏缺陷状态字段

#### 3. 修改 ProjectDetailPage.tsx

将项目类型传递给 NodeForm：
- 在调用 NodeForm 时添加 projectType={project.type} 参数

#### 4. 修改 database.ts

添加数据库版本 5 以支持新字段：
- 定义 storesV5，包含 projects.type 和 nodes.type 索引
- 在 upgrade 函数中为旧项目自动添加 type='general' 和 focusedNodeIds=undefined

#### 5. 修改测试文件

更新 repository.test.ts：
- 在 base 函数中添加 type: 'general' 参数

### 测试结果

- TypeScript 类型检查：✅ 通过
- 单元测试：✅ 全部通过（31 个测试）
  - persistence/retention.test.ts: 3 tests
  - domain/rules.test.ts: 4 tests
  - domain/graph-visibility.test.ts: 5 tests
  - features/nodes/graphVisualState.test.ts: 4 tests
  - domain/graph.test.ts: 7 tests
  - repositories/repository.test.ts: 8 tests

### 未完成的工作（后续需要实现）

1. **UI 层面的科研项目支持**：
   - TaskGraph 组件根据项目类型调整行为（禁用路线追踪、显示重点关注节点）
   - 添加边类型选择对话框（创建连接时）
   - 添加边类型编辑功能（右键菜单或选中面板）
   - ProjectDetailPage 中显示科研项目的统计（待攻克/已攻克缺陷数）

2. **重点关注节点管理**：
   - 添加设置/取消重点关注的 UI
   - 实现 resolveFocusedSubgraph 的可视化高亮

3. **项目类型转换**：
   - "复制为科研项目"功能（在后续 MVP 之后）

4. **节点搜索**：
   - "定位目标"按钮的节点搜索功能（如果需要）

### 技术说明

由于 repository.ts 是压缩格式（单行代码），使用 StrReplace 进行了精确的字符串替换，避免了格式问题。

所有修改都遵循了向后兼容的原则，旧数据可以无缝升级到新版本。

---

## 继续实现 UI 增强功能

### 实现内容

#### 1. 边类型管理功能

**创建 EdgeTypeDialog.tsx**：
- 提供友好的边类型选择界面
- 支持四种边类型：暴露、填补、继承、弱化
- 可以选择"无特定类型"用于一般依赖关系
- 每种边类型都有清晰的说明文字

**修改 repository.ts**：
- 添加 `updateConnection` 方法用于更新边类型
- 支持在事务中更新边类型并同步项目更新时间

**修改 ProjectDetailPage.tsx**：
- 添加 `pendingConnection` 和 `editingConnection` 状态
- 修改 `connectNodes` 函数：科研项目创建连接时打开边类型对话框，普通项目直接创建
- 添加 `confirmEdgeType` 函数：统一处理边类型的创建和更新
- 集成 EdgeTypeDialog 组件

#### 2. 科研项目统计面板

**修改 ProjectDetailPage.tsx**：
- 添加 `researchProgress` 计算，调用 `calculateResearchProgress` 函数
- 根据项目类型显示不同的进度面板：
  - **普通项目**：显示当前路线进度条（保持原样）
  - **科研项目**：显示缺陷研究进度
    - 待攻克缺陷数（琥珀色卡片）
    - 已攻克缺陷数（绿色卡片）
    - 全图节点完成情况

### 测试结果

- TypeScript 类型检查：✅ 通过
- 单元测试：✅ 全部通过（31 个测试）

### 功能状态总结

#### ✅ 已完成的核心功能

1. **类型系统**：
   - ✅ 项目类型（普通/科研）
   - ✅ 科研节点类型（假设/缺陷）
   - ✅ 缺陷状态（待探索/已被填/待攻克/已攻克）
   - ✅ 边类型（暴露/填补/继承/弱化）

2. **数据层**：
   - ✅ 根据项目类型验证图结构（DAG vs 任意有向图）
   - ✅ 科研项目禁用"继续推进"模式
   - ✅ 边类型的创建和更新
   - ✅ 数据库 schema 迁移和向后兼容

3. **UI 组件**：
   - ✅ 项目创建时选择类型
   - ✅ 节点表单支持科研节点类型
   - ✅ 缺陷节点状态选择器
   - ✅ 边类型选择对话框
   - ✅ 科研项目统计面板

#### ⏳ 待完成的增强功能（可选）

1. **边类型可视化**：
   - 在图中显示边的类型标签
   - 不同边类型使用不同颜色或样式

2. **边类型编辑入口**：
   - 右键点击边显示上下文菜单
   - 提供"编辑边类型"选项

3. **TaskGraph 行为优化**：
   - 科研项目隐藏"设为当前目标"等路线追踪按钮
   - 显示更适合科研项目的操作提示

4. **重点关注节点**：
   - 添加"设为重点关注"按钮
   - 高亮显示重点关注的节点和相关边

这些功能都是锦上添花，当前实现已经可以支持科研项目的完整工作流程了。

---

## 实现边类型可视化

### 实现内容

#### 1. 修改 RouteMapEdge.tsx
- 添加 `RouteMapEdgeData` 接口，包含 `edgeType` 和 `projectType` 字段
- 使用 `EdgeLabelRenderer` 在边的中点显示类型标签
- 仅在科研项目且边有类型时显示标签
- 标签样式：半透明背景、毛玻璃效果、主题色边框

#### 2. 修改 TaskGraph.tsx
- 在 `Props` 接口添加 `projectType` 参数
- 修改 `graphEdges` 创建逻辑，为每条边添加 `data` 字段
- 将边类型和项目类型传递给 RouteMapEdge 组件

#### 3. 修改 ProjectDetailPage.tsx
- 在调用 `TaskGraph` 时传递 `projectType={project.type}`

### 效果
- 科研项目中，有类型的边会在中点显示类型标签（暴露、填补、继承、弱化）
- 普通项目不显示标签，保持简洁
- 标签样式与主题一致，不会遮挡重要信息

### 测试结果
- ✅ TypeScript 类型检查通过
- ✅ 所有 31 个单元测试通过