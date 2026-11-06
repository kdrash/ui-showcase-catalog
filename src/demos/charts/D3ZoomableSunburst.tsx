import { useEffect, useRef, useState } from 'react'
import * as d3 from 'd3'
import { ChevronRight } from 'lucide-react'

type Datum = { name: string; value?: number; children?: Datum[] }
type Arc = { x0: number; x1: number; y0: number; y1: number }
type HN = d3.HierarchyRectangularNode<Datum> & { current?: Arc; target?: Arc }

const DATA: Datum = {
  name: '年間予算',
  children: [
    {
      name: '開発',
      children: [
        { name: 'Web', children: [{ name: '人件費', value: 4200 }, { name: 'ツール', value: 380 }, { name: '外注', value: 900 }] },
        { name: 'モバイル', children: [{ name: '人件費', value: 3100 }, { name: '端末', value: 260 }] },
        { name: 'AI', children: [{ name: 'GPU', value: 1800 }, { name: '人件費', value: 2400 }, { name: 'API', value: 650 }] },
      ],
    },
    {
      name: 'マーケ',
      children: [
        { name: '広告', children: [{ name: '検索', value: 1500 }, { name: 'SNS', value: 1200 }, { name: '動画', value: 700 }] },
        { name: 'イベント', value: 900 },
        { name: 'コンテンツ', value: 600 },
      ],
    },
    {
      name: '営業',
      children: [
        { name: '人件費', value: 2600 },
        { name: '出張', value: 480 },
        { name: 'CRM', value: 320 },
      ],
    },
    {
      name: 'コーポレート',
      children: [
        { name: 'オフィス', value: 1400 },
        { name: '採用', value: 800 },
        { name: '法務・会計', value: 500 },
      ],
    },
    { name: 'インフラ', children: [{ name: 'クラウド', value: 1700 }, { name: 'SaaS', value: 520 }, { name: '監視', value: 180 }] },
  ],
}
const PALETTE = ['#60a5fa', '#f472b6', '#fbbf24', '#34d399', '#a78bfa']
const fmt = (v: number) => `${(v / 100).toFixed(1)}億円`

