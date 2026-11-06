import { useState } from 'react'

/**
 * 昭和レトロな純喫茶のメニューUI。
 * - クリーム色×焦げ茶の配色、ホーロー看板風の見出し、ネオン管の「営業中」(ちらつき)
 * - カテゴリータブ、点線リーダー付きの品書き、タップで伝票に追加、合計とお会計スタンプ
 */

const MENU = {
  珈琲: [
    ['ブレンド珈琲', 350, '自家焙煎・ネルドリップ'],
    ['炭火焼珈琲', 400, '深煎り・苦味しっかり'],
    ['ウインナー珈琲', 450, 'たっぷりの生クリーム'],
    ['アイス珈琲', 400, 'ガムシロップ付き'],
  ],
  軽食: [
    ['ナポリタン', 650, '鉄板で熱々・粉チーズ付き'],
    ['ミックスサンド', 600, '玉子・ハム・きゅうり'],
    ['ピザトースト', 550, '厚切り食パン'],
    ['カレーライス', 700, '福神漬け付き'],
  ],
  甘味: [
    ['プリン・ア・ラ・モード', 750, '固めのプリンと季節の果物'],
    ['ホットケーキ', 500, 'バターとメープル'],
    ['チョコレートパフェ', 680, 'ウエハース添え'],
  ],
  クリームソーダ: [
    ['メロン', 550, 'さくらんぼ付き'],
    ['いちご', 550, 'さくらんぼ付き'],
    ['ブルーハワイ', 580, 'さくらんぼ付き'],
  ],
} as const
type Cat = keyof typeof MENU
const CAT_COLOR: Record<Cat, string> = { 珈琲: '#7c2d12', 軽食: '#b91c1c', 甘味: '#be185d', クリームソーダ: '#15803d' }
const SODA: Record<string, string> = { メロン: '#22c55e', いちご: '#f472b6', ブルーハワイ: '#38bdf8' }

const mincho = { fontFamily: '"Yu Mincho","YuMincho","Hiragino Mincho ProN","Noto Serif JP",serif' }

function EnamelSign({ text, color }: { text: string; color: string }) {
  return (
    <div
      className="relative inline-flex items-center rounded-[10px] px-5 py-1.5 text-[18px] font-black tracking-[.2em] text-white"
      style={{
        ...mincho,
        background: `linear-gradient(160deg, ${color}, ${color} 60%, rgba(0,0,0,.25))`,
        boxShadow: `inset 0 0 0 3px #fffbeb, inset 0 0 0 5px ${color}, 0 3px 0 rgba(0,0,0,.25)`,
      }}
    >
      {[
        'left-1.5 top-1.5',
        'right-1.5 top-1.5',
        'left-1.5 bottom-1.5',
        'right-1.5 bottom-1.5',
      ].map((p) => (
        <i key={p} className={`absolute ${p} h-[5px] w-[5px] rounded-full bg-[radial-gradient(circle_at_30%_30%,#fff,#a8a29e)]`} />
      ))}
      <span className="pointer-events-none absolute inset-x-3 top-1 h-1/3 rounded-full bg-white/15" />
      {text}
    </div>
  )
}

function SodaGlass({ color }: { color: string }) {
  return (
    <svg width="44" height="66" viewBox="0 0 44 66">
      <circle cx="31" cy="7" r="4.5" fill="#dc2626" />
      <path d="M31 7 Q 30 1 36 0" stroke="#166534" strokeWidth="1.2" fill="none" />
      <ellipse cx="22" cy="15" rx="12" ry="7" fill="#fffbeb" />
      <path d="M8 16 L12 52 Q22 56 32 52 L36 16 Z" fill={color} opacity=".9" />
      {[[16, 30], [26, 38], [20, 44], [28, 26]].map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="1.6" fill="#fff" opacity=".7" />
      ))}
      <path d="M12 52 Q22 56 32 52 L30 60 Q22 62 14 60 Z" fill="#e7e5e4" />
      <rect x="15" y="60" width="14" height="4" rx="2" fill="#d6d3d1" />
      <path d="M11 18 L14 50" stroke="#fff" strokeWidth="2" opacity=".5" />
      <line x1="27" y1="2" x2="20" y2="40" stroke="#ef4444" strokeWidth="1.6" />
    </svg>
  )
}

