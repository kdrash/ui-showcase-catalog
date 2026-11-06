import { useEffect, useRef, useState } from 'react'

/**
 * 2000年代の折りたたみケータイ(ガラケー)風UI。
 * - 待受画面(アンテナ・電池・時計)→ メニュー(3×3 のドット絵アイコン、数字キーで直接ジャンプ)
 * - 受信BOX / メール閲覧 / 新規作成(数字キーのマルチタップでかな入力)/ ケータイWeb風ポータル
 * - 十字キー・決定・クリア・数字キーはクリック、またはフォーカス中のキーボードで操作
 */

const C: Record<string, string> = {
  k: '#111', w: '#fff', r: '#e11d48', o: '#f97316', y: '#facc15', g: '#22c55e', b: '#2563eb', c: '#22d3ee', p: '#f472b6', n: '#92400e', s: '#9ca3af', d: '#4b5563',
}
function Icon({ rows, size = 30 }: { rows: string[]; size?: number }) {
  return (
    <svg width={size} height={size} viewBox={`0 0 ${rows[0].length} ${rows.length}`} shapeRendering="crispEdges">
      {rows.flatMap((r, y) => [...r].map((ch, x) => (ch === '.' ? null : <rect key={`${x}${y}`} x={x} y={y} width={1} height={1} fill={C[ch]} />)))}
    </svg>
  )
}
const ICONS: Record<string, string[]> = {
  mail: ['..........', 'kkkkkkkkkk', 'kywwwwwwyk', 'kwywwwwywk', 'kwwywwywwk', 'kwwwyywwwk', 'kwwwwwwwwk', 'kwwwwwwwwk', 'kkkkkkkkkk', '..........'],
  web: ['...bbbb...', '..bccbbb..', '.bcccgbbb.', 'bccgggbccb', 'bcggggbccb', 'bccggbbbcb', 'bcccbbggcb', '.bccbgggb.', '..bccbbb..', '...bbbb...'],
  cam: ['..........', '...kkk....', 'kkkkkkkkkk', 'ksssssssrk', 'kssdddsssk', 'ksdcwcdssk', 'ksdcccdssk', 'kssdddsssk', 'kkkkkkkkkk', '..........'],
  box: ['..........', '.nnnn.....', 'nyyyyn....', 'nyyyyynnnn', 'nnnnnnnnnn', 'nyyyyyyyyn', 'nyyyyyyyyn', 'nyyyyyyyyn', 'nnnnnnnnnn', '..........'],
  note: ['......kk..', '.....kpk..', '.....kppk.', '.....k.kk.', '.....k....', '.....k....', '..kkkk....', '.kppppk...', '.kppppk...', '..kkkk....'],
  game: ['..........', '.kkkkkkkk.', 'kddddddddk', 'kdkddddrdk', 'kkkkddrdrk', 'kdkdddrddk', 'kddddddddk', '.kkkkkkkk.', '..........', '..........'],
  alarm: ['.kk....kk.', 'kyyk..kyyk', '.kkyyyykk.', '.kywwwwyk.', 'kywwkwwwyk', 'kywwkkkwyk', 'kywwwwwwyk', '.kywwwwyk.', '..kyyyyk..', '.k......k.'],
  book: ['..........', '.kkkkkkkk.', '.kggggggkk', '.kgwwwwgkw', '.kggggggkk', '.kgwwwwgkw', '.kggggggkk', '.kggggggkw', '.kkkkkkkk.', '..........'],
  gear: ['....ss....', '.s.ssss.s.', '..ssssss..', '.sssddsss.', 'sssd..dsss', 'sssd..dsss', '.sssddsss.', '..ssssss..', '.s.ssss.s.', '....ss....'],
  heart: ['.rr.rr.', 'rrrrrrr', 'rrrrrrr', '.rrrrr.', '..rrr..', '...r...'],
}
const MENU = [
  { k: 'mail', n: 'メール' },
  { k: 'web', n: 'ケータイWeb' },
  { k: 'cam', n: 'カメラ' },
  { k: 'box', n: 'データBOX' },
  { k: 'note', n: '着メロ' },
  { k: 'game', n: 'ゲーム' },
  { k: 'alarm', n: 'アラーム' },
  { k: 'book', n: '電話帳' },
  { k: 'gear', n: '設定' },
]
const MAILS = [
  { from: 'ゆうこ', sub: '明日のカラオケ♪', body: 'やほー!明日18時に駅前ね☆\n新曲いれとくから\nたのしみにしてて(^_^)v', unread: true },
  { from: 'お母さん', sub: 'Re:', body: '晩ごはんいるの?\n返事ちょうだい。', unread: false },
  { from: 'たけし', sub: '写メ見た?', body: 'こないだの花火の写メ\n送ったけど届いた??\nパケ代やばいw', unread: false },
]
const KANA: Record<string, string> = {
  '1': 'あいうえお', '2': 'かきくけこ', '3': 'さしすせそ', '4': 'たちつてと', '5': 'なにぬねの', '6': 'はひふへほ', '7': 'まみむめも', '8': 'やゆよ', '9': 'らりるれろ', '0': 'わをんー', '#': '、。?!',
}
const KEY_SUB: Record<string, string> = { '1': 'あ', '2': 'か ABC', '3': 'さ DEF', '4': 'た GHI', '5': 'な JKL', '6': 'は MNO', '7': 'ま PQRS', '8': 'や TUV', '9': 'ら WXYZ', '0': 'わ', '*': '゛゜', '#': '、。' }
const PORTAL = ['ニュース', '天気予報', '今日の占い', '着メロ取り放題', '待受画像', 'ゲーム']

