import dagre from '@dagrejs/dagre'
import { Background, Controls, Handle, MarkerType, MiniMap, Position, ReactFlow, useEdgesState, useNodesState, type Connection, type Edge, type Node, type NodeProps } from '@xyflow/react'
import { CircleHelp, Edit3, Flag, GitBranch, Lightbulb, Plus, Target, Trash2 } from 'lucide-react'
import { useCallback, useEffect, useMemo } from 'react'
import type { Milestone, NodeConnection, PraxisNode } from '../../domain/types'
import { statusLabels, statusStyles } from '../../domain/rules'

const nodeWidth = 270
const nodeHeight = 150

interface GraphNodeData extends Record<string, unknown> {
  node: PraxisNode
  milestone?: Milestone
  selected: boolean
  onSelect: (node: PraxisNode) => void
  onContinue: (node: PraxisNode) => void
}

type GraphNode = Node<GraphNodeData, 'praxis'>

const meta = {
  question: { label: '问题', icon: CircleHelp, tone: 'text-sky-400' },
  solution: { label: '方案', icon: Lightbulb, tone: 'text-amber-400' },
  result: { label: '结果', icon: Target, tone: 'text-emerald-400' },
}

function PraxisGraphNode({ data }: NodeProps<GraphNode>) {
  const item = data.node
  const Meta = meta[item.type]
  return <article className={`graph-node ${data.selected ? 'graph-node-selected' : ''}`} onClick={() => data.onSelect(item)}>
    <Handle type="target" position={Position.Left} className="graph-handle" />
    <div className="flex items-center justify-between gap-2"><span className={`inline-flex items-center gap-2 text-xs font-semibold ${Meta.tone}`}><Meta.icon size={15} />{Meta.label}</span><span className={`status-badge !px-2 !py-0.5 !text-[10px] ${statusStyles[item.status]}`}>{statusLabels[item.status]}</span></div>
    <p className="graph-node-content mt-3 text-sm leading-6 text-text-primary">{item.content}</p>
    <div className="mt-3 flex items-center justify-between border-t border-line/15 pt-3">
      <span className="inline-flex items-center gap-1 text-[10px] text-text-secondary">{data.milestone ? <><Flag size={11} />里程碑</> : `#${item.position + 1}`}</span>
      <button className="nodrag inline-flex items-center gap-1 text-xs font-medium text-accent-primary" onClick={(event) => { event.stopPropagation(); data.onContinue(item) }}><Plus size={13} />继续推进</button>
    </div>
    <Handle type="source" position={Position.Right} className="graph-handle" />
  </article>
}

function layoutGraph(nodes: GraphNode[], edges: Edge[]) {
  const graph = new dagre.graphlib.Graph().setDefaultEdgeLabel(() => ({}))
  graph.setGraph({ rankdir: 'LR', ranksep: 100, nodesep: 55, marginx: 45, marginy: 45 })
  nodes.forEach((node) => graph.setNode(node.id, { width: nodeWidth, height: nodeHeight }))
  edges.forEach((edge) => graph.setEdge(edge.source, edge.target))
  dagre.layout(graph)
  return nodes.map((node) => { const position = graph.node(node.id); return { ...node, position: { x: position.x - nodeWidth / 2, y: position.y - nodeHeight / 2 } } })
}

interface Props {
  projectId: string
  nodes: PraxisNode[]
  connections: NodeConnection[]
  milestones: Milestone[]
  selectedNodeId: string | null
  onSelectNode: (node: PraxisNode) => void
  onContinue: (node: PraxisNode) => void
  onEdit: (node: PraxisNode) => void
  onDelete: (node: PraxisNode) => void
  onMilestone: (node: PraxisNode) => void
  onConnect: (sourceId: string, targetId: string) => Promise<void>
  onDisconnect: (connectionId: string) => Promise<void>
}

