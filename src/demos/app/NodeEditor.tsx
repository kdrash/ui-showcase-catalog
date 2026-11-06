import { useCallback, useState } from 'react'
import {
  Background,
  BackgroundVariant,
  Controls,
  Handle,
  MiniMap,
  Position,
  ReactFlow,
  addEdge,
  useEdgesState,
  useNodesState,
  type Connection,
  type Edge,
  type Node,
  type NodeProps,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { Bot, FileInput, FileOutput, MessageSquareText, Play, Plus, Wrench } from 'lucide-react'

type Kind = 'input' | 'prompt' | 'llm' | 'tool' | 'output'
type PData = { kind: Kind; title: string; body: string; status?: 'idle' | 'run' | 'done' }
type PNode = Node<PData, 'step'>

const KIND: Record<Kind, { icon: typeof Bot; color: string; label: string }> = {
  input: { icon: FileInput, color: '#38bdf8', label: 'INPUT' },
  prompt: { icon: MessageSquareText, color: '#a78bfa', label: 'PROMPT' },
  llm: { icon: Bot, color: '#f472b6', label: 'LLM' },
  tool: { icon: Wrench, color: '#fbbf24', label: 'TOOL' },
  output: { icon: FileOutput, color: '#34d399', label: 'OUTPUT' },
}

function StepNode({ data, selected }: NodeProps<PNode>) {
  const k = KIND[data.kind]
  const Icon = k.icon
  return (
    <div
      className="w-48 rounded-xl border bg-zinc-900/95 text-left shadow-xl shadow-black/40 backdrop-blur transition"
      style={{ borderColor: selected ? k.color : 'rgba(255,255,255,.1)', boxShadow: data.status === 'run' ? `0 0 0 3px ${k.color}55, 0 0 24px ${k.color}66` : undefined }}
    >
      {data.kind !== 'input' && <Handle type="target" position={Position.Left} style={{ background: k.color, width: 9, height: 9, border: '2px solid #18181b' }} />}
      <div className="flex items-center gap-2 border-b border-white/5 px-3 py-2">
        <span className="grid h-6 w-6 place-items-center rounded-md" style={{ background: `${k.color}22`, color: k.color }}>
          <Icon size={14} />
        </span>
        <div className="min-w-0">
          <div className="text-[9px] font-semibold tracking-widest" style={{ color: k.color }}>
            {k.label}
          </div>
          <div className="truncate text-[12px] font-medium text-zinc-100">{data.title}</div>
        </div>
        <span
          className={`ml-auto h-2 w-2 rounded-full ${data.status === 'done' ? 'bg-emerald-400' : data.status === 'run' ? 'animate-pulse bg-amber-400' : 'bg-zinc-600'}`}
        />
      </div>
      <div className="px-3 py-2 font-mono text-[10px] leading-relaxed text-zinc-400">{data.body}</div>
      {data.kind !== 'output' && <Handle type="source" position={Position.Right} style={{ background: k.color, width: 9, height: 9, border: '2px solid #18181b' }} />}
    </div>
  )
}

const nodeTypes = { step: StepNode }

const mk = (id: string, kind: Kind, x: number, y: number, title: string, body: string): PNode => ({
  id,
  type: 'step',
  position: { x, y },
  data: { kind, title, body, status: 'idle' },
})

const INITIAL_NODES: PNode[] = [
  mk('in', 'input', 0, 90, 'ユーザーの質問', '"来週の大阪の天気は？"'),
  mk('pr', 'prompt', 250, 0, 'システムプロンプト', 'あなたは旅行アシスタント…\n{{question}}'),
  mk('llm', 'llm', 500, 90, 'claude-sonnet', 'temperature: 0.3\ntools: [weather]'),
  mk('tool', 'tool', 500, 250, 'weather.get', 'city: "Osaka"\ndays: 7'),
  mk('out', 'output', 760, 120, 'チャット応答', 'markdown / stream'),
]
const edgeStyle = { stroke: '#71717a', strokeWidth: 1.5 }
const INITIAL_EDGES: Edge[] = [
  { id: 'e1', source: 'in', target: 'pr', animated: true, style: edgeStyle },
  { id: 'e2', source: 'pr', target: 'llm', animated: true, style: edgeStyle },
  { id: 'e3', source: 'tool', target: 'llm', animated: true, style: edgeStyle, label: 'result', labelStyle: { fill: '#a1a1aa', fontSize: 10 }, labelBgStyle: { fill: '#18181b' } },
  { id: 'e4', source: 'llm', target: 'out', animated: true, style: edgeStyle },
]
const ORDER = ['in', 'pr', 'tool', 'llm', 'out']

export function NodeEditor() {
  const [nodes, setNodes, onNodesChange] = useNodesState<PNode>(INITIAL_NODES)
  const [edges, setEdges, onEdgesChange] = useEdgesState(INITIAL_EDGES)
  const [running, setRunning] = useState(false)

  const onConnect = useCallback((c: Connection) => setEdges((e) => addEdge({ ...c, animated: true, style: edgeStyle }, e)), [setEdges])

  const addNode = () => {
    const kinds: Kind[] = ['tool', 'prompt', 'llm']
    const kind = kinds[nodes.length % 3]
    const id = `n${Date.now()}`
    setNodes((n) => [...n, mk(id, kind, 250 + ((n.length * 40) % 200), 230 + ((n.length * 30) % 90), kind === 'tool' ? 'web.search' : kind === 'llm' ? 'summarizer' : 'テンプレート', kind === 'tool' ? 'query: string' : '...')])
  }

  const run = async () => {
    if (running) return
    setRunning(true)
    const set = (id: string, status: PData['status']) => setNodes((ns) => ns.map((n) => (n.id === id ? { ...n, data: { ...n.data, status } } : n)))
    setNodes((ns) => ns.map((n) => ({ ...n, data: { ...n.data, status: 'idle' } })))
    for (const id of ORDER) {
      set(id, 'run')
      await new Promise((r) => setTimeout(r, 650))
      set(id, 'done')
    }
    setRunning(false)
  }

  return (
    <div className="relative h-full w-full overflow-hidden bg-zinc-950">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        colorMode="dark"
        fitView
        fitViewOptions={{ padding: 0.15 }}
        style={{ background: 'transparent' }}
      >
        <Background variant={BackgroundVariant.Dots} gap={18} size={1.2} color="#3f3f46" />
        <MiniMap pannable zoomable nodeColor={(n) => KIND[(n.data as PData).kind].color} maskColor="rgba(9,9,11,.7)" style={{ background: '#18181b', width: 140, height: 90 }} />
        <Controls showInteractive={false} />
      </ReactFlow>
      <div className="absolute top-3 left-3 flex items-center gap-2">
        <span className="rounded-lg border border-white/10 bg-zinc-900/90 px-2.5 py-1.5 text-[12px] font-semibold text-zinc-100 backdrop-blur">🧩 天気アシスタント パイプライン</span>
        <button type="button" onClick={addNode} className="flex items-center gap-1 rounded-lg border border-white/10 bg-zinc-900/90 px-2.5 py-1.5 text-[12px] text-zinc-300 hover:bg-zinc-800">
          <Plus size={13} /> ノード追加
        </button>
        <button
          type="button"
          onClick={run}
          className="flex items-center gap-1 rounded-lg bg-gradient-to-r from-pink-500 to-violet-500 px-2.5 py-1.5 text-[12px] font-semibold text-white shadow-lg shadow-pink-500/20 disabled:opacity-60"
          disabled={running}
        >
          <Play size={12} /> {running ? '実行中…' : '実行'}
        </button>
      </div>
    </div>
  )
}