type Scr = 'standby' | 'menu' | 'inbox' | 'mail' | 'compose' | 'portal' | 'page' | 'na'

export function GarakeiPhone() {
  const rootRef = useRef<HTMLDivElement>(null)
  const [scr, setScr] = useState<Scr>('standby')
  const [cur, setCur] = useState(0)
  const [mails, setMails] = useState(MAILS)
  const [mailIdx, setMailIdx] = useState(0)
  const [text, setText] = useState('')
  const [pending, setPending] = useState<{ key: string; i: number } | null>(null)
  const [loading, setLoading] = useState(false)
  const [now, setNow] = useState(() => new Date())
  const [blink, setBlink] = useState(true)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  useEffect(() => {
    const t = setInterval(() => {
      setNow(new Date())
      setBlink((b) => !b)
    }, 500)
    return () => {
      clearInterval(t)
      clearTimeout(timer.current)
    }
  }, [])

  const go = (s: Scr, c = 0) => {
    setScr(s)
    setCur(c)
  }
  // 変換中の文字は ref にも持ち、確定処理を一か所にまとめる(StrictMode の二重実行対策)
  const pendingRef = useRef<{ key: string; i: number } | null>(null)
  const setPend = (p: { key: string; i: number } | null) => {
    pendingRef.current = p
    setPending(p)
  }
  const commit = () => {
    const p = pendingRef.current
    if (p) setText((t) => t + KANA[p.key][p.i])
    setPend(null)
  }
  const openItem = (i: number) => {
    const k = MENU[i].k
    if (k === 'mail') go('inbox')
    else if (k === 'web') go('portal')
    else go('na', i)
  }
  const loadPage = (i: number) => {
    setLoading(true)
    go('page', i)
    setTimeout(() => setLoading(false), 700)
  }

  const key = (k: string) => {
    if (scr === 'compose') {
      if (KANA[k]) {
        clearTimeout(timer.current)
        const p = pendingRef.current
        if (p && p.key === k) setPend({ key: k, i: (p.i + 1) % KANA[k].length })
        else {
          commit()
          setPend({ key: k, i: 0 })
        }
        timer.current = setTimeout(commit, 1000)
        return
      }
      if (k === 'clr') {
        if (pendingRef.current) setPend(null)
        else if (text) setText((t) => t.slice(0, -1))
        else go('inbox')
        return
      }
      if (k === 'ok') {
        commit()
        return
      }
      if (k === 'right') return commit()
      return
    }
    switch (scr) {
      case 'standby':
        if (k === 'ok' || k === 'menu') go('menu')
        if (k === 'mailkey') go('inbox')
        if (k === 'webkey') go('portal')
        break
      case 'menu': {
        const d: Record<string, number> = { left: -1, right: 1, up: -3, down: 3 }
        if (k in d) setCur((c) => (c + d[k] + 9) % 9)
        if (/^[1-9]$/.test(k)) openItem(+k - 1)
        if (k === 'ok') openItem(cur)
        if (k === 'clr') go('standby')
        break
      }
      case 'inbox':
        if (k === 'up') setCur((c) => (c + mails.length - 1) % mails.length)
        if (k === 'down') setCur((c) => (c + 1) % mails.length)
        if (k === 'ok') {
          setMailIdx(cur)
          setMails((m) => m.map((x, i) => (i === cur ? { ...x, unread: false } : x)))
          go('mail')
        }
        if (k === 'menu') {
          setText('')
          go('compose')
        }
        if (k === 'clr') go('menu', 0)
        break
      case 'mail':
        if (k === 'clr' || k === 'ok') go('inbox', mailIdx)
        break
      case 'portal':
        if (k === 'up') setCur((c) => (c + PORTAL.length - 1) % PORTAL.length)
        if (k === 'down') setCur((c) => (c + 1) % PORTAL.length)
        if (/^[1-6]$/.test(k)) loadPage(+k - 1)
        if (k === 'ok') loadPage(cur)
        if (k === 'clr') go('menu', 1)
        break
      case 'page':
        if (k === 'clr' || k === '0') go('portal', cur)
        break
      case 'na':
        if (k === 'clr' || k === 'ok') go('menu', cur)
        break
    }
  }

  const onKeyDown = (e: React.KeyboardEvent) => {
    const map: Record<string, string> = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right', Enter: 'ok', Escape: 'clr', Backspace: 'clr' }
    const k = map[e.key] ?? (/^[0-9*#]$/.test(e.key) ? e.key : null)
    if (k) {
      e.preventDefault()
      key(k)
    }
  }

  const unread = mails.filter((m) => m.unread).length
  const hh = String(now.getHours()).padStart(2, '0')
  const mm = String(now.getMinutes()).padStart(2, '0')
  const wd = '日月火水木金土'[now.getDay()]
  const softL = scr === 'inbox' ? '新規' : scr === 'compose' ? '送信' : 'メニュー'
  const softR = scr === 'standby' ? 'Web' : 'クリア'

  const title = (t: string, color = '#1d4ed8') => (
    <div className="px-1.5 py-[2px] text-[10px] font-bold text-white" style={{ background: `linear-gradient(${color}, #0b1f66)` }}>
      {t}
    </div>
  )

  return (
    <div
      ref={rootRef}
      tabIndex={0}
      onKeyDown={onKeyDown}
      onPointerDown={() => rootRef.current?.focus()}
      className="relative flex h-full w-full items-center justify-center gap-6 overflow-hidden bg-[radial-gradient(circle_at_70%_10%,#fbcfe8,#c4b5fd_45%,#6d28d9)] outline-none select-none"
      style={{ fontFamily: '"Noto Sans JP", sans-serif' }}
    >
      <div className="flex flex-col items-center">
        {/* 上半分(ディスプレイ) */}
        <div className="relative rounded-t-[28px] rounded-b-[8px] bg-[linear-gradient(160deg,#f5f5f5,#c9ccd3_40%,#9aa0aa)] px-3 pt-4 pb-3 shadow-[0_8px_20px_rgba(0,0,0,.35),inset_0_2px_0_#fff]">
          <div className="mx-auto mb-2 h-[4px] w-10 rounded-full bg-[#55565c]" />
          <div className="relative h-[200px] w-[164px] overflow-hidden rounded-[3px] border-[3px] border-[#1f2937] bg-white text-[10px] leading-[1.35] text-[#111]">
            {/* ステータスバー */}
            <div className="flex h-[13px] items-center gap-1 bg-[#e5e7eb] px-1 text-[8px]">
              <span className="flex items-end gap-[1px]">
                {[3, 5, 7].map((h) => (
                  <i key={h} className="block w-[2px] bg-black" style={{ height: h }} />
                ))}
              </span>
              <span className="font-bold">3G</span>
              {unread > 0 && <Icon rows={ICONS.mail} size={10} />}
              <span className="ml-auto">{hh}:{mm}</span>
              <span className="ml-1 inline-flex h-[7px] w-[13px] items-center border border-black p-[1px]">
                <i className="block h-full w-[70%] bg-[#16a34a]" />
              </span>
            </div>

            {scr === 'standby' && (
              <div className="relative h-[calc(100%-13px)] overflow-hidden bg-[linear-gradient(#1e3a8a,#7c3aed_55%,#f472b6)] text-white">
                {Array.from({ length: 16 }, (_, i) => (
                  <i key={i} className="absolute block h-[2px] w-[2px] bg-white" style={{ left: (i * 37) % 160, top: (i * 23) % 90, opacity: (i + (blink ? 1 : 0)) % 3 ? 0.9 : 0.2 }} />
                ))}
                <div className="absolute inset-x-0 top-[38px] text-center font-[Orbitron] text-[34px] font-bold tracking-wider drop-shadow-[0_2px_0_rgba(0,0,0,.4)]">
                  {hh}
                  <span style={{ opacity: blink ? 1 : 0.2 }}>:</span>
                  {mm}
                </div>
                <div className="absolute inset-x-0 top-[84px] text-center text-[11px]">
                  {now.getMonth() + 1}/{now.getDate()}({wd})
                </div>
                {unread > 0 && (
                  <div className="absolute inset-x-3 top-[112px] flex items-center gap-1 rounded bg-white/90 px-1.5 py-1 text-[9px] text-[#be185d]">
                    <Icon rows={ICONS.mail} size={12} /> 新着メール {unread}件
                  </div>
                )}
                <div className="absolute bottom-[3px] left-1/2 -translate-x-1/2 opacity-80">
                  <Icon rows={ICONS.heart} size={12} />
                </div>
              </div>
            )}

            {scr === 'menu' && (
              <div>
                {title(`${cur + 1}. ${MENU[cur].n}`)}
                <div className="grid grid-cols-3 gap-[2px] p-[3px]">
                  {MENU.map((m, i) => (
                    <button
                      key={m.k}
                      onClick={() => (cur === i ? openItem(i) : setCur(i))}
                      className={`relative flex h-[47px] flex-col items-center justify-center rounded-[3px] ${cur === i ? 'bg-[#fed7aa] ring-2 ring-[#f97316]' : ''}`}
                    >
                      <span className="absolute top-[1px] left-[3px] text-[7px] text-gray-500">{i + 1}</span>
                      <Icon rows={ICONS[m.k]} size={cur === i ? 30 : 26} />
                      <span className="mt-[1px] text-[7.5px] leading-none">{m.n}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {scr === 'inbox' && (
              <div>
                {title('受信BOX', '#db2777')}
                {mails.map((m, i) => (
                  <div key={i} className={`flex items-center gap-1 border-b border-dashed border-gray-300 px-1 py-[3px] ${cur === i ? 'bg-[#fbcfe8]' : ''}`} onClick={() => setCur(i)}>
                    <Icon rows={ICONS.mail} size={12} />
                    <div className="min-w-0">
                      <div className={`truncate ${m.unread ? 'font-bold' : ''}`}>{m.from}</div>
                      <div className="truncate text-[8.5px] text-gray-500">{m.sub}</div>
                    </div>
                    {m.unread && <span className="ml-auto text-[7px] font-bold text-red-600">未読</span>}
                  </div>
                ))}
              </div>
            )}

            {scr === 'mail' && (
              <div>
                {title(mails[mailIdx].sub, '#db2777')}
                <div className="border-b border-gray-300 px-1 py-[2px] text-[8.5px] text-gray-600">From: {mails[mailIdx].from}</div>
                <div className="px-1.5 py-1 whitespace-pre-wrap">{mails[mailIdx].body}</div>
                <div className="flex justify-center gap-1 py-1">
                  {[0, 1, 2].map((i) => (
                    <Icon key={i} rows={ICONS.heart} size={10} />
                  ))}
                </div>
              </div>
            )}

            {scr === 'compose' && (
              <div>
                {title('新規作成', '#db2777')}
                <div className="border-b border-gray-300 px-1 py-[2px] text-[8.5px] text-gray-600">宛先: ゆうこ</div>
                <div className="min-h-[80px] px-1.5 py-1 break-all">
                  {text}
                  {pending && <span className="bg-[#2563eb] text-white">{KANA[pending.key][pending.i]}</span>}
                  <span style={{ opacity: blink ? 1 : 0 }}>|</span>
                </div>
                <div className="mx-1 rounded bg-gray-100 px-1 py-[2px] text-[7.5px] text-gray-500">数字キーを連打でかな入力(2を3回=く)/ クリアで1文字削除</div>
              </div>
            )}

            {scr === 'portal' && (
              <div className="bg-[#eff6ff]">
                <div className="bg-[linear-gradient(#f97316,#c2410c)] px-1 py-1 text-center text-[11px] font-bold text-white">ケータイWeb</div>
                <div className="bg-[#fde68a] px-1 text-[8px]">★今日のおすすめ★ 冬の新作待受</div>
                {PORTAL.map((p, i) => (
                  <div key={p} onClick={() => loadPage(i)} className={`px-1 py-[2px] ${cur === i ? 'bg-[#bfdbfe]' : ''}`}>
                    <span className="mr-1 inline-block w-[11px] rounded-[2px] bg-[#1d4ed8] text-center text-[8px] text-white">{i + 1}</span>
                    <span className="text-[#1d4ed8] underline">{p}</span>
                  </div>
                ))}
              </div>
            )}

            {scr === 'page' && (
              <div className="h-full bg-white">
                {loading ? (
                  <div className="grid h-[170px] place-items-center text-[9px] text-gray-600">
                    <div className="text-center">
                      <div className="mb-1 flex justify-center gap-[2px]">
                        {[0, 1, 2, 3, 4].map((i) => (
                          <i key={i} className="block h-[6px] w-[6px] bg-[#f97316]" style={{ opacity: (i + (blink ? 1 : 0)) % 2 ? 1 : 0.3 }} />
                        ))}
                      </div>
                      通信中…
                    </div>
                  </div>
                ) : (
                  <>
                    {title(PORTAL[cur], '#ea580c')}
                    <div className="px-1.5 py-1 text-[9px] whitespace-pre-line">
                      {cur === 1 ? '東京 ☀ 晴れ 18℃/9℃\n降水確率 10%' : cur === 2 ? 'てんびん座 ★★★★☆\nラッキーカラー:ピンク' : '最新情報をお届け!\n毎日更新中♪'}
                      <div className="mt-2 text-[#1d4ed8] underline">[0] 戻る</div>
                    </div>
                  </>
                )}
              </div>
            )}

            {scr === 'na' && (
              <div className="grid h-[calc(100%-13px)] place-items-center bg-gray-50 text-center text-[9px]">
                <div>
                  <div className="mb-2 flex justify-center">
                    <Icon rows={ICONS[MENU[cur].k]} size={44} />
                  </div>
                  {MENU[cur].n}
                  <br />
                  <span className="text-gray-500">デモでは起動できません</span>
                </div>
              </div>
            )}

            {/* ソフトキー表示 */}
            <div className="absolute inset-x-0 bottom-0 flex h-[13px] items-center justify-between bg-[#111827] px-1.5 text-[8px] text-white">
              <span>{softL}</span>
              <span className="rounded-sm bg-white/20 px-1">決定</span>
              <span>{softR}</span>
            </div>
          </div>
        </div>
        {/* ヒンジ */}
        <div className="h-[10px] w-[150px] rounded-full bg-[linear-gradient(#6b7280,#d1d5db,#6b7280)]" />
        {/* 下半分(キー) */}
        <div className="rounded-t-[8px] rounded-b-[26px] bg-[linear-gradient(160deg,#f5f5f5,#c9ccd3_40%,#9aa0aa)] px-3 pt-2 pb-3 shadow-[0_8px_20px_rgba(0,0,0,.35)]">
          <div className="flex items-center justify-between gap-1">
            <div className="flex flex-col gap-1">
              <PhoneKey label="✉" sub={softL} onClick={() => key(scr === 'standby' ? 'mailkey' : 'menu')} />
              <PhoneKey label="📞" color="#16a34a" onClick={() => key('ok')} />
            </div>
            <div className="relative h-[64px] w-[64px] rounded-full bg-[linear-gradient(#e5e7eb,#9ca3af)] shadow-[inset_0_2px_0_#fff,0_2px_3px_rgba(0,0,0,.4)]">
              {(
                [
                  ['up', 'left-1/2 top-[2px] -translate-x-1/2', '▲'],
                  ['down', 'left-1/2 bottom-[2px] -translate-x-1/2', '▼'],
                  ['left', 'top-1/2 left-[2px] -translate-y-1/2', '◀'],
                  ['right', 'top-1/2 right-[2px] -translate-y-1/2', '▶'],
                ] as const
              ).map(([k, cls, ch]) => (
                <button key={k} onClick={() => key(k)} className={`absolute h-[18px] w-[18px] text-[8px] text-gray-600 active:text-black ${cls}`} aria-label={k}>
                  {ch}
                </button>
              ))}
              <button
                onClick={() => key('ok')}
                className="absolute top-1/2 left-1/2 h-[26px] w-[26px] -translate-1/2 rounded-full bg-[linear-gradient(#fdba74,#ea580c)] text-[7px] font-bold text-white shadow-[inset_0_1px_0_rgba(255,255,255,.6)] active:brightness-90"
              >
                決定
              </button>
            </div>
            <div className="flex flex-col gap-1">
              <PhoneKey label="Web" sub={softR} onClick={() => key(scr === 'standby' ? 'webkey' : 'clr')} />
              <PhoneKey label="⏻" color="#dc2626" onClick={() => go('standby')} />
            </div>
          </div>
          <div className="mt-2 grid grid-cols-3 gap-[4px]">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '0', '#'].map((k) => (
              <button
                key={k}
                onClick={() => key(k)}
                className="flex h-[22px] w-[48px] items-center justify-center gap-1 rounded-[10px] bg-[linear-gradient(#ffffff,#d4d4d8)] shadow-[0_1px_2px_rgba(0,0,0,.45)] active:translate-y-[1px] active:brightness-90"
              >
                <span className="text-[12px] font-bold text-gray-800">{k}</span>
                <span className="text-[6.5px] leading-none text-gray-500">{KEY_SUB[k]}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className="hidden max-w-[150px] text-[10px] leading-relaxed text-white/90 sm:block">
        <div className="mb-1 text-[12px] font-bold">操作</div>
        矢印 = 十字キー
        <br />
        Enter = 決定 / Esc = クリア
        <br />
        数字キーでメニュー直接選択
        <br />
        受信BOX →「新規」でかな入力
      </div>
    </div>
  )
}

function PhoneKey({ label, sub, color, onClick }: { label: string; sub?: string; color?: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex h-[22px] w-[44px] items-center justify-center rounded-[8px] bg-[linear-gradient(#ffffff,#d4d4d8)] text-[9px] font-bold shadow-[0_1px_2px_rgba(0,0,0,.45)] active:translate-y-[1px]"
      style={{ color: color ?? '#374151' }}
      title={sub}
    >
      {label}
    </button>
  )
}