export function TaskGraph({ projectId, nodes: domainNodes, connections, milestones, selectedNodeId, onSelectNode, onContinue, onEdit, onDelete, onMilestone, onConnect, onDisconnect }: Props) {
  const graphEdges = useMemo<Edge[]>(() => connections.map((connection) => ({ id: connection.id, source: connection.sourceNodeId, target: connection.targetNodeId, markerEnd: { type: MarkerType.ArrowClosed }, className: 'graph-edge' })), [connections])
  const graphNodes = useMemo<GraphNode[]>(() => layoutGraph(domainNodes.map((node) => ({ id: node.id, type: 'praxis', position: { x: 0, y: 0 }, data: { node, milestone: milestones.find((item) => item.nodeId === node.id), selected: node.id === selectedNodeId, onSelect: onSelectNode, onContinue } })), graphEdges), [domainNodes, graphEdges, milestones, onContinue, onSelectNode, selectedNodeId])
  const [flowNodes, setFlowNodes, onNodesChange] = useNodesState<GraphNode>(graphNodes)
  const [flowEdges, setFlowEdges, onEdgesChange] = useEdgesState(graphEdges)
  useEffect(() => setFlowNodes(graphNodes), [graphNodes, setFlowNodes])
  useEffect(() => setFlowEdges(graphEdges), [graphEdges, setFlowEdges])
  const connect = useCallback(async (connection: Connection) => { if (connection.source && connection.target) await onConnect(connection.source, connection.target) }, [onConnect])
  const selected = domainNodes.find((node) => node.id === selectedNodeId)

  return <div className="mt-6 grid gap-4 xl:grid-cols-[minmax(0,1fr)_300px]">
    <div className="task-graph" aria-label="项目路线图">
      <ReactFlow nodes={flowNodes} edges={flowEdges} nodeTypes={{ praxis: PraxisGraphNode }} onNodesChange={onNodesChange} onEdgesChange={onEdgesChange} onConnect={(value) => void connect(value)} onNodeClick={(_, node) => onSelectNode(node.data.node)} onEdgeDoubleClick={(_, edge) => { if (window.confirm('断开这两个节点之间的连接？节点本身不会被删除。')) void onDisconnect(edge.id) }} fitView fitViewOptions={{ padding: 0.22 }} minZoom={0.3} maxZoom={1.8} deleteKeyCode={null}>
        <Background color="rgb(var(--border-soft))" gap={24} size={1} />
        <MiniMap pannable zoomable nodeColor="rgb(var(--accent-primary))" maskColor="rgb(var(--bg-overlay) / 0.45)" />
        <Controls showInteractive={false} />
      </ReactFlow>
    </div>
    <aside className="surface-card h-fit p-5">
      {selected ? <><p className="eyebrow">已选节点</p><h3 className="mt-2 font-serif text-xl text-text-primary">{meta[selected.type].label}节点</h3><p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-text-secondary">{selected.content}</p><div className="mt-5 grid gap-2"><button className="button-primary justify-center" onClick={() => onContinue(selected)}><GitBranch size={15} />创建后继 / 支线</button><button className="button-secondary justify-center" onClick={() => onMilestone(selected)}><Flag size={15} />{milestones.some((item) => item.nodeId === selected.id) ? '查看里程碑' : '设为里程碑'}</button><div className="grid grid-cols-2 gap-2"><button className="button-secondary justify-center" onClick={() => onEdit(selected)}><Edit3 size={15} />编辑</button><button className="button-secondary justify-center" onClick={() => onDelete(selected)}><Trash2 size={15} />删除</button></div></div><p className="mt-4 text-[11px] leading-5 text-text-secondary">拖动节点右侧连接点到另一个节点可以建立汇合；双击连线可断开。</p></> : <div className="py-8 text-center"><GitBranch className="mx-auto text-accent-primary" /><h3 className="mt-3 font-serif text-lg text-text-primary">选择一个节点</h3><p className="mt-2 text-xs leading-5 text-text-secondary">查看详情、发展后继，或拖动连接点建立分支与汇合。</p></div>}
      <span className="sr-only">项目 {projectId}</span>
    </aside>
  </div>
}