/** d3.partition + arc による、クリックでズームできるサンバースト図 */
export function D3ZoomableSunburst() {
  const svgRef = useRef<SVGSVGElement>(null)
  const [path, setPath] = useState<string[]>(['年間予算'])
  const [center, setCenter] = useState<{ name: string; value: number; pct: string }>({ name: '年間予算', value: 0, pct: '100%' })
  const zoomTo = useRef<(name: string[]) => void>(() => {})

  useEffect(() => {
    const svgEl = svgRef.current!
    const hierarchy = d3
      .hierarchy(DATA)
      .sum((d) => d.value ?? 0)
      .sort((a, b) => (b.value ?? 0) - (a.value ?? 0))
    const root = d3.partition<Datum>().size([2 * Math.PI, hierarchy.height + 1])(hierarchy) as HN
    root.each((d) => ((d as HN).current = { x0: d.x0, x1: d.x1, y0: d.y0, y1: d.y1 }))
    const total = root.value ?? 1
    setCenter({ name: root.data.name, value: total, pct: '100%' })

    const color = (d: HN) => {
      let n: HN = d
      while (n.depth > 1) n = n.parent as HN
      const base = d3.color(PALETTE[root.children!.indexOf(n) % PALETTE.length])!
      return base.brighter(Math.max(0, d.depth - 1) * 0.35).formatHex()
    }

    const svg = d3.select(svgEl)
    svg.selectAll('*').remove()
    const g = svg.append('g')
    let radius = 100
    const arc = d3
      .arc<Arc>()
      .startAngle((d) => d.x0)
      .endAngle((d) => d.x1)
      .padAngle((d) => Math.min((d.x1 - d.x0) / 2, 0.006))
      .padRadius(() => radius * 1.5)
      .innerRadius((d) => d.y0 * radius)
      .outerRadius((d) => Math.max(d.y0 * radius, d.y1 * radius - 1.5))
      .cornerRadius(3)

    const visible = (d: Arc) => d.y1 <= 3 && d.y0 >= 1 && d.x1 > d.x0
    const labelVisible = (d: Arc) => visible(d) && (d.y1 - d.y0) * (d.x1 - d.x0) > 0.06
    const labelTransform = (d: Arc) => {
      const x = (((d.x0 + d.x1) / 2) * 180) / Math.PI
      const y = ((d.y0 + d.y1) / 2) * radius
      return `rotate(${x - 90}) translate(${y},0) rotate(${x < 180 ? 0 : 180})`
    }

    const nodes = root.descendants().slice(1) as HN[]
    const paths = g
      .append('g')
      .selectAll('path')
      .data(nodes)
      .join('path')
      .attr('fill', (d) => color(d))
      .attr('fill-opacity', (d) => (visible(d.current!) ? (d.children ? 0.9 : 0.7) : 0))
      .attr('pointer-events', (d) => (visible(d.current!) ? 'auto' : 'none'))
      .style('cursor', (d) => (d.children ? 'pointer' : 'default'))
    paths
      .on('mouseenter', function (_, d) {
        d3.select(this).attr('fill-opacity', 1)
        setCenter({ name: d.data.name, value: d.value ?? 0, pct: `${(((d.value ?? 0) / total) * 100).toFixed(1)}%` })
      })
      .on('mouseleave', function (_, d) {
        d3.select(this).attr('fill-opacity', visible(d.current!) ? (d.children ? 0.9 : 0.7) : 0)
        setCenter({ name: focus.data.name, value: focus.value ?? 0, pct: `${(((focus.value ?? 0) / total) * 100).toFixed(1)}%` })
      })
      .on('click', (_, d) => d.children && clicked(d))

    const labels = g
      .append('g')
      .attr('pointer-events', 'none')
      .attr('text-anchor', 'middle')
      .style('user-select', 'none')
      .selectAll('text')
      .data(nodes)
      .join('text')
      .attr('dy', '0.35em')
      .attr('font-size', 10.5)
      .attr('fill', '#0f172a')
      .attr('font-weight', 600)
      .attr('fill-opacity', (d) => +labelVisible(d.current!))
      .text((d) => d.data.name)

    const hole = g
      .append('circle')
      .attr('fill', 'transparent')
      .style('cursor', 'pointer')
      .on('click', () => focus.parent && clicked(focus.parent as HN))

    let focus: HN = root
    function clicked(p: HN) {
      focus = p
      const anc = p.ancestors().reverse().map((a) => a.data.name)
      setPath(anc)
      setCenter({ name: p.data.name, value: p.value ?? 0, pct: `${(((p.value ?? 0) / total) * 100).toFixed(1)}%` })
      root.each((d) => {
        const n = d as HN
        n.target = {
          x0: Math.max(0, Math.min(1, (d.x0 - p.x0) / (p.x1 - p.x0))) * 2 * Math.PI,
          x1: Math.max(0, Math.min(1, (d.x1 - p.x0) / (p.x1 - p.x0))) * 2 * Math.PI,
          y0: Math.max(0, d.y0 - p.depth),
          y1: Math.max(0, d.y1 - p.depth),
        }
      })
      const t = svg.transition().duration(750)
      paths
        .transition(t as never)
        .tween('data', (d) => {
          const i = d3.interpolate(d.current!, d.target!)
          return (tt) => (d.current = i(tt))
        })
        .filter(function (d) {
          return !!+(this as SVGPathElement).getAttribute('fill-opacity')! || visible(d.target!)
        })
        .attr('fill-opacity', (d) => (visible(d.target!) ? (d.children ? 0.9 : 0.7) : 0))
        .attr('pointer-events', (d) => (visible(d.target!) ? 'auto' : 'none'))
        .attrTween('d', (d) => () => arc(d.current!) ?? '')
      labels
        .filter(function (d) {
          return !!+(this as SVGTextElement).getAttribute('fill-opacity')! || labelVisible(d.target!)
        })
        .transition(t as never)
        .attr('fill-opacity', (d) => +labelVisible(d.target!))
        .attrTween('transform', (d) => () => labelTransform(d.current!))
    }
    zoomTo.current = (names) => {
      let n: HN = root
      for (const nm of names.slice(1)) n = (n.children?.find((c) => c.data.name === nm) as HN) ?? n
      clicked(n)
    }

    const layout = () => {
      const w = svgEl.clientWidth
      const h = svgEl.clientHeight
      radius = Math.min(w, h) / 6.4
      svg.attr('viewBox', `${-w / 2} ${-h / 2 + 8} ${w} ${h}`)
      paths.attr('d', (d) => arc(d.current!) ?? '')
      labels.attr('transform', (d) => labelTransform(d.current!))
      hole.attr('r', radius)
    }
    const ro = new ResizeObserver(layout)
    ro.observe(svgEl)
    return () => ro.disconnect()
  }, [])

  return (
    <div className="relative h-full w-full overflow-hidden bg-slate-950 text-slate-100">
      <div className="absolute top-3 left-3 z-10 flex flex-wrap items-center gap-0.5 text-[11px]">
        {path.map((p, i) => (
          <span key={i} className="inline-flex items-center gap-0.5">
            {i > 0 && <ChevronRight size={11} className="text-slate-600" />}
            <button
              type="button"
              disabled={i === path.length - 1}
              onClick={() => zoomTo.current(path.slice(0, i + 1))}
              className="rounded px-1.5 py-0.5 text-slate-400 hover:bg-white/10 hover:text-white disabled:font-semibold disabled:text-white"
            >
              {p}
            </button>
          </span>
        ))}
      </div>
      <svg ref={svgRef} className="h-full w-full" />
      <div className="pointer-events-none absolute inset-0 grid place-items-center pt-4">
        <div className="text-center">
          <div className="text-[11px] text-slate-400">{center.name}</div>
          <div className="text-lg font-bold tabular-nums">{fmt(center.value)}</div>
          <div className="text-[10px] text-slate-500">全体の {center.pct}</div>
        </div>
      </div>
      <div className="pointer-events-none absolute right-3 bottom-2 text-[10px] text-slate-500">クリックで拡大 · 中央で戻る</div>
    </div>
  )
}
