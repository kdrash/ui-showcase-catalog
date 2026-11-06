import { useEffect, useMemo, useRef, useState } from 'react'
import { sankey, sankeyJustify, sankeyLinkHorizontal, type SankeyLink, type SankeyNode } from 'd3-sankey'

type NodeX = { name: string; color: string }
type LinkX = { source: number; target: number; value: number }
type SN = SankeyNode<NodeX, LinkX>
type SL = SankeyLink<NodeX, LinkX>

// 月の家計のお金の流れ(万円)
const NODES: NodeX[] = [
  { name: '給与', color: '#60a5fa' },
  { name: '副業', color: '#a78bfa' },
  { name: '手取り', color: '#818cf8' },
  { name: '税・社会保険', color: '#94a3b8' },
  { name: '固定費', color: '#f472b6' },
  { name: '変動費', color: '#fb923c' },
  { name: '貯蓄・投資', color: '#34d399' },
  { name: '家賃', color: '#f9a8d4' },
  { name: '通信・サブスク', color: '#fbcfe8' },
  { name: '食費', color: '#fdba74' },
  { name: '趣味・交際', color: '#fed7aa' },
  { name: 'NISA', color: '#6ee7b7' },
  { name: '預金', color: '#a7f3d0' },
]
const LINKS: LinkX[] = [
  { source: 0, target: 2, value: 33 },
  { source: 0, target: 3, value: 10 },
  { source: 1, target: 2, value: 7 },
  { source: 2, target: 4, value: 12 },
  { source: 2, target: 5, value: 14 },
  { source: 2, target: 6, value: 14 },
  { source: 4, target: 7, value: 9.5 },
  { source: 4, target: 8, value: 2.5 },
  { source: 5, target: 9, value: 7 },
  { source: 5, target: 10, value: 7 },
  { source: 6, target: 11, value: 8 },
  { source: 6, target: 12, value: 6 },
]

/** d3-sankey で家計の流れを描くサンキー図。ノード/リンクにホバーで関連部分をハイライト */
export function SankeyDiagram() {
  const box = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState({ w: 560, h: 340 })
  const [hl, setHl] = useState<{ node?: number; link?: number } | null>(null)

  useEffect(() => {
    const ro = new ResizeObserver(([e]) => setSize({ w: e.contentRect.width, h: e.contentRect.height }))
    ro.observe(box.current!)
    return () => ro.disconnect()
  }, [])

  const graph = useMemo(() => {
    const layout = sankey<NodeX, LinkX>()
      .nodeWidth(10)
      .nodePadding(Math.max(6, size.h / 34))
      .nodeAlign(sankeyJustify)
      .extent([
        [8, 8],
        [Math.max(100, size.w - 118), Math.max(100, size.h - 8)],
      ])
    return layout({ nodes: NODES.map((n) => ({ ...n })), links: LINKS.map((l) => ({ ...l })) })
  }, [size])

  const idx = (n: SN | number | string) => (typeof n === 'object' ? (n.index ?? -1) : Number(n))
  const linkActive = (l: SL, i: number) =>
    !hl || hl.link === i || (hl.node !== undefined && (idx(l.source as SN) === hl.node || idx(l.target as SN) === hl.node))
  const nodeActive = (n: SN) => {
    if (!hl) return true
    if (hl.link !== undefined) {
      const l = graph.links[hl.link]
      return l.source === n || l.target === n
    }
    return (
      hl.node === n.index ||
      graph.links.some((l) => (idx(l.source as SN) === hl.node && l.target === n) || (idx(l.target as SN) === hl.node && l.source === n))
    )
  }
  const path = sankeyLinkHorizontal<NodeX, LinkX>()
  const total = 50

  return (
    <div className="relative flex h-full w-full flex-col overflow-hidden bg-[#0c0a14] p-3 text-slate-200">
      <div className="mb-1 flex items-baseline justify-between">
        <div className="text-sm font-semibold">今月のお金の流れ</div>
        <div className="text-[11px] text-slate-500">
          収入 <b className="text-slate-200">{total}万円</b> · 貯蓄率 <b className="text-emerald-300">28%</b>
        </div>
      </div>
      <div ref={box} className="relative min-h-0 flex-1">
        <svg width={size.w} height={size.h} className="block" onMouseLeave={() => setHl(null)}>
          <defs>
            {graph.links.map((l, i) => (
              <linearGradient
                key={i}
                id={`sk-${i}`}
                gradientUnits="userSpaceOnUse"
                x1={(l.source as SN).x1}
                x2={(l.target as SN).x0}
              >
                <stop offset="0" stopColor={(l.source as SN).color} />
                <stop offset="1" stopColor={(l.target as SN).color} />
              </linearGradient>
            ))}
          </defs>
          <g fill="none">
            {graph.links.map((l, i) => (
              <path
                key={i}
                d={path(l) ?? ''}
                stroke={`url(#sk-${i})`}
                strokeWidth={Math.max(1, l.width ?? 1)}
                strokeOpacity={linkActive(l, i) ? (hl ? 0.75 : 0.42) : 0.07}
                style={{ transition: 'stroke-opacity .2s', cursor: 'pointer' }}
                onMouseEnter={() => setHl({ link: i })}
              >
                <title>{`${(l.source as SN).name} → ${(l.target as SN).name}: ${l.value}万円`}</title>
              </path>
            ))}
          </g>
          {graph.nodes.map((n) => {
            const act = nodeActive(n)
            return (
              <g key={n.name} onMouseEnter={() => setHl({ node: n.index })} style={{ cursor: 'pointer', opacity: act ? 1 : 0.3, transition: 'opacity .2s' }}>
                <rect x={n.x0} y={n.y0} width={(n.x1 ?? 0) - (n.x0 ?? 0)} height={Math.max(2, (n.y1 ?? 0) - (n.y0 ?? 0))} rx={2} fill={n.color} />
                <text
                  x={(n.x1 ?? 0) + 6}
                  y={((n.y0 ?? 0) + (n.y1 ?? 0)) / 2}
                  dy="0.35em"
                  fontSize={10.5}
                  fill="#e2e8f0"
                  paintOrder="stroke"
                  stroke="#0c0a14"
                  strokeWidth={3}
                >
                  {n.name}
                  <tspan fill="#94a3b8" dx={4}>
                    {n.value}万
                  </tspan>
                </text>
              </g>
            )
          })}
        </svg>
        {hl?.link !== undefined && (
          <div className="pointer-events-none absolute top-1 right-1 rounded-md border border-white/10 bg-slate-900/90 px-2 py-1 text-[11px]">
            {(graph.links[hl.link].source as SN).name} → {(graph.links[hl.link].target as SN).name}:{' '}
            <b>{graph.links[hl.link].value}万円</b>
          </div>
        )}
      </div>
    </div>
  )
}
