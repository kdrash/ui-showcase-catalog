import { useState, type CSSProperties } from 'react'
import { Popover } from 'radix-ui'
import { DayPicker, type DateRange } from 'react-day-picker'
import { ja } from 'react-day-picker/locale'
import 'react-day-picker/style.css'
import { differenceInCalendarDays, endOfMonth, format, startOfMonth, subDays, subMonths } from 'date-fns'
import { ja as jaFns } from 'date-fns/locale'
import { CalendarDays, ChevronDown } from 'lucide-react'

const today = new Date()
const PRESETS: { label: string; range: () => DateRange }[] = [
  { label: '今日', range: () => ({ from: today, to: today }) },
  { label: '昨日', range: () => ({ from: subDays(today, 1), to: subDays(today, 1) }) },
  { label: '過去7日', range: () => ({ from: subDays(today, 6), to: today }) },
  { label: '過去30日', range: () => ({ from: subDays(today, 29), to: today }) },
  { label: '今月', range: () => ({ from: startOfMonth(today), to: endOfMonth(today) }) },
  { label: '先月', range: () => ({ from: startOfMonth(subMonths(today, 1)), to: endOfMonth(subMonths(today, 1)) }) },
]

const fmt = (d?: Date) => (d ? format(d, 'yyyy/M/d (E)', { locale: jaFns }) : '—')

const rdpVars = {
  '--rdp-accent-color': '#8b5cf6',
  '--rdp-accent-background-color': 'rgba(139,92,246,.18)',
  '--rdp-day-height': '30px',
  '--rdp-day-width': '32px',
  '--rdp-day_button-height': '28px',
  '--rdp-day_button-width': '28px',
  '--rdp-day_button-border-radius': '8px',
  '--rdp-months-gap': '1.25rem',
  '--rdp-nav-height': '2rem',
  '--rdp-nav_button-height': '1.75rem',
  '--rdp-nav_button-width': '1.75rem',
  '--rdp-weekday-padding': '0.25rem 0',
  '--rdp-today-color': '#c4b5fd',
  fontSize: 12,
} as CSSProperties

export function DateRangePicker() {
  const [range, setRange] = useState<DateRange | undefined>(PRESETS[2].range())
  const [month, setMonth] = useState<Date>(subMonths(today, 1))
  const days = range?.from && range.to ? differenceInCalendarDays(range.to, range.from) + 1 : 0

  return (
    <div className="relative h-full w-full overflow-hidden bg-zinc-950 p-4 font-sans text-zinc-100">
      <div className="mb-2 text-xs text-zinc-500">レポート期間</div>
      <Popover.Root defaultOpen>
        <Popover.Trigger asChild>
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-sm hover:border-white/25 data-[state=open]:border-violet-400/60"
          >
            <CalendarDays size={15} className="text-violet-300" />
            <span>
              {fmt(range?.from)} 〜 {fmt(range?.to)}
            </span>
            {days > 0 && <span className="rounded bg-violet-500/20 px-1.5 text-[11px] text-violet-200">{days}日間</span>}
            <ChevronDown size={14} className="text-zinc-500" />
          </button>
        </Popover.Trigger>
        <Popover.Content
          align="start"
          sideOffset={8}
          collisionPadding={8}
          className="z-20 rounded-xl border border-white/10 bg-zinc-900/95 p-3 shadow-2xl shadow-black/60 backdrop-blur"
        >
          <div className="mb-2 flex flex-wrap gap-1">
            {PRESETS.map((p) => (
              <button
                key={p.label}
                type="button"
                onClick={() => {
                  const r = p.range()
                  setRange(r)
                  setMonth(subMonths(r.to ?? today, 1))
                }}
                className="rounded-md border border-white/10 px-2 py-0.5 text-[11px] text-zinc-300 hover:border-violet-400/50 hover:text-white"
              >
                {p.label}
              </button>
            ))}
          </div>
          <DayPicker
            mode="range"
            locale={ja}
            numberOfMonths={2}
            month={month}
            onMonthChange={setMonth}
            selected={range}
            onSelect={setRange}
            showOutsideDays={false}
            style={rdpVars}
          />
          <div className="mt-2 flex items-center justify-between border-t border-white/10 pt-2 text-[11px] text-zinc-400">
            <span>{days > 0 ? `${days}日間を選択中` : '開始日と終了日を選択'}</span>
            <Popover.Close className="rounded-md bg-violet-500 px-3 py-1 text-xs font-medium text-white hover:bg-violet-400">
              適用
            </Popover.Close>
          </div>
        </Popover.Content>
      </Popover.Root>
    </div>
  )
}
