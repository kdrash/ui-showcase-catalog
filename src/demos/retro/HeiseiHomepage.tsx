import { useEffect, useState, type CSSProperties, type ReactNode } from 'react'

/**
 * 平成初期(2000年前後)の個人ホームページ風。
 * - フレーム風の2カラム(左メニュー / 右メイン)、タイル壁紙、マーキー、点滅する NEW!
 * - キリ番アクセスカウンター(「F5で更新」で増え、77777 を踏むとお祝い)
 * - 工事中バナー、書き込める掲示板(BBS)、相互リンクの 88×31 バナー、Webリング
 */

const TILE = `url("data:image/svg+xml,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40"><rect width="40" height="40" fill="#fff0f8"/><text x="4" y="16" font-size="12" fill="#ffb3d9">♥</text><text x="24" y="36" font-size="11" fill="#b3d9ff">★</text></svg>`,
)}")`

const PAGES = ['TOP', 'プロフィール', '日記', '掲示板', 'リンク'] as const
type Page = (typeof PAGES)[number]

interface Post {
  name: string
  msg: string
  date: string
}
const INITIAL: Post[] = [
  { name: 'まりりん', msg: 'はじめまして♪ネットサーフィンしてたらたどり着きました!相互リンクお願いしてもいいですか?', date: '2001/08/15(水) 23:12' },
  { name: 'ひろ', msg: 'キリ番77777踏みそうで踏めない…(T_T) 日記更新がんばってください!', date: '2001/08/14(火) 01:48' },
]

function Counter({ n }: { n: number }) {
  return (
    <span className="inline-flex border-2 border-[#808080] border-t-[#404040] border-l-[#404040] bg-black p-[1px]">
      {String(n)
        .padStart(6, '0')
        .split('')
        .map((d, i) => (
          <span key={i} className="mx-[1px] w-[13px] bg-[#111] text-center font-[VT323] text-[18px] leading-[20px] text-[#39ff14] [text-shadow:0_0_4px_#39ff14]">
            {d}
          </span>
        ))}
    </span>
  )
}