export function ShowaKissaten() {
  const [cat, setCat] = useState<Cat>('珈琲')
  const [order, setOrder] = useState<Record<string, number>>({})
  const [paid, setPaid] = useState(false)

  const all = Object.values(MENU).flat() as unknown as [string, number, string][]
  const price = (name: string) => all.find((m) => m[0] === name)?.[1] ?? 0
  const lines = Object.entries(order).filter(([, n]) => n > 0)
  const total = lines.reduce((a, [n, q]) => a + price(n) * q, 0)

  const add = (name: string) => {
    setPaid(false)
    setOrder((o) => ({ ...o, [name]: (o[name] ?? 0) + 1 }))
  }

  return (
    <div
      className="relative flex h-full w-full gap-3 overflow-hidden p-3 text-[#3b2414]"
      style={{
        background:
          'repeating-linear-gradient(90deg, #5b3a1e 0 38px, #4a2e17 38px 40px, #643f1f 40px 78px, #4a2e17 78px 80px)',
      }}
    >
      <style>{`
        @keyframes skFlicker { 0%,19%,21%,60%,62%,100% { opacity: 1 } 20%,61% { opacity: .35 } }
        .sk-neon { animation: skFlicker 4s infinite; }
      `}</style>
      {/* メニュー板 */}
      <div
        className="relative flex min-w-0 flex-1 flex-col rounded-[6px] p-3"
        style={{
          background: 'radial-gradient(circle at 30% 20%, #fffbeb, #fef3c7 60%, #f5e1b8)',
          boxShadow: 'inset 0 0 0 3px #fef3c7, inset 0 0 0 5px #7c2d12, inset 0 0 0 7px #fef3c7, inset 0 0 0 8px #7c2d12, 0 8px 20px rgba(0,0,0,.5)',
        }}
      >
        <div className="flex items-center justify-between">
          <div style={mincho}>
            <div className="text-[10px] tracking-[.4em] text-[#9a3412]">SINCE 昭和四十八年</div>
            <div className="text-[22px] leading-tight font-black tracking-[.15em]">純喫茶 ゆうやけ</div>
          </div>
          <div
            className="sk-neon rounded-[8px] border border-[#3f1d0b] bg-[#1c0f08] px-2.5 py-1 text-[16px] font-bold tracking-[.2em] text-[#fff1f2]"
            style={{ ...mincho, textShadow: '0 0 4px #fff, 0 0 10px #ff2d95, 0 0 20px #ff2d95, 0 0 30px #ff2d95' }}
          >
            営業中
          </div>
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {(Object.keys(MENU) as Cat[]).map((c) => (
            <button
              key={c}
              onClick={() => setCat(c)}
              className={`rounded-full border-2 px-3 py-[1px] text-[12px] font-bold transition ${cat === c ? 'text-[#fffbeb]' : 'bg-transparent'}`}
              style={{ ...mincho, borderColor: CAT_COLOR[c], background: cat === c ? CAT_COLOR[c] : undefined, color: cat === c ? undefined : CAT_COLOR[c] }}
            >
              {c}
            </button>
          ))}
        </div>
        <div className="mt-2">
          <EnamelSign text={cat} color={CAT_COLOR[cat]} />
        </div>
        <ul className="thin-scroll mt-2 flex-1 space-y-1.5 overflow-auto pr-1" style={mincho}>
          {(MENU[cat] as unknown as [string, number, string][]).map(([name, yen, note]) => (
            <li key={name}>
              <button onClick={() => add(name)} className="group flex w-full items-center gap-2 rounded px-1 text-left hover:bg-[#7c2d12]/10">
                {cat === 'クリームソーダ' && <SodaGlass color={SODA[name]} />}
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-1 text-[14px] font-bold">
                    <span className="shrink-0">{cat === 'クリームソーダ' ? `クリームソーダ(${name})` : name}</span>
                    <span className="mx-1 flex-1 border-b-2 border-dotted border-[#7c2d12]/50" />
                    <span className="shrink-0 tabular-nums">¥{yen}</span>
                  </div>
                  <div className="text-[10.5px] text-[#78350f]/80">{note}</div>
                </div>
                <span className="rounded-full border border-[#7c2d12] px-1.5 text-[10px] opacity-0 transition group-hover:opacity-100">追加</span>
              </button>
            </li>
          ))}
        </ul>
      </div>

      {/* 伝票 */}
      <div
        className="relative flex w-[150px] shrink-0 rotate-[1.5deg] flex-col self-start px-2.5 pt-2 pb-3 shadow-[0_8px_16px_rgba(0,0,0,.45)]"
        style={{
          background: 'repeating-linear-gradient(#fefce8 0 19px, #86b98a 19px 20px)',
          backgroundPositionY: 6,
          minHeight: '70%',
          maxHeight: '100%',
          fontFamily: '"Klee One","Yu Gothic","Noto Sans JP",sans-serif',
        }}
      >
        <div className="mx-auto -mt-1 mb-1 h-2 w-10 rounded-b bg-[#a8a29e]" />
        <div className="border-b-2 border-[#15803d] pb-0.5 text-center text-[13px] font-bold tracking-[.3em] text-[#15803d]">御 伝 票</div>
        <div className="mt-1 flex justify-between text-[9px] text-[#15803d]">
          <span>卓 No.3</span>
          <span>2名様</span>
        </div>
        <div className="thin-scroll mt-1 flex-1 overflow-auto text-[11.5px] leading-[20px] text-[#1e3a8a]">
          {lines.length === 0 && <div className="text-[#78716c]">← 品書きを押すと追加</div>}
          {lines.map(([n, q]) => (
            <div key={n} className="flex items-center justify-between gap-1">
              <button onClick={() => setOrder((o) => ({ ...o, [n]: o[n] - 1 }))} className="truncate text-left" title="1つ減らす">
                {n.replace('クリームソーダ', 'ソーダ')}
              </button>
              <span className="shrink-0 tabular-nums">×{q}</span>
            </div>
          ))}
        </div>
        <div className="mt-1 border-t-2 border-double border-[#15803d] pt-0.5 text-right text-[14px] font-bold text-[#1e3a8a] tabular-nums">計 ¥{total.toLocaleString()}</div>
        <button
          disabled={!total}
          onClick={() => {
            setPaid(true)
            setTimeout(() => setOrder({}), 1400)
          }}
          className="mt-1.5 rounded border border-[#7c2d12] bg-[#7c2d12] py-0.5 text-[11px] font-bold text-[#fffbeb] disabled:opacity-40"
          style={mincho}
        >
          お会計
        </button>
        {paid && (
          <div
            className="pointer-events-none absolute top-1/3 left-1/2 grid h-16 w-16 -translate-x-1/2 rotate-[-14deg] place-items-center rounded-full border-[3px] border-[#dc2626] text-[13px] font-black text-[#dc2626] opacity-85"
            style={{ ...mincho, animation: 'skStamp .25s ease-out' }}
          >
            <style>{`@keyframes skStamp { from { transform: translateX(-50%) rotate(-14deg) scale(2); opacity: 0 } }`}</style>
            済
            <span className="-mt-3 text-[8px]">毎度あり</span>
          </div>
        )}
      </div>
    </div>
  )
}
