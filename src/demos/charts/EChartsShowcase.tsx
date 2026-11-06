import { useEffect, useRef, useState } from 'react'
import * as echarts from 'echarts/core'
import { BarChart, GaugeChart, HeatmapChart, RadarChart } from 'echarts/charts'
import { CalendarComponent, GridComponent, RadarComponent, TooltipComponent, VisualMapComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'

// 使うものだけ登録(ツリーシェイキング)
echarts.use([BarChart, GaugeChart, HeatmapChart, RadarChart, CalendarComponent, GridComponent, RadarComponent, TooltipComponent, VisualMapComponent, CanvasRenderer])

type Tab = 'gauge' | 'radar' | 'calendar' | 'race'
const TABS: { id: Tab; label: string }[] = [
  { id: 'race', label: 'バーレース' },
  { id: 'gauge', label: 'ゲージ' },
  { id: 'radar', label: 'レーダー' },
  { id: 'calendar', label: 'カレンダー' },
]
const PREFS = ['東京', '大阪', '愛知', '福岡', '北海道', '神奈川', '京都', '沖縄']
const COLORS = ['#60a5fa', '#f472b6', '#fbbf24', '#34d399', '#a78bfa', '#fb923c', '#22d3ee', '#f87171']
const FONT = { fontFamily: 'Inter, "Noto Sans JP", sans-serif' }

function calendarData() {
  const out: [string, number][] = []
  const d = new Date(2026, 0, 1)
  let seed = 3
  while (d.getFullYear() === 2026) {
    seed = (seed * 9301 + 49297) % 233280
    const wk = d.getDay() === 0 || d.getDay() === 6 ? 0.35 : 1
    out.push([`2026-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`, Math.round((seed / 233280) * 12 * wk)])
    d.setDate(d.getDate() + 1)
  }
  return out
}

function option(tab: Tab, race: number[], gauge: number): echarts.EChartsCoreOption {
  const base = { backgroundColor: 'transparent', textStyle: FONT, tooltip: { trigger: tab === 'race' ? 'axis' : 'item' } }
  if (tab === 'gauge')
    return {
      ...base,
      series: [
        {
          type: 'gauge',
          startAngle: 210,
          endAngle: -30,
          radius: '88%',
          center: ['50%', '58%'],
          progress: { show: true, width: 14, roundCap: true, itemStyle: { color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [{ offset: 0, color: '#22d3ee' }, { offset: 1, color: '#a78bfa' }]) } },
          axisLine: { roundCap: true, lineStyle: { width: 14, color: [[1, 'rgba(255,255,255,0.08)']] } },
          axisTick: { distance: -26, length: 4, lineStyle: { color: '#64748b' } },
          splitLine: { distance: -30, length: 10, lineStyle: { color: '#64748b', width: 2 } },
          axisLabel: { distance: -16, color: '#94a3b8', fontSize: 10 },
          pointer: { width: 4, length: '58%', itemStyle: { color: '#e2e8f0' } },
          anchor: { show: true, size: 12, itemStyle: { color: '#0f172a', borderColor: '#e2e8f0', borderWidth: 3 } },
          title: { offsetCenter: [0, '72%'], color: '#94a3b8', fontSize: 12 },
          detail: { valueAnimation: true, offsetCenter: [0, '40%'], formatter: '{value}%', color: '#f8fafc', fontSize: 28, fontWeight: 700 },
          data: [{ value: gauge, name: 'CPU 使用率' }],
        },
      ],
    }
  if (tab === 'radar')
    return {
      ...base,
      radar: {
        radius: '68%',
        center: ['50%', '54%'],
        indicator: ['デザイン', '性能', '価格', 'サポート', '機能', '使いやすさ'].map((name) => ({ name, max: 100 })),
        axisName: { color: '#cbd5e1', fontSize: 11 },
        splitLine: { lineStyle: { color: 'rgba(255,255,255,0.1)' } },
        splitArea: { areaStyle: { color: ['rgba(255,255,255,0.02)', 'rgba(255,255,255,0.04)'] } },
        axisLine: { lineStyle: { color: 'rgba(255,255,255,0.1)' } },
      },
      series: [
        {
          type: 'radar',
          symbolSize: 5,
          data: [
            { name: '自社製品', value: [90, 78, 62, 85, 88, 92], itemStyle: { color: '#a78bfa' }, areaStyle: { opacity: 0.35 } },
            { name: '競合A', value: [70, 90, 80, 60, 75, 68], itemStyle: { color: '#22d3ee' }, areaStyle: { opacity: 0.2 } },
          ],
        },
      ],
    }
  if (tab === 'calendar')
    return {
      ...base,
      tooltip: { formatter: (p: unknown) => { const v = (p as { value: [string, number] }).value; return `${v[0]}<br/>コミット <b>${v[1]}</b>` } },
      visualMap: { min: 0, max: 12, show: false, inRange: { color: ['#1e293b', '#0e7490', '#22d3ee', '#a5f3fc'] } },
      calendar: {
        range: '2026',
        top: 40,
        left: 34,
        right: 12,
        cellSize: ['auto', 13],
        itemStyle: { borderColor: '#0b1220', borderWidth: 2, color: '#111827' },
        splitLine: { show: false },
        dayLabel: { color: '#64748b', fontSize: 9, nameMap: ['日', '月', '火', '水', '木', '金', '土'] },
        monthLabel: { color: '#94a3b8', fontSize: 10, nameMap: Array.from({ length: 12 }, (_, i) => `${i + 1}月`) },
        yearLabel: { show: false },
      },
      series: [{ type: 'heatmap', coordinateSystem: 'calendar', data: calendarData() }],
    }
  return {
    ...base,
    grid: { left: 60, right: 56, top: 16, bottom: 18 },
    xAxis: { max: 'dataMax', splitLine: { lineStyle: { color: 'rgba(255,255,255,0.06)' } }, axisLabel: { color: '#64748b', fontSize: 10 } },
    yAxis: {
      type: 'category',
      data: PREFS,
      inverse: true,
      animationDuration: 300,
      animationDurationUpdate: 300,
      axisLabel: { color: '#cbd5e1', fontSize: 11 },
      axisLine: { show: false },
      axisTick: { show: false },
    },
    series: [
      {
        type: 'bar',
        realtimeSort: true,
        barWidth: '62%',
        data: race.map((v, i) => ({ value: v, itemStyle: { color: COLORS[i], borderRadius: [0, 6, 6, 0] } })),
        label: { show: true, position: 'right', valueAnimation: true, color: '#e2e8f0', fontSize: 11, formatter: '{c}万' },
      },
    ],
    animationDuration: 0,
    animationDurationUpdate: 1000,
    animationEasing: 'linear',
    animationEasingUpdate: 'linear',
  }
}

