import { useEffect, useRef } from 'react'
import * as d3 from 'd3'

type N = d3.SimulationNodeDatum & { id: string; group: number; size: number }
type L = d3.SimulationLinkDatum<N> & { w: number }

const GROUPS = ['フロントエンド', 'バックエンド', 'インフラ', 'データ/AI']
const COLORS = ['#38bdf8', '#a78bfa', '#34d399', '#fb7185']
const RAW: [string, number, string[]][] = [
  ['React', 0, ['TypeScript', 'Next.js', 'Vite', 'Tailwind', 'Motion']],
  ['TypeScript', 0, ['Node.js', 'Vite', 'Zod']],
  ['Next.js', 0, ['Vercel', 'Node.js']],
  ['Vite', 0, []],
  ['Tailwind', 0, []],
  ['Motion', 0, []],
  ['Three.js', 0, ['React']],
  ['Node.js', 1, ['PostgreSQL', 'Redis', 'GraphQL', 'Docker']],
  ['Go', 1, ['gRPC', 'PostgreSQL', 'Kubernetes']],
  ['GraphQL', 1, ['React']],
  ['gRPC', 1, []],
  ['Zod', 1, []],
  ['PostgreSQL', 1, ['Docker']],
  ['Redis', 1, []],
  ['Docker', 2, ['Kubernetes']],
  ['Kubernetes', 2, ['AWS', 'Terraform']],
  ['AWS', 2, ['Terraform']],
  ['Terraform', 2, []],
  ['Vercel', 2, []],
  ['Python', 3, ['PyTorch', 'pandas', 'FastAPI']],
  ['PyTorch', 3, ['CUDA']],
  ['pandas', 3, ['DuckDB']],
  ['FastAPI', 3, ['PostgreSQL', 'Docker']],
  ['CUDA', 3, []],
  ['DuckDB', 3, []],
  ['LLM', 3, ['Python', 'Node.js', 'FastAPI']],
]

