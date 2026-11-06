import { useState } from 'react'
import {
  ArcElement,
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Filler,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Tooltip,
  type Plugin,
  type ScriptableContext,
} from 'chart.js'
import { Bar, Doughnut, Line } from 'react-chartjs-2'

// 必要なコンポーネントだけ登録
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Filler, Tooltip, Legend)
ChartJS.defaults.font.family = 'Inter, "Noto Sans JP", sans-serif'
ChartJS.defaults.color = '#64748b'

const MONTHS = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月']
const RANGES = { '6M': 6, '12M': 12 } as const

const gradient = (ctx: ScriptableContext<'line'>) => {
  const { chart } = ctx
  const area = chart.chartArea
  if (!area) return 'transparent'
  const g = chart.ctx.createLinearGradient(0, area.top, 0, area.bottom)
  g.addColorStop(0, 'rgba(99,102,241,0.45)')
  g.addColorStop(1, 'rgba(99,102,241,0)')
  return g
}

/** ドーナツの中央にテキストを描くインラインプラグイン */
const centerText: Plugin<'doughnut'> = {
  id: 'centerText',
  afterDraw(chart) {
    const { ctx, chartArea } = chart
    const x = (chartArea.left + chartArea.right) / 2
    const y = (chartArea.top + chartArea.bottom) / 2
    ctx.save()
    ctx.textAlign = 'center'
    ctx.fillStyle = '#0f172a'
    ctx.font = '700 18px Inter, sans-serif'
    ctx.fillText('¥8.4M', x, y + 2)
    ctx.fillStyle = '#94a3b8'
    ctx.font = '10px "Noto Sans JP", sans-serif'
    ctx.fillText('今月の売上', x, y + 16)
    ctx.restore()
  },
}

const tooltip = {
  backgroundColor: '#0f172a',
  padding: 10,
  cornerRadius: 8,
  titleFont: { weight: 'bold' as const },
  displayColors: true,
  boxPadding: 4,
}

export function ChartJsGallery() {
  const [range, setRange] = useState<keyof typeof RANGES>('12M')
  const n = RANGES[range]
  const labels = MONTHS.slice(12 - n)
  const visits = [32, 41, 38, 52, 49, 61, 58, 72, 69, 81, 88, 96].slice(12 - n)
  const lastYear = [28, 30, 35, 37, 40, 42, 45, 47, 50, 53, 55, 60].slice(12 - n)

  return (
    <div className="relative grid h-full w-full grid-cols-[minmax(0,1fr)] grid-rows-[auto_minmax(0,1.25fr)_minmax(0,1fr)] gap-2 overflow-hidden bg-slate-50 p-3 text-slate-800">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-[11px] text-slate-500">月間アクティブユーザー(千人)</div>
          <div className="text-lg leading-tight font-bold">
            96.4K <span className="text-xs font-semibold text-emerald-600">+18.2%</span>
          </div>
        </div>
        <div className="flex rounded-lg bg-slate-200/70 p-0.5 text-[11px]">
          {(Object.keys(RANGES) as (keyof typeof RANGES)[]).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRange(r)}
              className={`rounded-md px-2 py-0.5 ${range === r ? 'bg-white font-semibold shadow-sm' : 'text-slate-500'}`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>
      <div className="relative min-h-0 rounded-xl bg-white p-2 shadow-sm ring-1 ring-slate-200">
        <Line
          data={{
            labels,
            datasets: [
              { label: '今年', data: visits, borderColor: '#6366f1', backgroundColor: gradient, fill: true, tension: 0.4, borderWidth: 2.5, pointRadius: 0, pointHoverRadius: 5 },
              { label: '昨年', data: lastYear, borderColor: '#cbd5e1', borderDash: [5, 4], tension: 0.4, borderWidth: 1.5, pointRadius: 0, fill: false },
            ],
          }}
          options={{
            maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false },
            plugins: { legend: { display: false }, tooltip },
            scales: { x: { grid: { display: false } }, y: { grid: { color: '#f1f5f9' }, border: { display: false }, ticks: { maxTicksLimit: 4 } } },
          }}
        />
      </div>
      <div className="grid min-h-0 grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] gap-2">
        <div className="relative min-h-0 rounded-xl bg-white p-2 shadow-sm ring-1 ring-slate-200">
          <Doughnut
            data={{
              labels: ['サブスク', '単品', '広告', 'その他'],
              datasets: [{ data: [52, 26, 14, 8], backgroundColor: ['#6366f1', '#22d3ee', '#f472b6', '#e2e8f0'], borderWidth: 0, hoverOffset: 6 }],
            }}
            options={{
              maintainAspectRatio: false,
              cutout: '72%',
              plugins: { legend: { position: 'right', labels: { boxWidth: 8, boxHeight: 8, usePointStyle: true, font: { size: 10 } } }, tooltip },
            }}
            plugins={[centerText]}
          />
        </div>
        <div className="relative min-h-0 rounded-xl bg-white p-2 shadow-sm ring-1 ring-slate-200">
          <Bar
            data={{
              labels: ['月', '火', '水', '木', '金', '土', '日'],
              datasets: [
                { label: '新規', data: [12, 19, 15, 22, 18, 9, 7], backgroundColor: '#6366f1', borderRadius: 4 },
                { label: '既存', data: [20, 22, 25, 24, 28, 14, 11], backgroundColor: '#c7d2fe', borderRadius: 4 },
              ],
            }}
            options={{
              maintainAspectRatio: false,
              plugins: { legend: { position: 'top', align: 'end', labels: { boxWidth: 8, boxHeight: 8, usePointStyle: true, font: { size: 10 } } }, tooltip },
              scales: {
                x: { stacked: true, grid: { display: false } },
                y: { stacked: true, grid: { color: '#f1f5f9' }, border: { display: false }, ticks: { maxTicksLimit: 4 } },
              },
            }}
          />
        </div>
      </div>
    </div>
  )
}
