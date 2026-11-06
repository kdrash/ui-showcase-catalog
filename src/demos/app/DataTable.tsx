import { useState } from 'react'
import {
  columnFilteringFeature,
  columnVisibilityFeature,
  createColumnHelper,
  createFilteredRowModel,
  createPaginatedRowModel,
  createSortedRowModel,
  filterFn_equalsString,
  filterFn_includesString,
  globalFilteringFeature,
  rowPaginationFeature,
  rowSelectionFeature,
  rowSortingFeature,
  sortFn_alphanumeric,
  sortFn_basic,
  tableFeatures,
  useTable,
} from '@tanstack/react-table'
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronLeft, ChevronRight, Columns3, Search, Trash2, X } from 'lucide-react'

type Status = '成功' | '処理中' | '失敗' | '返金'
type Payment = { id: string; name: string; email: string; amount: number; status: Status; date: string }

const STATUS_STYLE: Record<Status, string> = {
  成功: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  処理中: 'bg-amber-50 text-amber-700 ring-amber-600/20',
  失敗: 'bg-red-50 text-red-700 ring-red-600/20',
  返金: 'bg-zinc-100 text-zinc-600 ring-zinc-500/20',
}

const SEI = ['佐藤', '鈴木', '高橋', '田中', '伊藤', '渡辺', '山本', '中村', '小林', '加藤', '吉田', '山田']
const MEI = ['陽菜', '蓮', '結衣', '湊', '葵', '大和', '凛', '悠真', '芽依', '颯太']
const ROMA = ['sato', 'suzuki', 'takahashi', 'tanaka', 'ito', 'watanabe', 'yamamoto', 'nakamura', 'kobayashi', 'kato', 'yoshida', 'yamada']
const STATUSES: Status[] = ['成功', '成功', '成功', '処理中', '失敗', '返金']

const DATA: Payment[] = Array.from({ length: 48 }, (_, i) => {
  const s = (i * 7) % SEI.length
  return {
    id: `INV-${String(1042 + i)}`,
    name: `${SEI[s]} ${MEI[(i * 3) % MEI.length]}`,
    email: `${ROMA[s]}${i}@example.jp`,
    amount: Math.round(((i * 7919) % 97) * 530 + 1200),
    status: STATUSES[(i * 5) % STATUSES.length],
    date: `2026/10/${String(30 - (i % 28)).padStart(2, '0')}`,
  }
})

const yen = new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY' })

function Checkbox({ checked, indeterminate, onChange }: { checked: boolean; indeterminate?: boolean; onChange: () => void }) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={indeterminate ? 'mixed' : checked}
      onClick={onChange}
      className={`grid h-4 w-4 place-items-center rounded border text-[10px] leading-none transition ${
        checked || indeterminate ? 'border-zinc-900 bg-zinc-900 text-white' : 'border-zinc-300 bg-white hover:border-zinc-500'
      }`}
    >
      {indeterminate ? '–' : checked ? '✓' : ''}
    </button>
  )
}

// v9: 使う機能(と行モデル/関数レジストリ)を明示的に登録する。モジュールスコープで安定させる
const features = tableFeatures({
  rowSortingFeature,
  sortedRowModel: createSortedRowModel(),
  sortFns: { alphanumeric: sortFn_alphanumeric, basic: sortFn_basic },
  columnFilteringFeature,
  globalFilteringFeature,
  filteredRowModel: createFilteredRowModel(),
  filterFns: { includesString: filterFn_includesString, equalsString: filterFn_equalsString },
  rowPaginationFeature,
  paginatedRowModel: createPaginatedRowModel(),
  rowSelectionFeature,
  columnVisibilityFeature,
})
const helper = createColumnHelper<typeof features, Payment>()
const columns = helper.columns([
  helper.display({
    id: 'select',
    header: ({ table }) => (
      <Checkbox
        checked={table.getIsAllPageRowsSelected()}
        indeterminate={table.getIsSomePageRowsSelected()}
        onChange={() => table.toggleAllPageRowsSelected(!table.getIsAllPageRowsSelected())}
      />
    ),
    cell: ({ row }) => <Checkbox checked={row.getIsSelected()} onChange={() => row.toggleSelected()} />,
    enableSorting: false,
    enableHiding: false,
  }),
  helper.accessor('id', { header: '請求ID', cell: (i) => <span className="font-mono text-[11px] text-zinc-500">{i.getValue()}</span> }),
  helper.accessor('name', {
    header: '顧客',
    cell: ({ row }) => (
      <div className="leading-tight">
        <div className="font-medium text-zinc-900">{row.original.name}</div>
        <div className="text-[11px] text-zinc-500">{row.original.email}</div>
      </div>
    ),
  }),
  helper.accessor('status', {
    header: 'ステータス',
    filterFn: 'equalsString',
    cell: (i) => <span className={`rounded-md px-1.5 py-0.5 text-[11px] font-medium ring-1 ring-inset ${STATUS_STYLE[i.getValue()]}`}>{i.getValue()}</span>,
  }),
  helper.accessor('date', { header: '日付', cell: (i) => <span className="text-zinc-600">{i.getValue()}</span> }),
  helper.accessor('amount', {
    header: '金額',
    cell: (i) => <div className="text-right font-medium tabular-nums text-zinc-900">{yen.format(i.getValue())}</div>,
  }),
])

