import { useRef, useState } from 'react'
import getStroke from 'perfect-freehand'
import rough from 'roughjs'
import { ArrowUpRight, Circle, Pencil, Redo2, Square, Trash2, Undo2 } from 'lucide-react'

type Tool = 'pen' | 'rect' | 'ellipse' | 'arrow'
type Item = { id: number; paths: { d: string; stroke: string; strokeWidth: number; fill?: string }[] }
type Pt = [number, number, number]

const gen = rough.generator()
const COLORS = ['#1f2937', '#e11d48', '#2563eb', '#16a34a', '#f59e0b']

/** perfect-freehand の点列 → 塗りつぶしアウトラインの SVG path */
function strokePath(points: Pt[], size: number) {
  const o = getStroke(points, { size, thinning: 0.6, smoothing: 0.5, streamline: 0.5, simulatePressure: true })
  if (!o.length) return ''
  const d = o.reduce<(string | number)[]>(
    (acc, [x0, y0], i, arr) => {
      const [x1, y1] = arr[(i + 1) % arr.length]
      acc.push(x0.toFixed(1), y0.toFixed(1), ((x0 + x1) / 2).toFixed(1), ((y0 + y1) / 2).toFixed(1))
      return acc
    },
    ['M', ...o[0].map((v) => v.toFixed(1)), 'Q'],
  )
  return d.join(' ') + ' Z'
}

function roughShape(tool: Tool, a: [number, number], b: [number, number], color: string, size: number, seed: number) {
  const opt = { stroke: color, strokeWidth: Math.max(1.5, size / 4), roughness: 1.6, bowing: 1.2, seed, fill: tool !== 'arrow' ? `${color}22` : undefined, fillStyle: 'hachure', hachureGap: 7 }
  const [x0, y0] = a
  const [x1, y1] = b
  if (tool === 'rect') return gen.toPaths(gen.rectangle(Math.min(x0, x1), Math.min(y0, y1), Math.abs(x1 - x0), Math.abs(y1 - y0), opt))
  if (tool === 'ellipse') return gen.toPaths(gen.ellipse((x0 + x1) / 2, (y0 + y1) / 2, Math.abs(x1 - x0), Math.abs(y1 - y0), opt))
  const ang = Math.atan2(y1 - y0, x1 - x0)
  const hl = 14 + size
  const head = (d: number) => [x1 - hl * Math.cos(ang + d), y1 - hl * Math.sin(ang + d)] as [number, number]
  return [
    ...gen.toPaths(gen.line(x0, y0, x1, y1, opt)),
    ...gen.toPaths(gen.linearPath([head(0.45), [x1, y1], head(-0.45)], opt)),
  ]
}

let nid = 0
const pen = (pts: [number, number][], color: string, size = 6): Item => ({
  id: nid++,
  paths: [{ d: strokePath(pts.map(([x, y]) => [x, y, 0.5]), size), stroke: 'none', strokeWidth: 0, fill: color }],
})
const shape = (tool: Tool, a: [number, number], b: [number, number], color: string): Item => ({ id: nid++, paths: roughShape(tool, a, b, color, 6, nid * 13 + 1) })
const wave = (x: number, y: number, w: number) => Array.from({ length: 30 }, (_, i) => [x + (i / 29) * w, y + Math.sin(i / 3) * 6] as [number, number])

const initial = (): Item[] => [
  shape('rect', [40, 40], [190, 120], '#2563eb'),
  shape('ellipse', [270, 50], [400, 130], '#e11d48'),
  shape('arrow', [195, 82], [262, 88], '#1f2937'),
  pen(wave(60, 100, 110), '#2563eb', 5),
  pen([[300, 92], [320, 104], [345, 80], [370, 100]], '#e11d48', 6),
]

