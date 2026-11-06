import { useEffect, useRef, useState } from 'react'
import * as d3 from 'd3'
import { feature } from 'topojson-client'
import type { Topology, GeometryCollection } from 'topojson-specification'
import type { Feature, FeatureCollection, Geometry } from 'geojson'
import world from 'world-atlas/countries-110m.json'

type Props = { name: string }
const JA: Record<string, string> = {
  Japan: '日本', China: '中国', 'United States of America': 'アメリカ', Brazil: 'ブラジル', India: 'インド', Australia: 'オーストラリア',
  Germany: 'ドイツ', France: 'フランス', 'United Kingdom': 'イギリス', Canada: 'カナダ', Russia: 'ロシア', 'South Korea': '韓国',
  Indonesia: 'インドネシア', Mexico: 'メキシコ', Egypt: 'エジプト', 'South Africa': '南アフリカ', Argentina: 'アルゼンチン', Thailand: 'タイ',
}
// 東京からの路線
const HUB: [number, number] = [139.7, 35.7]
const ROUTES: { to: [number, number]; city: string }[] = [
  { to: [-122.4, 37.8], city: 'サンフランシスコ' },
  { to: [-0.1, 51.5], city: 'ロンドン' },
  { to: [151.2, -33.9], city: 'シドニー' },
  { to: [103.8, 1.35], city: 'シンガポール' },
  { to: [-73.9, 40.7], city: 'ニューヨーク' },
  { to: [77.2, 28.6], city: 'デリー' },
  { to: [-46.6, -23.5], city: 'サンパウロ' },
]
const hash = (s: string) => [...s].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7)
const valueOf = (n: string) => (n === 'Japan' ? 100 : 8 + (hash(n) % 85))