export function HeiseiHomepage() {
  const [page, setPage] = useState<Page>('TOP')
  const [count, setCount] = useState(77772)
  const [posts, setPosts] = useState(INITIAL)
  const [name, setName] = useState('')
  const [msg, setMsg] = useState('')
  const [blink, setBlink] = useState(true)
  const kiriban = count === 77777

  useEffect(() => {
    const t = setInterval(() => setBlink((b) => !b), 450)
    return () => clearInterval(t)
  }, [])

  const now = () => {
    const d = new Date()
    const p = (n: number) => String(n).padStart(2, '0')
    return `2001/${p(d.getMonth() + 1)}/${p(d.getDate())}(${'日月火水木金土'[d.getDay()]}) ${p(d.getHours())}:${p(d.getMinutes())}`
  }

  const font: CSSProperties = { fontFamily: '"MS PGothic","MS UI Gothic","Osaka","Noto Sans JP",sans-serif' }
  const NEW = <span className="ml-1 text-[10px] font-bold text-red-600" style={{ visibility: blink ? 'visible' : 'hidden' }}>NEW!</span>

  const body: Record<Page, ReactNode> = {
    TOP: (
      <>
        <div className="text-center">
          <div
            className="inline-block bg-[linear-gradient(90deg,#ff0000,#ff9900,#ffee00,#33cc33,#3399ff,#9933ff)] bg-clip-text text-[22px] font-bold text-transparent italic"
            style={{ textShadow: '2px 2px 0 rgba(0,0,0,.08)' }}
          >
            ☆★ゆめみ堂へようこそ★☆
          </div>
          <div className="mt-1 text-[11px]">
            あなたは <Counter n={count} /> 人目のお客様です♪
          </div>
          <button
            onClick={() => setCount((c) => (c >= 77777 ? 77772 : c + 1))}
            className="mt-1 border-2 border-[#fff] border-r-[#808080] border-b-[#808080] bg-[#c0c0c0] px-2 text-[10px] text-black active:border-[#808080] active:border-r-white active:border-b-white"
          >
            F5で更新(訪問する)
          </button>
          {kiriban ? (
            <div className="mx-auto mt-2 w-fit animate-bounce border-2 border-dashed border-red-500 bg-yellow-200 px-3 py-1 text-[12px] font-bold text-red-600">
              🎉 キリ番 77777 GET!! おめでとう!掲示板に報告してね🎉
            </div>
          ) : (
            <div className="mt-1 text-[10px] text-[#ff3399]">※キリ番 77777 を踏んだ方は掲示板でご報告ください!踏み逃げ禁止!!</div>
          )}
        </div>
        <div className="mt-2 overflow-hidden border border-[#ff99cc] bg-white/80 py-[2px] text-[11px] text-[#cc0066]">
          <div className="hp-marquee whitespace-nowrap">★8/15 日記更新しました!★ 夏休みの絵日記つづいてます~ ★ リンクに3サイト追加! ★ 相互リンク随時募集中です(*^_^*) ★</div>
        </div>
        <div className="mt-2 flex items-center gap-2 border-2 border-black bg-[repeating-linear-gradient(45deg,#ffd400_0_10px,#111_10px_20px)] p-1">
          <div className="flex-1 bg-[#ffd400] px-2 py-1 text-center text-[13px] font-bold text-black">🚧 工事中 UNDER CONSTRUCTION 🚧</div>
        </div>
        <ul className="mt-2 space-y-[2px] text-[11px]">
          <li>
            ◆ 8/15 日記を更新 {NEW}
          </li>
          <li>◆ 8/10 プロフィールにバトンを追加</li>
          <li>◆ 8/01 サイト開設1周年!ありがとうございます♪</li>
        </ul>
      </>
    ),
    プロフィール: (
      <table className="w-full border-collapse text-[11px]" border={1} style={{ borderColor: '#ff99cc' }}>
        <tbody>
          {[
            ['HN', 'ゆめみ'],
            ['誕生日', '3月3日(うお座)'],
            ['血液型', 'A型'],
            ['好きなもの', 'プリクラ・MD・カラオケ・ポケベル'],
            ['よく聴く曲', 'J-POP全般♪ 着メロ作るのが趣味です'],
            ['ひとこと', 'このサイトは 800×600 / 文字サイズ「中」推奨です'],
          ].map(([k, v]) => (
            <tr key={k}>
              <th className="w-[90px] bg-[#ffccee] px-1 py-[2px] text-left">{k}</th>
              <td className="bg-white px-1 py-[2px]">{v}</td>
            </tr>
          ))}
        </tbody>
      </table>
    ),
    日記: (
      <div className="space-y-2 text-[11px]">
        {[
          ['8/15(水) 晴れ', '今日は友達と花火大会に行ってきた~!写メ撮りまくったけどパケ代がこわい(笑) 浴衣かわいいって言われてうれしかった(*ﾉωﾉ)'],
          ['8/12(日) くもり', 'ホームページのデザインをちょっと変えてみました。壁紙はハート柄にしたよ♪ 重かったらごめんなさい…'],
        ].map(([d, t]) => (
          <div key={d} className="border-l-4 border-[#ff66b3] bg-white/80 px-2 py-1">
            <b className="text-[#cc0066]">{d}</b>
            <p className="mt-0.5">{t}</p>
          </div>
        ))}
      </div>
    ),
    掲示板: (
      <div className="text-[11px]">
        <form
          className="mb-2 border border-[#999] bg-[#eee] p-1.5"
          onSubmit={(e) => {
            e.preventDefault()
            if (!msg.trim()) return
            setPosts((p) => [{ name: name.trim() || '名無しさん', msg: msg.trim(), date: now() }, ...p])
            setMsg('')
          }}
        >
          <div className="flex items-center gap-1">
            おなまえ
            <input value={name} onChange={(e) => setName(e.target.value)} className="w-24 border border-[#7a7a7a] bg-white px-1 text-black" />
          </div>
          <div className="mt-1 flex items-start gap-1">
            メッセージ
            <textarea value={msg} onChange={(e) => setMsg(e.target.value)} rows={2} className="flex-1 resize-none border border-[#7a7a7a] bg-white px-1 text-black" />
          </div>
          <div className="mt-1 text-right">
            <button className="border-2 border-white border-r-[#808080] border-b-[#808080] bg-[#c0c0c0] px-3 text-black">投稿する</button>
          </div>
        </form>
        {posts.map((p, i) => (
          <div key={i} className="mb-1.5 border border-dashed border-[#ff99cc] bg-white/90 px-1.5 py-1">
            <div className="text-[10px]">
              <b className="text-[#0066cc]">{p.name}</b> <span className="text-gray-500">{p.date}</span>
            </div>
            <div className="mt-0.5 break-all">{p.msg}</div>
          </div>
        ))}
      </div>
    ),
    リンク: (
      <div className="text-[11px]">
        <p className="mb-1">相互リンクしていただいているサイト様です♪ 当サイトのバナーはお持ち帰りOK!(直リン禁止)</p>
        <div className="flex flex-wrap gap-1.5">
          {[
            ['ねこ部屋', '#ff9966', '#fff'],
            ['星屑ノート', '#003399', '#ffee00'],
            ['DOT*WORLD', '#000', '#39ff14'],
            ['うさぎ堂', '#ffccee', '#cc0066'],
            ['MIDIの森', '#336633', '#ccffcc'],
            ['ゆめみ堂', '#ff66b3', '#fff'],
          ].map(([n, bg, fg]) => (
            <span key={n} className="grid h-[31px] w-[88px] place-items-center border border-black text-[10px] font-bold" style={{ background: bg, color: fg }}>
              {n}
            </span>
          ))}
        </div>
      </div>
    ),
  }

  return (
    <div className="relative flex h-full w-full overflow-hidden text-[#333]" style={{ ...font, backgroundImage: TILE }}>
      <style>{`.hp-marquee{display:inline-block;padding-left:100%;animation:hpMq 14s linear infinite}@keyframes hpMq{to{transform:translateX(-100%)}}`}</style>
      {/* 左フレーム */}
      <nav className="flex w-[118px] shrink-0 flex-col gap-1 overflow-auto border-r-4 border-double border-[#ff66b3] bg-[#ffe6f2]/90 p-2 text-[12px]">
        <div className="mb-1 text-center text-[11px] font-bold text-[#cc0066]">♪MENU♪</div>
        {PAGES.map((p) => (
          <button
            key={p}
            onClick={() => setPage(p)}
            className={`text-left text-[#0000ee] underline hover:text-[#ff0066] ${page === p ? 'font-bold text-[#551a8b]' : ''}`}
          >
            {page === p ? '▶' : '・'}
            {p}
            {p === '日記' && NEW}
          </button>
        ))}
        <div className="mt-auto space-y-1 text-center text-[9px] text-gray-600">
          <div className="border border-gray-400 bg-white py-[2px]">Since 2000.8.1</div>
          <div>Netscape / IE 両対応</div>
        </div>
      </nav>
      {/* 右フレーム */}
      <main className="thin-scroll flex min-w-0 flex-1 flex-col overflow-auto p-3">
        <div className="mb-2 border-b-2 border-dotted border-[#ff66b3] pb-1 text-[13px] font-bold text-[#cc0066]">♡ {page} ♡</div>
        <div className="flex-1">{body[page]}</div>
        {/* Webリング */}
        <div className="mt-3 border border-[#9999ff] bg-[#eef] p-1 text-center text-[10px]">
          <div className="font-bold text-[#333399]">★ 乙女なWebリング ★</div>
          <span className="text-[#0000ee] underline">←前のサイト</span> | <span className="text-[#0000ee] underline">ランダム</span> | <span className="text-[#0000ee] underline">次のサイト→</span> |{' '}
          <span className="text-[#0000ee] underline">参加サイト一覧</span>
        </div>
      </main>
    </div>
  )
}