export function DataTable() {
  const [data, setData] = useState(DATA)
  const [status, setStatus] = useState<Status | 'all'>('all')
  const [colMenu, setColMenu] = useState(false)

  const table = useTable({
    features,
    columns,
    data,
    getRowId: (r) => r.id,
    globalFilterFn: 'includesString',
    initialState: { pagination: { pageIndex: 0, pageSize: 6 } },
  })
  const globalFilter = (table.state.globalFilter as string | undefined) ?? ''
  const setGlobalFilter = (v: string) => table.setGlobalFilter(v)

  const selected = table.getSelectedRowModel().rows
  const { pageIndex } = table.state.pagination

  return (
    <div className="relative flex h-full w-full flex-col overflow-hidden bg-white p-4 font-sans text-[13px] text-zinc-900">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="relative">
          <Search size={14} className="absolute top-1/2 left-2.5 -translate-y-1/2 text-zinc-400" />
          <input
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            placeholder="顧客名・メール・IDで検索…"
            className="h-8 w-56 rounded-md border border-zinc-200 pr-2 pl-8 text-[13px] outline-none placeholder:text-zinc-400 focus:border-zinc-400 focus:ring-2 focus:ring-zinc-200"
          />
        </div>
        <div className="flex rounded-md border border-zinc-200 p-0.5">
          {(['all', '成功', '処理中', '失敗', '返金'] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => {
                setStatus(s)
                table.setColumnFilters(s === 'all' ? [] : [{ id: 'status', value: s }])
                table.setPageIndex(0)
              }}
              className={`rounded px-2 py-1 text-[12px] transition ${status === s ? 'bg-zinc-900 text-white' : 'text-zinc-600 hover:bg-zinc-100'}`}
            >
              {s === 'all' ? 'すべて' : s}
            </button>
          ))}
        </div>
        <div className="relative ml-auto">
          <button
            type="button"
            onClick={() => setColMenu((v) => !v)}
            className="flex h-8 items-center gap-1.5 rounded-md border border-zinc-200 px-2.5 text-[12px] text-zinc-700 hover:bg-zinc-50"
          >
            <Columns3 size={14} /> 表示列
          </button>
          {colMenu && (
            <div className="absolute top-9 right-0 z-20 w-40 rounded-lg border border-zinc-200 bg-white p-1 shadow-lg">
              {table
                .getAllLeafColumns()
                .filter((c) => c.getCanHide())
                .map((c) => (
                  <label key={c.id} className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 hover:bg-zinc-100">
                    <Checkbox checked={c.getIsVisible()} onChange={() => c.toggleVisibility()} />
                    {String(c.columnDef.header)}
                  </label>
                ))}
            </div>
          )}
        </div>
      </div>

      <div className="thin-scroll min-h-0 flex-1 overflow-auto rounded-lg border border-zinc-200">
        <table className="w-full border-collapse">
          <thead className="sticky top-0 z-10 bg-zinc-50/95 backdrop-blur">
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id}>
                {hg.headers.map((h) => (
                  <th key={h.id} className="border-b border-zinc-200 px-3 py-2 text-left text-[12px] font-medium text-zinc-500">
                    {h.column.getCanSort() ? (
                      <button type="button" onClick={h.column.getToggleSortingHandler()} className="inline-flex w-full items-center gap-1 hover:text-zinc-900">
                        <table.FlexRender header={h} />
                        {{ asc: <ArrowUp size={12} />, desc: <ArrowDown size={12} /> }[h.column.getIsSorted() as string] ?? (
                          <ArrowUpDown size={12} className="opacity-40" />
                        )}
                      </button>
                    ) : (
                      <table.FlexRender header={h} />
                    )}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((r) => (
              <tr key={r.id} className={`border-b border-zinc-100 transition-colors last:border-0 ${r.getIsSelected() ? 'bg-zinc-100/80' : 'hover:bg-zinc-50'}`}>
                {r.getVisibleCells().map((cell) => (
                  <td key={cell.id} className="px-3 py-2">
                    <table.FlexRender cell={cell} />
                  </td>
                ))}
              </tr>
            ))}
            {table.getRowModel().rows.length === 0 && (
              <tr>
                <td colSpan={8} className="py-10 text-center text-zinc-400">
                  該当する請求はありません
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-3 flex items-center gap-2 text-[12px] text-zinc-500">
        <span>
          {selected.length} / {table.getFilteredRowModel().rows.length} 件を選択
        </span>
        <div className="ml-auto flex items-center gap-2">
          <span>
            {pageIndex + 1} / {Math.max(1, table.getPageCount())} ページ
          </span>
          <button type="button" disabled={!table.getCanPreviousPage()} onClick={() => table.previousPage()} className="rounded-md border border-zinc-200 p-1 hover:bg-zinc-50 disabled:opacity-40">
            <ChevronLeft size={14} />
          </button>
          <button type="button" disabled={!table.getCanNextPage()} onClick={() => table.nextPage()} className="rounded-md border border-zinc-200 p-1 hover:bg-zinc-50 disabled:opacity-40">
            <ChevronRight size={14} />
          </button>
        </div>
      </div>

      {selected.length > 0 && (
        <div className="absolute bottom-12 left-1/2 z-20 flex -translate-x-1/2 items-center gap-3 rounded-xl bg-zinc-900 px-3 py-2 text-[12px] text-white shadow-2xl">
          <span>{selected.length} 件選択中 · 合計 {yen.format(selected.reduce((s, r) => s + r.original.amount, 0))}</span>
          <button
            type="button"
            onClick={() => {
              const ids = new Set(selected.map((r) => r.id))
              setData((d) => d.filter((x) => !ids.has(x.id)))
              table.resetRowSelection()
            }}
            className="flex items-center gap-1 rounded-md bg-red-500/90 px-2 py-1 hover:bg-red-500"
          >
            <Trash2 size={12} /> 削除
          </button>
          <button type="button" onClick={() => table.resetRowSelection()} className="rounded p-0.5 text-zinc-400 hover:text-white" title="選択解除">
            <X size={14} />
          </button>
        </div>
      )}
    </div>
  )
}