/** d3-geo の正射図法 + world-atlas(TopoJSON)で描く、ドラッグで回せる地球儀コロプレス */
export function D3WorldGlobe() {
  const ref = useRef<HTMLCanvasElement>(null)
  const [hover, setHover] = useState<{ x: number; y: number; name: string; v: number } | null>(null)

  useEffect(() => {
    const cv = ref.current!
    const ctx = cv.getContext('2d')!
    const topo = world as unknown as Topology<{ countries: GeometryCollection<Props> }>
    const countries = (feature(topo, topo.objects.countries) as FeatureCollection<Geometry, Props>).features
    const projection = d3.geoOrthographic().rotate([-125, -22]).clipAngle(90).precision(0.4)
    const path = d3.geoPath(projection, ctx)
    const graticule = d3.geoGraticule10()
    const scale = d3.scaleSequential(d3.interpolateRgbBasis(['#1e3a5f', '#2563eb', '#22d3ee', '#a7f3d0']))
      .domain([0, 100])
    const arcs = ROUTES.map((r) => {
      const ip = d3.geoInterpolate(HUB, r.to)
      return { ...r, coords: d3.range(0, 1.0001, 0.02).map((t) => ip(t)) }
    })
    let hovered: Feature<Geometry, Props> | null = null
    let w = 0
    let h = 0
    let dragging = false
    let idleAt = 0
    let raf = 0

    const ro = new ResizeObserver(() => {
      const dpr = Math.min(devicePixelRatio, 2)
      w = cv.clientWidth
      h = cv.clientHeight
      cv.width = w * dpr
      cv.height = h * dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      projection.translate([w / 2, h / 2 + 6]).scale(Math.min(w, h) * 0.43)
    })
    ro.observe(cv)

    const draw = (now: number) => {
      raf = requestAnimationFrame(draw)
      if (!dragging && now > idleAt) {
        const [l, p] = projection.rotate()
        projection.rotate([l + 0.12, p])
      }
      const [cx, cy] = projection.translate()
      const R = projection.scale()
      ctx.clearRect(0, 0, w, h)
      // 大気のグロー
      const glow = ctx.createRadialGradient(cx, cy, R * 0.9, cx, cy, R * 1.25)
      glow.addColorStop(0, 'rgba(56,189,248,0.35)')
      glow.addColorStop(1, 'rgba(56,189,248,0)')
      ctx.fillStyle = glow
      ctx.beginPath()
      ctx.arc(cx, cy, R * 1.25, 0, Math.PI * 2)
      ctx.fill()
      // 海
      const sea = ctx.createRadialGradient(cx - R * 0.4, cy - R * 0.4, R * 0.1, cx, cy, R)
      sea.addColorStop(0, '#13233f')
      sea.addColorStop(1, '#060b18')
      ctx.beginPath()
      path({ type: 'Sphere' })
      ctx.fillStyle = sea
      ctx.fill()
      ctx.beginPath()
      path(graticule)
      ctx.strokeStyle = 'rgba(148,163,184,0.1)'
      ctx.lineWidth = 0.6
      ctx.stroke()
      // 国
      for (const f of countries) {
        ctx.beginPath()
        path(f)
        ctx.fillStyle = f === hovered ? '#fde047' : scale(valueOf(f.properties.name))
        ctx.fill()
      }
      ctx.beginPath()
      for (const f of countries) path(f)
      ctx.strokeStyle = 'rgba(6,11,24,0.7)'
      ctx.lineWidth = 0.5
      ctx.stroke()
      // 航路(破線を流す)
      ctx.setLineDash([4, 6])
      ctx.lineDashOffset = -now / 40
      ctx.lineWidth = 1.4
      for (const a of arcs) {
        ctx.beginPath()
        path({ type: 'LineString', coordinates: a.coords })
        ctx.strokeStyle = 'rgba(244,114,182,0.9)'
        ctx.stroke()
      }
      ctx.setLineDash([])
      // 都市の点
      const center = projection.invert!([cx, cy])!
      for (const p of [HUB, ...ROUTES.map((r) => r.to)]) {
        if (d3.geoDistance(p, center) > Math.PI / 2) continue
        const [x, y] = projection(p)!
        const pulse = (now / 1000) % 1.5
        ctx.beginPath()
        ctx.arc(x, y, 3 + pulse * 6, 0, Math.PI * 2)
        ctx.strokeStyle = `rgba(244,114,182,${0.6 - pulse * 0.4})`
        ctx.stroke()
        ctx.beginPath()
        ctx.arc(x, y, 2.6, 0, Math.PI * 2)
        ctx.fillStyle = '#fff'
        ctx.fill()
      }
      // 縁のハイライト
      ctx.beginPath()
      path({ type: 'Sphere' })
      ctx.strokeStyle = 'rgba(125,211,252,0.35)'
      ctx.lineWidth = 1
      ctx.stroke()
    }
    raf = requestAnimationFrame(draw)

    const sel = d3.select(cv)
    sel.call(
      d3
        .drag<HTMLCanvasElement, unknown>()
        .on('start', () => {
          dragging = true
          setHover(null)
        })
        .on('drag', (e) => {
          const [l, p] = projection.rotate()
          const k = 75 / projection.scale()
          projection.rotate([l + e.dx * k, Math.max(-80, Math.min(80, p - e.dy * k))])
        })
        .on('end', () => {
          dragging = false
          idleAt = performance.now() + 2000
        }),
    )
    sel.on('mousemove', (e: MouseEvent) => {
      if (dragging) return
      const [mx, my] = d3.pointer(e)
      const ll = projection.invert!([mx, my])
      const [cx, cy] = projection.translate()
      const inside = Math.hypot(mx - cx, my - cy) < projection.scale()
      hovered = inside && ll ? (countries.find((f) => d3.geoContains(f, ll)) ?? null) : null
      setHover(hovered ? { x: mx, y: my, name: JA[hovered.properties.name] ?? hovered.properties.name, v: valueOf(hovered.properties.name) } : null)
    })
    sel.on('mouseleave', () => {
      hovered = null
      setHover(null)
    })
    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
      sel.on('.drag', null).on('mousemove', null).on('mouseleave', null)
    }
  }, [])

  return (
    <div className="relative h-full w-full overflow-hidden bg-[#03060f] text-slate-100">
      <div className="absolute inset-0 bg-[radial-gradient(white_0.6px,transparent_0.6px)] [background-size:28px_28px] opacity-20" />
      <canvas ref={ref} className="absolute inset-0 h-full w-full cursor-grab active:cursor-grabbing" />
      <div className="pointer-events-none absolute top-3 left-3">
        <div className="text-[11px] tracking-widest text-sky-300/80 uppercase">Global Users</div>
        <div className="text-sm font-semibold">国別アクティブユーザー</div>
      </div>
      <div className="pointer-events-none absolute bottom-3 left-3 w-36">
        <div className="h-1.5 rounded-full bg-gradient-to-r from-[#1e3a5f] via-[#2563eb] via-60% to-[#a7f3d0]" />
        <div className="mt-0.5 flex justify-between text-[9px] text-slate-400">
          <span>少</span>
          <span>多</span>
        </div>
      </div>
      <div className="pointer-events-none absolute right-3 bottom-3 text-right text-[10px] text-slate-400">
        <span className="text-pink-300">┄</span> 東京からの路線 {ROUTES.length}本
        <br />
        ドラッグで回転
      </div>
      {hover && (
        <div
          className="pointer-events-none absolute rounded-lg border border-white/10 bg-slate-900/90 px-2.5 py-1.5 text-[11px] shadow-xl backdrop-blur"
          style={{ left: hover.x + 12, top: hover.y + 12 }}
        >
          <div className="font-semibold">{hover.name}</div>
          <div className="text-slate-400">
            ユーザー <b className="text-sky-300">{(hover.v * 1234).toLocaleString()}</b> 人
          </div>
        </div>
      )}
    </div>
  )
}