/** D3 の forceSimulation による技術スタックの関係図(ドラッグ・ズーム・近傍ハイライト) */
export function D3ForceGraph() {
  const ref = useRef<SVGSVGElement>(null)
  const tip = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const svgEl = ref.current!
    const nodes: N[] = RAW.map(([id, group]) => ({ id, group, size: 5 }))
    const links: L[] = RAW.flatMap(([id, , out]) => out.map((t) => ({ source: id, target: t, w: 1 })))
    const deg = new Map<string, number>()
    links.forEach((l) => {
      deg.set(l.source as string, (deg.get(l.source as string) ?? 0) + 1)
      deg.set(l.target as string, (deg.get(l.target as string) ?? 0) + 1)
    })
    nodes.forEach((n) => (n.size = 5 + Math.sqrt(deg.get(n.id) ?? 1) * 3.2))
    const neighbors = new Set(links.map((l) => `${l.source}|${l.target}`))
    const isNb = (a: N, b: N) => a === b || neighbors.has(`${a.id}|${b.id}`) || neighbors.has(`${b.id}|${a.id}`)

    const svg = d3.select(svgEl)
    svg.selectAll('*').remove()
    const root = svg.append('g')
    const link = root
      .append('g')
      .attr('stroke', '#94a3b8')
      .selectAll('line')
      .data(links)
      .join('line')
      .attr('stroke-opacity', 0.25)
      .attr('stroke-width', 1.2)
    const node = root
      .append('g')
      .selectAll<SVGGElement, N>('g')
      .data(nodes)
      .join('g')
      .style('cursor', 'grab')
    node
      .append('circle')
      .attr('r', (d) => d.size + 5)
      .attr('fill', (d) => COLORS[d.group])
      .attr('opacity', 0.15)
    node
      .append('circle')
      .attr('r', (d) => d.size)
      .attr('fill', (d) => COLORS[d.group])
      .attr('stroke', '#0b1020')
      .attr('stroke-width', 1.5)
    node
      .append('text')
      .text((d) => d.id)
      .attr('x', (d) => d.size + 4)
      .attr('y', 3.5)
      .attr('font-size', 10.5)
      .attr('font-family', 'Inter, sans-serif')
      .attr('fill', '#cbd5e1')
      .attr('paint-order', 'stroke')
      .attr('stroke', '#0b1020')
      .attr('stroke-width', 3)
      .style('pointer-events', 'none')

    const sim = d3
      .forceSimulation(nodes)
      .force('link', d3.forceLink<N, L>(links).id((d) => d.id).distance(48).strength(0.6))
      .force('charge', d3.forceManyBody().strength(-170))
      .force('collide', d3.forceCollide<N>().radius((d) => d.size + 6))
      .force('x', d3.forceX().strength(0.05))
      .force('y', d3.forceY().strength(0.07))
      .on('tick', () => {
        link
          .attr('x1', (d) => (d.source as N).x!)
          .attr('y1', (d) => (d.source as N).y!)
          .attr('x2', (d) => (d.target as N).x!)
          .attr('y2', (d) => (d.target as N).y!)
        node.attr('transform', (d) => `translate(${d.x},${d.y})`)
      })

    node.call(
      d3
        .drag<SVGGElement, N>()
        .on('start', (e, d) => {
          if (!e.active) sim.alphaTarget(0.3).restart()
          d.fx = d.x
          d.fy = d.y
        })
        .on('drag', (e, d) => {
          d.fx = e.x
          d.fy = e.y
        })
        .on('end', (e, d) => {
          if (!e.active) sim.alphaTarget(0)
          d.fx = null
          d.fy = null
        }),
    )

    node
      .on('mouseenter', (e: MouseEvent, d) => {
        node.transition().duration(150).style('opacity', (o) => (isNb(d, o) ? 1 : 0.15))
        link
          .transition()
          .duration(150)
          .attr('stroke-opacity', (l) => ((l.source as N) === d || (l.target as N) === d ? 0.9 : 0.05))
          .attr('stroke', (l) => ((l.source as N) === d || (l.target as N) === d ? COLORS[d.group] : '#94a3b8'))
        const t = tip.current!
        const box = svgEl.getBoundingClientRect()
        t.style.opacity = '1'
        t.style.transform = `translate(${e.clientX - box.left + 12}px, ${e.clientY - box.top + 12}px)`
        t.innerHTML = `<b>${d.id}</b><br><span style="color:${COLORS[d.group]}">● ${GROUPS[d.group]}</span> · 接続 ${deg.get(d.id) ?? 0}`
      })
      .on('mouseleave', () => {
        node.transition().duration(200).style('opacity', 1)
        link.transition().duration(200).attr('stroke-opacity', 0.25).attr('stroke', '#94a3b8')
        tip.current!.style.opacity = '0'
      })

    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.4, 4])
      .on('zoom', (e) => root.attr('transform', e.transform.toString()))
    svg.call(zoom)

    const ro = new ResizeObserver(() => {
      const w = svgEl.clientWidth
      const h = svgEl.clientHeight
      svg.attr('viewBox', `${-w / 2} ${-h / 2} ${w} ${h}`)
      const k = Math.min(1.6, Math.max(0.6, Math.min(w / 620, h / 380)))
      svg.call(zoom.transform, d3.zoomIdentity.scale(k))
    })
    ro.observe(svgEl)
    return () => {
      sim.stop()
      ro.disconnect()
    }
  }, [])

  return (
    <div className="relative h-full w-full overflow-hidden bg-[#0b1020]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,rgba(56,189,248,.08),transparent_60%)]" />
      <svg ref={ref} className="relative h-full w-full" />
      <div
        ref={tip}
        className="pointer-events-none absolute top-0 left-0 rounded-lg border border-white/10 bg-slate-900/90 px-2.5 py-1.5 text-[11px] leading-relaxed text-slate-200 opacity-0 shadow-xl backdrop-blur transition-opacity"
      />
      <div className="pointer-events-none absolute top-3 left-3 flex flex-wrap gap-x-3 gap-y-1 text-[10.5px] text-slate-400">
        {GROUPS.map((g, i) => (
          <span key={g} className="inline-flex items-center gap-1">
            <span className="h-2 w-2 rounded-full" style={{ background: COLORS[i] }} />
            {g}
          </span>
        ))}
      </div>
      <div className="pointer-events-none absolute right-3 bottom-2 text-[10px] text-slate-500">ドラッグで移動 · ホイールでズーム</div>
    </div>
  )
}