/** perfect-freehand(手書き線) + Rough.js(手描き風図形)のホワイトボード */
export function SketchWhiteboard() {
  const [items, setItems] = useState<Item[]>(initial)
  const [redo, setRedo] = useState<Item[]>([])
  const [tool, setTool] = useState<Tool>('pen')
  const [color, setColor] = useState(COLORS[0])
  const [size, setSize] = useState(8)
  const [draft, setDraft] = useState<Item | null>(null)
  const drag = useRef<{ start: [number, number]; pts: Pt[]; last: number } | null>(null)
  const svgRef = useRef<SVGSVGElement>(null)

  const pos = (e: React.PointerEvent): [number, number] => {
    const r = svgRef.current!.getBoundingClientRect()
    return [e.clientX - r.left, e.clientY - r.top]
  }
  const build = (end: [number, number]): Item | null => {
    const d = drag.current
    if (!d) return null
    if (tool === 'pen') return { id: -1, paths: [{ d: strokePath(d.pts, size), stroke: 'none', strokeWidth: 0, fill: color }] }
    return { id: -1, paths: roughShape(tool, d.start, end, color, size, d.last) }
  }

  const onDown = (e: React.PointerEvent) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    const p = pos(e)
    drag.current = { start: p, pts: [[p[0], p[1], e.pressure || 0.5]], last: Math.floor(Math.random() * 1e6) }
    setDraft(build(p))
  }
  const onMove = (e: React.PointerEvent) => {
    if (!drag.current) return
    const p = pos(e)
    drag.current.pts.push([p[0], p[1], e.pressure || 0.5])
    setDraft(build(p))
  }
  const onUp = (e: React.PointerEvent) => {
    if (!drag.current) return
    const it = build(pos(e))
    const moved = drag.current.pts.length > 1 || tool === 'pen'
    drag.current = null
    setDraft(null)
    if (it && moved) {
      setItems((s) => [...s, { ...it, id: nid++ }])
      setRedo([])
    }
  }
  const undo = () => {
    if (!items.length) return
    setRedo((r) => [...r, items[items.length - 1]])
    setItems((s) => s.slice(0, -1))
  }
  const redoIt = () => {
    if (!redo.length) return
    setItems((s) => [...s, redo[redo.length - 1]])
    setRedo((r) => r.slice(0, -1))
  }

  const tools: { id: Tool; icon: typeof Pencil; label: string }[] = [
    { id: 'pen', icon: Pencil, label: 'ペン' },
    { id: 'rect', icon: Square, label: '四角' },
    { id: 'ellipse', icon: Circle, label: '楕円' },
    { id: 'arrow', icon: ArrowUpRight, label: '矢印' },
  ]
  const ib = 'grid h-8 w-8 place-items-center rounded-lg transition'
  return (
    <div
      tabIndex={0}
      onKeyDown={(e) => {
        if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') {
          e.preventDefault()
          if (e.shiftKey) redoIt()
          else undo()
        }
      }}
      className="relative h-full w-full overflow-hidden bg-[#fdfbf6] bg-[radial-gradient(#d6d3cb_1.2px,transparent_1.2px)] [background-size:20px_20px] outline-none"
    >
      <svg
        ref={svgRef}
        className="absolute inset-0 h-full w-full touch-none"
        style={{ cursor: tool === 'pen' ? 'crosshair' : 'cell' }}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
      >
        {[...items, ...(draft ? [draft] : [])].map((it) => (
          <g key={it.id}>
            {it.paths.map((p, i) => (
              <path key={i} d={p.d} stroke={p.stroke} strokeWidth={p.strokeWidth} fill={p.fill ?? 'none'} strokeLinecap="round" />
            ))}
          </g>
        ))}
      </svg>
      <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-1 rounded-2xl border-2 border-zinc-800 bg-white px-2 py-1 shadow-[3px_3px_0_#27272a]">
        {tools.map((t) => (
          <button key={t.id} type="button" title={t.label} onClick={() => setTool(t.id)} className={`${ib} ${tool === t.id ? 'bg-amber-200 text-zinc-900' : 'text-zinc-500 hover:bg-zinc-100'}`}>
            <t.icon size={16} />
          </button>
        ))}
        <span className="mx-1 h-5 w-px bg-zinc-300" />
        {COLORS.map((c) => (
          <button key={c} type="button" onClick={() => setColor(c)} className={`h-5 w-5 rounded-full border-2 ${color === c ? 'border-zinc-800 scale-110' : 'border-transparent'}`} style={{ background: c }} />
        ))}
        <input type="range" min={3} max={20} value={size} onChange={(e) => setSize(+e.target.value)} title="太さ" className="mx-1 w-14 accent-zinc-800" />
        <span className="mx-1 h-5 w-px bg-zinc-300" />
        <button type="button" title="元に戻す" onClick={undo} disabled={!items.length} className={`${ib} text-zinc-600 hover:bg-zinc-100 disabled:opacity-30`}>
          <Undo2 size={16} />
        </button>
        <button type="button" title="やり直し" onClick={redoIt} disabled={!redo.length} className={`${ib} text-zinc-600 hover:bg-zinc-100 disabled:opacity-30`}>
          <Redo2 size={16} />
        </button>
        <button type="button" title="全消去" onClick={() => (setRedo([...items].reverse()), setItems([]))} className={`${ib} text-zinc-600 hover:bg-red-50 hover:text-red-600`}>
          <Trash2 size={16} />
        </button>
      </div>
    </div>
  )
}
