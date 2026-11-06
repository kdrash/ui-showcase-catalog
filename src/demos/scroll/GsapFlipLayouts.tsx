import { useLayoutEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import { Flip } from 'gsap/Flip'
import { LayoutGrid, Layers, List } from 'lucide-react'
import { art } from '../_shared/art'

gsap.registerPlugin(Flip)

/**
 * GSAP Flip プラグインで「レイアウトの切替」と「タグ絞り込み」をなめらかに。
 * 1. 変更前に Flip.getState(要素) で位置・サイズを記録
 * 2. React の state を変えて DOM を新しいレイアウトに(非表示は display:none)
 * 3. useLayoutEffect で Flip.from(state, { absolute, onEnter, onLeave }) — 差分を逆算してアニメーション
 */

type Tag = 'Design' | 'Code' | 'Motion'
type Mode = 'grid' | 'list' | 'stack'
const ITEMS = Array.from({ length: 9 }, (_, i) => ({
  id: i,
  title: ['Aurora UI', 'Type System', 'Spring Lab', 'Grid Kit', 'API Docs', 'Loop Studio', 'Mono Icons', 'Edge Cache', 'Morph'][i],
  tag: (['Design', 'Code', 'Motion'] as Tag[])[i % 3],
  kind: (['gradient', 'geometric', 'landscape'] as const)[i % 3],
}))
const TAG_COLOR: Record<Tag, string> = { Design: 'bg-pink-500', Code: 'bg-sky-500', Motion: 'bg-amber-500' }

export function GsapFlipLayouts() {
  const root = useRef<HTMLDivElement>(null)
  const flipState = useRef<Flip.FlipState | null>(null)
  const [mode, setMode] = useState<Mode>('grid')
  const [filter, setFilter] = useState<Tag | 'All'>('All')

  const capture = () => {
    flipState.current = Flip.getState(root.current!.querySelectorAll('[data-flip-id]'))
  }

  useLayoutEffect(() => {
    const state = flipState.current
    if (!state) return
    flipState.current = null
    const tl = Flip.from(state, {
      duration: 0.7,
      ease: 'power3.inOut',
      absolute: true,
      stagger: 0.03,
      nested: true,
      onEnter: (els) => gsap.fromTo(els, { opacity: 0, scale: 0.6 }, { opacity: 1, scale: 1, duration: 0.6, delay: 0.15 }),
      onLeave: (els) => gsap.to(els, { opacity: 0, scale: 0.6, duration: 0.45 }),
    })
    return () => {
      tl.progress(1).kill()
    }
  }, [mode, filter])

  const visible = ITEMS.filter((it) => filter === 'All' || it.tag === filter)

  return (
    <div ref={root} className="relative flex h-full w-full flex-col overflow-hidden bg-[#0f1115] text-white">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 px-3 py-2 text-xs">
        <div className="flex gap-1">
          {(['All', 'Design', 'Code', 'Motion'] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => {
                capture()
                setFilter(t)
              }}
              className={`rounded-full px-3 py-1 transition ${filter === t ? 'bg-white text-zinc-900' : 'bg-white/5 text-zinc-400 hover:text-white'}`}
            >
              {t}
            </button>
          ))}
        </div>
        <div className="flex gap-1">
          {(
            [
              ['grid', LayoutGrid],
              ['list', List],
              ['stack', Layers],
            ] as const
          ).map(([m, Icon]) => (
            <button
              key={m}
              type="button"
              title={m}
              onClick={() => {
                capture()
                setMode(m)
              }}
              className={`rounded-lg p-1.5 transition ${mode === m ? 'bg-emerald-400 text-zinc-900' : 'bg-white/5 text-zinc-400 hover:text-white'}`}
            >
              <Icon size={15} />
            </button>
          ))}
        </div>
      </div>

      <div className="thin-scroll relative flex-1 overflow-y-auto p-3">
        <div
          className={
            mode === 'grid'
              ? 'grid grid-cols-3 gap-2.5'
              : mode === 'list'
                ? 'flex flex-col gap-2'
                : 'relative mx-auto mt-2 h-[220px] w-[200px]'
          }
        >
          {ITEMS.map((it) => {
            const vi = visible.indexOf(it)
            const shown = vi !== -1
            return (
              <div
                key={it.id}
                data-flip-id={`card-${it.id}`}
                style={
                  mode === 'stack'
                    ? { display: shown ? 'flex' : 'none', position: 'absolute', left: vi * 8, top: vi * 7, zIndex: 20 - vi, width: 170 }
                    : { display: shown ? 'flex' : 'none' }
                }
                className={`overflow-hidden rounded-xl border border-white/10 bg-zinc-800/80 shadow-lg shadow-black/40 ${
                  mode === 'list' ? 'flex-row items-center gap-3 p-2' : 'flex-col'
                }`}
              >
                <img
                  data-flip-id={`img-${it.id}`}
                  src={art(it.kind, it.id + 1, 320, 240)}
                  alt=""
                  className={mode === 'list' ? 'h-12 w-16 shrink-0 rounded-lg object-cover' : 'aspect-[4/3] w-full object-cover'}
                />
                <div className={mode === 'list' ? 'flex flex-1 items-center justify-between' : 'p-2'}>
                  <div className="text-[13px] font-semibold">{it.title}</div>
                  <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold ${TAG_COLOR[it.tag]}`}>{it.tag}</span>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
