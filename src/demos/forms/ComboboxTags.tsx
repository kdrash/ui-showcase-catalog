import { useState } from 'react'
import { Combobox, ComboboxButton, ComboboxInput, ComboboxOption, ComboboxOptions } from '@headlessui/react'
import { AnimatePresence, motion } from 'motion/react'
import { Check, ChevronsUpDown, Hash, Plus, X } from 'lucide-react'

type Tag = { id: string; name: string; hue: number }

const INITIAL: Tag[] = [
  'React', 'TypeScript', 'デザインシステム', 'アクセシビリティ', 'パフォーマンス', 'Three.js', 'アニメーション',
  'UXリサーチ', 'Figma', 'テスト', 'Next.js', 'Tailwind CSS', 'GraphQL', 'Rust',
].map((name, i) => ({ id: name, name, hue: (i * 47) % 360 }))

export function ComboboxTags() {
  const [all, setAll] = useState<Tag[]>(INITIAL)
  const [selected, setSelected] = useState<Tag[]>([INITIAL[0], INITIAL[2], INITIAL[6]])
  const [query, setQuery] = useState('')

  const q = query.trim().toLowerCase()
  const filtered = q ? all.filter((t) => t.name.toLowerCase().includes(q)) : all
  const exact = all.some((t) => t.name.toLowerCase() === q)

  const onChange = (tags: (Tag | { id: '__new'; name: string; hue: number })[]) => {
    const created = tags.find((t) => t.id === '__new')
    if (created) {
      const tag = { id: created.name, name: created.name, hue: Math.floor(Math.random() * 360) }
      setAll((a) => [tag, ...a])
      setSelected([...tags.filter((t) => t.id !== '__new'), tag] as Tag[])
    } else setSelected(tags as Tag[])
    setQuery('')
  }

  return (
    <div className="relative h-full w-full overflow-hidden bg-gradient-to-b from-slate-50 to-slate-200 p-5 font-sans text-slate-900">
      <div className="mx-auto max-w-[460px]">
        <label className="mb-1.5 block text-xs font-semibold text-slate-600">スキルタグ</label>
        <Combobox multiple immediate value={selected} by="id" onChange={onChange} onClose={() => setQuery('')}>
          <div className="relative">
            <div className="flex min-h-11 flex-wrap items-center gap-1.5 rounded-xl border border-slate-300 bg-white p-1.5 pr-9 shadow-sm focus-within:border-indigo-400 focus-within:ring-4 focus-within:ring-indigo-500/15">
              <AnimatePresence initial={false}>
                {selected.map((t) => (
                  <motion.span
                    key={t.id}
                    layout
                    initial={{ scale: 0.6, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.6, opacity: 0 }}
                    className="inline-flex items-center gap-1 rounded-lg py-1 pr-1 pl-2 text-xs font-medium"
                    style={{ background: `hsl(${t.hue} 90% 94%)`, color: `hsl(${t.hue} 60% 32%)` }}
                  >
                    {t.name}
                    <button
                      type="button"
                      aria-label={`${t.name} を削除`}
                      onClick={() => setSelected((s) => s.filter((x) => x.id !== t.id))}
                      className="rounded p-0.5 hover:bg-black/10"
                    >
                      <X size={11} />
                    </button>
                  </motion.span>
                ))}
              </AnimatePresence>
              <ComboboxInput
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Backspace' && !query && selected.length) setSelected((s) => s.slice(0, -1))
                }}
                placeholder={selected.length ? '' : 'タグを検索・作成…'}
                className="min-w-[90px] flex-1 bg-transparent px-1 py-1 text-sm outline-none placeholder:text-slate-400"
              />
            </div>
            <ComboboxButton className="absolute top-1/2 right-2 -translate-y-1/2 rounded p-1 text-slate-400 hover:text-slate-700">
              <ChevronsUpDown size={16} />
            </ComboboxButton>
            <ComboboxOptions
              transition
              className="thin-scroll absolute z-10 mt-1.5 max-h-48 w-full overflow-auto rounded-xl border border-slate-200 bg-white p-1 shadow-xl shadow-slate-900/10 transition duration-150 ease-out data-closed:-translate-y-1 data-closed:opacity-0"
            >
              {q && !exact && (
                <ComboboxOption
                  value={{ id: '__new', name: query.trim(), hue: 0 }}
                  className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-indigo-700 data-focus:bg-indigo-50"
                >
                  <Plus size={14} /> 「{query.trim()}」を新しいタグとして作成
                </ComboboxOption>
              )}
              {filtered.map((t) => (
                <ComboboxOption
                  key={t.id}
                  value={t}
                  className="group flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm data-focus:bg-slate-100"
                >
                  <Hash size={13} style={{ color: `hsl(${t.hue} 60% 50%)` }} />
                  <span className="flex-1">{t.name}</span>
                  <Check size={14} className="invisible text-indigo-600 group-data-selected:visible" />
                </ComboboxOption>
              ))}
              {filtered.length === 0 && exact && <div className="px-2 py-1.5 text-sm text-slate-400">該当なし</div>}
            </ComboboxOptions>
          </div>
        </Combobox>
        <p className="mt-2 text-[11px] text-slate-500">↑↓ で移動 / Enter で追加 / Backspace で最後のタグを削除</p>
        <div className="mt-4 rounded-xl border border-dashed border-slate-300 p-3">
          <div className="mb-2 text-[11px] font-semibold text-slate-500">おすすめ</div>
          <div className="flex flex-wrap gap-1.5">
            {all
              .filter((t) => !selected.some((s) => s.id === t.id))
              .slice(0, 6)
              .map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setSelected((s) => [...s, t])}
                  className="inline-flex items-center gap-1 rounded-full border border-slate-300 bg-white px-2.5 py-0.5 text-xs text-slate-600 hover:border-indigo-300 hover:text-indigo-700"
                >
                  <Plus size={11} /> {t.name}
                </button>
              ))}
          </div>
        </div>
      </div>
    </div>
  )
}