/** Apache ECharts(echarts/core で必要なものだけ登録)のギャラリー */
export function EChartsShowcase() {
  const el = useRef<HTMLDivElement>(null)
  const chart = useRef<echarts.ECharts | null>(null)
  const [tab, setTab] = useState<Tab>('race')
  const [month, setMonth] = useState(1)

  useEffect(() => {
    const c = echarts.init(el.current!, 'dark', { renderer: 'canvas' })
    chart.current = c
    const ro = new ResizeObserver(() => c.resize())
    ro.observe(el.current!)
    return () => {
      ro.disconnect()
      c.dispose()
    }
  }, [])

  useEffect(() => {
    const c = chart.current!
    let race = PREFS.map((_, i) => 200 - i * 18)
    let gauge = 46
    let m = 1
    setMonth(1)
    c.setOption(option(tab, race, gauge), true)
    const id = window.setInterval(() => {
      if (tab === 'race') {
        race = race.map((v) => Math.round(v + Math.random() * 60))
        m = (m % 12) + 1
        setMonth(m)
        c.setOption({ series: [{ data: race.map((v, i) => ({ value: v, itemStyle: { color: COLORS[i], borderRadius: [0, 6, 6, 0] } })) }] })
      } else if (tab === 'gauge') {
        gauge = Math.max(5, Math.min(98, Math.round(gauge + (Math.random() - 0.45) * 30)))
        c.setOption({ series: [{ data: [{ value: gauge, name: 'CPU 使用率' }] }] })
      }
    }, tab === 'race' ? 1000 : 1800)
    return () => clearInterval(id)
  }, [tab])

  return (
    <div className="relative flex h-full w-full flex-col overflow-hidden bg-[#0b1220] text-slate-100">
      <div className="flex items-center gap-1 border-b border-white/5 px-3 py-2">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`rounded-md px-2.5 py-1 text-[11.5px] transition ${tab === t.id ? 'bg-white/10 text-white' : 'text-slate-400 hover:text-slate-200'}`}
          >
            {t.label}
          </button>
        ))}
        <span className="ml-auto text-[10.5px] text-slate-500">
          {tab === 'race' ? `都道府県別 累計売上 · 2026年${month}月` : tab === 'calendar' ? '2026年 日別コミット数' : tab === 'gauge' ? 'サーバー監視(リアルタイム)' : '製品比較'}
        </span>
      </div>
      <div ref={el} className="min-h-0 flex-1" />
    </div>
  )
}
