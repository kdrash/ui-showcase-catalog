import { useEffect, useRef, useState } from 'react'
import { Ellipse, Layer, Rect, Stage, Star, Text, Transformer } from 'react-konva'
import type Konva from 'konva'
import { ArrowDownToLine, ArrowUpToLine, Circle as CircleIcon, Download, Square, Star as StarIcon, Trash2, Type } from 'lucide-react'

type Kind = 'rect' | 'ellipse' | 'star' | 'text'
type Shape = { id: string; kind: Kind; x: number; y: number; rotation: number; scaleX: number; scaleY: number; fill: string; text?: string }

const BW = 480
const BH = 300
const COLORS = ['#ff5a5f', '#ffb400', '#00a699', '#5b5bd6', '#111827', '#f472b6']
let uid = 0
const mk = (kind: Kind, fill: string, extra: Partial<Shape> = {}): Shape => ({
  id: `s${uid++}`,
  kind,
  x: BW / 2 + (Math.random() - 0.5) * 160,
  y: BH / 2 + (Math.random() - 0.5) * 80,
  rotation: 0,
  scaleX: 1,
  scaleY: 1,
  fill,
  ...(kind === 'text' ? { text: 'Hello Konva' } : {}),
  ...extra,
})

/** react-konva の Transformer で図形を変形できる簡易デザインエディタ */
export function KonvaDesignEditor() {
  const hostRef = useRef<HTMLDivElement>(null)
  const stageRef = useRef<Konva.Stage>(null)
  const trRef = useRef<Konva.Transformer>(null)
  const nodes = useRef(new Map<string, Konva.Node>())
  const [size, setSize] = useState({ w: 560, h: 340 })
  const [shapes, setShapes] = useState<Shape[]>(() => [
    mk('rect', '#5b5bd6', { x: 150, y: 140, rotation: -8 }),
    mk('ellipse', '#ffb400', { x: 330, y: 110 }),
    mk('star', '#ff5a5f', { x: 360, y: 210, rotation: 12 }),
    mk('text', '#111827', { x: 200, y: 245, text: 'Design ✦ Konva' }),
  ])
  const [sel, setSel] = useState<string | null>(null)
  const selected = shapes.find((s) => s.id === sel) ?? null

  useEffect(() => {
    const el = hostRef.current!
    const ro = new ResizeObserver(() => setSize({ w: el.clientWidth, h: el.clientHeight }))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  useEffect(() => {
    const tr = trRef.current
    if (!tr) return
    const n = sel ? nodes.current.get(sel) : undefined
    tr.nodes(n ? [n] : [])
    tr.getLayer()?.batchDraw()
  }, [sel, shapes])

  const scale = Math.min((size.w - 32) / BW, (size.h - 24) / BH)
  const ox = (size.w - BW * scale) / 2
  const oy = (size.h - BH * scale) / 2

  const update = (id: string, patch: Partial<Shape>) => setShapes((ss) => ss.map((s) => (s.id === id ? { ...s, ...patch } : s)))
  const add = (k: Kind) => {
    const s = mk(k, k === 'text' ? '#111827' : COLORS[uid % 4])
    setShapes((ss) => [...ss, s])
    setSel(s.id)
  }
  const move = (dir: 1 | -1) =>
    setShapes((ss) => {
      const i = ss.findIndex((s) => s.id === sel)
      const j = i + dir
      if (i < 0 || j < 0 || j >= ss.length) return ss
      const n = [...ss]
      ;[n[i], n[j]] = [n[j], n[i]]
      return n
    })
  const remove = () => {
    setShapes((ss) => ss.filter((s) => s.id !== sel))
    setSel(null)
  }
  const exportPng = () => {
    const st = stageRef.current
    if (!st) return
    trRef.current?.hide()
    const url = st.toDataURL({ x: ox, y: oy, width: BW * scale, height: BH * scale, pixelRatio: 2 / scale })
    trRef.current?.show()
    const a = document.createElement('a')
    a.href = url
    a.download = 'konva-design.png'
    a.click()
  }

  const common = (s: Shape) => ({
    ref: (n: Konva.Node | null) => {
      if (n) nodes.current.set(s.id, n)
      else nodes.current.delete(s.id)
    },
    x: s.x,
    y: s.y,
    rotation: s.rotation,
    scaleX: s.scaleX,
    scaleY: s.scaleY,
    fill: s.fill,
    draggable: true,
    onMouseDown: () => setSel(s.id),
    onTap: () => setSel(s.id),
    onDragEnd: (e: Konva.KonvaEventObject<DragEvent>) => update(s.id, { x: e.target.x(), y: e.target.y() }),
    onTransformEnd: (e: Konva.KonvaEventObject<Event>) => {
      const n = e.target
      update(s.id, { x: n.x(), y: n.y(), rotation: n.rotation(), scaleX: n.scaleX(), scaleY: n.scaleY() })
    },
    shadowColor: 'rgba(0,0,0,.25)',
    shadowBlur: 10,
    shadowOffsetY: 4,
  })

  const btn = 'grid h-8 w-8 place-items-center rounded-lg text-zinc-600 transition hover:bg-zinc-100 hover:text-zinc-900 disabled:opacity-30'
  return (
    <div
      tabIndex={0}
      onKeyDown={(e) => {
        if ((e.key === 'Delete' || e.key === 'Backspace') && sel && !(e.target instanceof HTMLInputElement)) remove()
      }}
      className="relative flex h-full w-full flex-col overflow-hidden bg-zinc-100 outline-none"
    >
      <div className="z-10 flex flex-wrap items-center gap-1 border-b border-zinc-200 bg-white px-2 py-1.5 shadow-sm">
        <button type="button" title="四角形" className={btn} onClick={() => add('rect')}><Square size={16} /></button>
        <button type="button" title="楕円" className={btn} onClick={() => add('ellipse')}><CircleIcon size={16} /></button>
        <button type="button" title="星" className={btn} onClick={() => add('star')}><StarIcon size={16} /></button>
        <button type="button" title="テキスト" className={btn} onClick={() => add('text')}><Type size={16} /></button>
        <span className="mx-1 h-5 w-px bg-zinc-200" />
        {COLORS.map((c) => (
          <button
            key={c}
            type="button"
            disabled={!selected}
            onClick={() => selected && update(selected.id, { fill: c })}
            className={`h-5 w-5 rounded-full ring-offset-1 transition disabled:opacity-30 ${selected?.fill === c ? 'ring-2 ring-zinc-900' : ''}`}
            style={{ background: c }}
          />
        ))}
        <input type="color" disabled={!selected} value={selected?.fill ?? '#000000'} onChange={(e) => selected && update(selected.id, { fill: e.target.value })} className="h-6 w-6 cursor-pointer rounded border-0 bg-transparent p-0 disabled:opacity-30" />
        {selected?.kind === 'text' && (
          <input value={selected.text} onChange={(e) => update(selected.id, { text: e.target.value })} className="ml-1 h-7 w-28 rounded-md border border-zinc-200 px-2 text-xs" />
        )}
        <div className="ml-auto flex items-center gap-0.5">
          <button type="button" title="前面へ" disabled={!selected} className={btn} onClick={() => move(1)}><ArrowUpToLine size={15} /></button>
          <button type="button" title="背面へ" disabled={!selected} className={btn} onClick={() => move(-1)}><ArrowDownToLine size={15} /></button>
          <button type="button" title="削除" disabled={!selected} className={btn} onClick={remove}><Trash2 size={15} /></button>
          <button type="button" onClick={exportPng} className="ml-1 flex h-8 items-center gap-1 rounded-lg bg-zinc-900 px-2.5 text-xs font-medium text-white hover:bg-zinc-700">
            <Download size={13} /> PNG
          </button>
        </div>
      </div>
      <div ref={hostRef} className="relative flex-1 bg-[radial-gradient(#d4d4d8_1px,transparent_1px)] [background-size:16px_16px]">
        <Stage
          ref={stageRef}
          width={size.w}
          height={size.h}
          onMouseDown={(e) => e.target === e.target.getStage() && setSel(null)}
          className="absolute inset-0"
        >
          <Layer x={ox} y={oy} scaleX={scale} scaleY={scale}>
            <Rect width={BW} height={BH} fill="#fffdf8" cornerRadius={6} shadowColor="rgba(0,0,0,.15)" shadowBlur={24} shadowOffsetY={8} onMouseDown={() => setSel(null)} />
            {shapes.map((s) =>
              s.kind === 'rect' ? (
                <Rect key={s.id} {...common(s)} width={130} height={90} offsetX={65} offsetY={45} cornerRadius={14} />
              ) : s.kind === 'ellipse' ? (
                <Ellipse key={s.id} {...common(s)} radiusX={56} radiusY={56} />
              ) : s.kind === 'star' ? (
                <Star key={s.id} {...common(s)} numPoints={5} innerRadius={24} outerRadius={56} />
              ) : (
                <Text key={s.id} {...common(s)} text={s.text} fontSize={34} fontStyle="bold" fontFamily="Space Grotesk, Inter, sans-serif" offsetX={160} offsetY={17} width={320} align="center" shadowBlur={0} />
              ),
            )}
            <Transformer ref={trRef} rotateAnchorOffset={24} anchorSize={9} anchorCornerRadius={3} borderStroke="#5b5bd6" anchorStroke="#5b5bd6" padding={4} />
          </Layer>
        </Stage>
        <div className="pointer-events-none absolute bottom-2 left-3 text-[10px] text-zinc-400">クリックで選択 ・ ハンドルで拡大/回転 ・ Deleteで削除</div>
      </div>
    </div>
  )
}
