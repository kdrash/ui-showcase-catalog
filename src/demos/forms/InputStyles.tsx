import { useState, type ReactNode } from 'react'
import { AtSign, Mail, Search, User } from 'lucide-react'

function Tile({ label, className, children }: { label: string; className: string; children: ReactNode }) {
  return (
    <div className={`relative flex flex-col justify-center gap-2 rounded-xl p-4 ${className}`}>
      {children}
      <span className="absolute top-2 left-3 text-[10px] font-semibold tracking-wider uppercase opacity-50">{label}</span>
    </div>
  )
}

export function InputStyles() {
  const [v, setV] = useState('')
  return (
    <div className="@container relative h-full w-full overflow-hidden bg-zinc-950 font-sans">
      <div className="grid h-full grid-cols-2 gap-2.5 p-3 @2xl:grid-cols-4">
      {/* 1. Floating label */}
      <Tile label="Floating label" className="bg-white text-zinc-900">
        <div className="relative mt-2">
          <input
            id="fl-1"
            placeholder=" "
            className="peer h-11 w-full rounded-lg border border-zinc-300 bg-white px-3 pt-3 text-sm outline-none focus:border-indigo-500"
          />
          <label
            htmlFor="fl-1"
            className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm text-zinc-400 transition-all peer-focus:top-2.5 peer-focus:text-[10px] peer-focus:text-indigo-600 peer-[:not(:placeholder-shown)]:top-2.5 peer-[:not(:placeholder-shown)]:text-[10px]"
          >
            メールアドレス
          </label>
        </div>
      </Tile>

      {/* 2. Material outlined (notched) */}
      <Tile label="Outlined" className="bg-zinc-50 text-zinc-900">
        <div className="relative mt-2">
          <input
            id="fl-2"
            placeholder=" "
            defaultValue="山田 太郎"
            className="peer h-11 w-full rounded-md border border-zinc-400 bg-transparent px-3 text-sm outline-none focus:border-2 focus:border-violet-600"
          />
          <label
            htmlFor="fl-2"
            className="absolute -top-2 left-2 bg-zinc-50 px-1 text-[11px] text-zinc-500 transition-all peer-placeholder-shown:top-1/2 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:text-sm peer-focus:top-[-8px] peer-focus:translate-y-0 peer-focus:text-[11px] peer-focus:text-violet-600"
          >
            氏名
          </label>
        </div>
      </Tile>

      {/* 3. Filled */}
      <Tile label="Filled" className="bg-white text-zinc-900">
        <div className="group relative mt-2 rounded-t-md bg-zinc-100 transition hover:bg-zinc-200/70">
          <span className="block px-3 pt-1.5 text-[10px] text-zinc-500 group-focus-within:text-sky-600">ユーザー名</span>
          <input defaultValue="taro_dev" className="h-7 w-full bg-transparent px-3 pb-1.5 text-sm outline-none" />
          <span className="absolute inset-x-0 bottom-0 h-px bg-zinc-400" />
          <span className="absolute inset-x-0 bottom-0 h-0.5 origin-center scale-x-0 bg-sky-600 transition-transform duration-300 group-focus-within:scale-x-100" />
        </div>
      </Tile>

      {/* 4. Underline animated */}
      <Tile label="Underline" className="bg-[#f5efe6] text-stone-800">
        <div className="group relative mt-3">
          <input placeholder="お名前を入力" className="h-9 w-full bg-transparent font-serif text-base outline-none placeholder:text-stone-400" />
          <span className="absolute inset-x-0 bottom-0 h-px bg-stone-300" />
          <span className="absolute bottom-0 left-0 h-px w-full origin-left scale-x-0 bg-stone-900 transition-transform duration-500 ease-out group-focus-within:scale-x-100" />
        </div>
      </Tile>

      {/* 5. Glass */}
      <Tile label="Glass" className="bg-[radial-gradient(circle_at_20%_20%,#f472b6,transparent_50%),radial-gradient(circle_at_80%_80%,#6366f1,transparent_50%),#1e1b4b] text-white">
        <div className="mt-2 flex items-center gap-2 rounded-xl border border-white/30 bg-white/15 px-3 shadow-[inset_0_1px_0_rgba(255,255,255,.4)] backdrop-blur-md focus-within:bg-white/25">
          <Mail size={15} className="opacity-80" />
          <input placeholder="you@example.com" className="h-10 w-full bg-transparent text-sm outline-none placeholder:text-white/60" />
        </div>
      </Tile>

      {/* 6. Neumorphic */}
      <Tile label="Neumorphic" className="bg-[#e4e9f2] text-slate-600">
        <div className="mt-2 flex items-center gap-2 rounded-full bg-[#e4e9f2] px-4 shadow-[inset_4px_4px_8px_#c2c8d3,inset_-4px_-4px_8px_#ffffff]">
          <User size={15} />
          <input placeholder="ニックネーム" className="h-10 w-full bg-transparent text-sm outline-none placeholder:text-slate-400" />
        </div>
      </Tile>

      {/* 7. With icon + addon */}
      <Tile label="Addon" className="bg-zinc-900 text-zinc-100">
        <div className="mt-2 flex h-10 overflow-hidden rounded-lg border border-zinc-700 focus-within:border-emerald-500 focus-within:ring-4 focus-within:ring-emerald-500/15">
          <span className="grid place-items-center border-r border-zinc-700 bg-zinc-800 px-2.5 text-xs text-zinc-400">https://</span>
          <input defaultValue="my-site" className="w-full min-w-0 bg-transparent px-2 text-sm outline-none" />
          <span className="grid place-items-center px-2.5 text-xs text-zinc-500">.app</span>
        </div>
        <div className="flex items-center gap-1 text-[10px] text-emerald-400">
          <AtSign size={11} /> このURLは使用できます
        </div>
      </Tile>

      {/* 8. Search with kbd */}
      <Tile label="Search ⌘K" className="bg-zinc-900 text-zinc-100">
        <div className="mt-2 flex h-10 items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-800/60 px-3 focus-within:border-zinc-500">
          <Search size={15} className="text-zinc-500" />
          <input
            value={v}
            onChange={(e) => setV(e.target.value)}
            placeholder="ドキュメントを検索…"
            className="w-full min-w-0 bg-transparent text-sm outline-none placeholder:text-zinc-500"
          />
          {v ? (
            <button type="button" onClick={() => setV('')} className="text-[10px] text-zinc-400 hover:text-white">
              クリア
            </button>
          ) : (
            <kbd className="rounded border border-zinc-600 bg-zinc-700/50 px-1.5 py-0.5 font-mono text-[10px] text-zinc-400">⌘K</kbd>
          )}
        </div>
      </Tile>
      </div>
    </div>
  )
}
