import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import {
  ArrowDown,
  ArrowUp,
  AtSign,
  BellOff,
  Bold,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleCheck,
  CircleDot,
  CircleX,
  Clock,
  Code,
  Copy,
  CornerDownRight,
  Download,
  Ellipsis,
  Hand,
  Hash,
  Headphones,
  Italic,
  Lamp,
  Leaf,
  Link2,
  List,
  ListOrdered,
  Lock,
  Menu,
  MessageSquareText,
  Mic,
  MicOff,
  Moon,
  Pencil,
  PhoneOff,
  Pin,
  PinOff,
  Plus,
  RotateCw,
  Search,
  SendHorizontal,
  Shapes,
  Slash,
  Smile,
  SmilePlus,
  SquareCode,
  SquarePen,
  Strikethrough,
  Trash2,
  Type,
  X,
} from 'lucide-react'
import {
  createContext,
  Fragment,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  type KeyboardEvent as RKeyboardEvent,
  type ReactNode,
  type RefObject,
} from 'react'
import { Art, AvatarArt, FileGlyph, UnfurlThumb, WorkspaceLogo } from './TeamChat.art'
import {
  AMBIENT,
  AUTO_REPLIES,
  BASE_NOW,
  CHANNEL_BY_ID,
  CHANNELS,
  EMOJI_CATS,
  EMOJI_NAME,
  INITIAL_MENTIONS,
  INITIAL_PRESENCE,
  INITIAL_UNREAD,
  SEED,
  SLASH_COMMANDS,
  TEAM,
  USERS,
  type Attachment,
  type Channel,
  type ChannelId,
  type Msg,
  type Presence,
  type UserId,
} from './TeamChat.data'

/**
 * Slack / Discord 風のチームチャット。サービス名「Tsudoi」・会社「ミナモ工房」・メンバー・会話・画像はすべて架空のオリジナル。
 * - ルートを @container/app にして、768px〜 はワークスペースレール + サイドバー + 本文、1024px〜 はスレッドを右の常設パネルにする。
 *   狭い幅ではサイドバー(レールごと)がハンバーガーから出るドロワーになり、スレッドは本文の上に全面で重なる
 * - 状態はメッセージ・未読数・メンション数・トピックを useReducer でまとめ、スレッドの返信も同じ関数(mapMsg)で更新する。
 *   チャンネルを開くと未読数ぶん手前に「新着」の線を引き、その位置までスクロール。線が画面外に出ると上部に「新着へジャンプ」のピル
 * - 本文は自前の小さなパーサで *太字* _斜体_ ~取り消し~ `コード` ```コードブロック``` ・箇条書き・URL・@メンション・#チャンネルを描画。
 *   コードブロックは正規表現だけの簡易シンタックスハイライトとコピーボタン付き。リンクプレビュー・ファイル・画像・CI カードも表示
 * - ホバー(またはフォーカス)でツールバー: クイックリアクション・絵文字ピッカー・スレッド返信・編集・その他メニュー(ピン留め/未読にする/削除)。
 *   リアクションは押すたびにトグルし、件数は Motion で縦に入れ替わる
 * - 入力欄は書式ツールバー(選択範囲をマークで囲む)・@メンション補完・スラッシュコマンド(/shrug /topic /huddle /remind /away)・絵文字。
 *   Enter 送信 / Shift+Enter 改行、IME 変換中の Enter は送らない。空欄で ↑ を押すと自分の直前の発言を編集
 * - 台本タイマーでメンバーが「入力中…」になってから発言し、リアクション・スレッド返信・DM・CI 通知が時間差で届く。自分の発言にも誰かが返信する。
 *   別チャンネルの DM / メンションは右上の通知トーストで知らせ、サイドバーの未読は太字とバッジで示す
 * - ハドル(音声通話)は開始・参加・ミュート・退出ができ、サイドバー下部のミニバーに経過時間と話している人のリングを表示
 * - キー操作はデモ内にフォーカスがあるときだけ: Esc でポップオーバー → スレッド → ドロワーの順に閉じる、Alt+↑↓ でチャンネル移動。
 *   useReducedMotion 時はスライドや跳ねる動きをやめて短いフェードにし、入力中のドットやハドルのリングも止める
 */

/* ───────────── 型 ───────────── */

type ImageAtt = Extract<Attachment, { type: 'image' }>

type Overlay =
  | { kind: 'emoji'; anchor: HTMLElement; forId?: string; align?: 'start' | 'end'; onPick: (e: string) => void }
  | { kind: 'more'; anchor: HTMLElement; forId: string; ch: ChannelId; id: string; inThread: boolean }
  | { kind: 'members'; anchor: HTMLElement }
  | { kind: 'pinned'; anchor: HTMLElement }
  | { kind: 'status'; anchor: HTMLElement }
  | { kind: 'profile'; anchor: HTMLElement; user: UserId }

interface Divider {
  ch: ChannelId
  id: string
  count: number
  ts: number
}

interface HuddleState {
  start: number
  people: UserId[]
}

type Toast =
  | { id: string; kind: 'info'; text: string; action?: { label: string; fn: () => void } }
  | { id: string; kind: 'notif'; ch: ChannelId; from: UserId; text: string }

interface Api {
  reduce: boolean
  rootRef: RefObject<HTMLDivElement | null>
  presence: Record<UserId, Presence>
  active: ChannelId
  overlay: Overlay | null
  editing: string | null
  flash: string | null
  recent: string[]
  huddles: Partial<Record<ChannelId, HuddleState>>
  myHuddle: ChannelId | null
  muted: boolean
  openChannel: (id: ChannelId, focus?: boolean) => void
  openThread: (ch: ChannelId, id: string) => void
  react: (ch: ChannelId, id: string, emoji: string) => void
  openOverlay: (o: Overlay) => void
  closeOverlay: (refocus?: boolean) => void
  pickedEmoji: (e: string) => void
  setEditing: (id: string | null) => void
  saveEdit: (ch: ChannelId, id: string, text: string) => void
  removeMsg: (ch: ChannelId, id: string) => void
  showImage: (a: ImageAtt) => void
  toast: (text: string, action?: { label: string; fn: () => void }) => void
  jumpTo: (ch: ChannelId, id: string, parent?: string) => void
  joinHuddle: (ch: ChannelId) => void
  leaveHuddle: () => void
  setMuted: (m: boolean) => void
  setMyPresence: (p: Presence) => void
}

const Ctx = createContext<Api | null>(null)
const useApi = () => useContext(Ctx)!

/* ───────────── ユーティリティ ───────────── */

const pad = (n: number) => String(n).padStart(2, '0')
const fmtTime = (ts: number) => {
  const d = new Date(ts)
  return `${d.getHours()}:${pad(d.getMinutes())}`
}
const dayKey = (ts: number) => {
  const d = new Date(ts)
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
}
const WEEK = '日月火水木金土'
const dayLabel = (ts: number) => {
  const a = new Date(ts)
  a.setHours(0, 0, 0, 0)
  const b = new Date(BASE_NOW)
  b.setHours(0, 0, 0, 0)
  const diff = Math.round((b.getTime() - a.getTime()) / 864e5)
  if (diff <= 0) return '今日'
  if (diff === 1) return '昨日'
  return `${a.getMonth() + 1}月${a.getDate()}日（${WEEK[a.getDay()]}）`
}
const fullDate = (ts: number) => {
  const d = new Date(ts)
  return `${d.getMonth() + 1}月${d.getDate()}日（${WEEK[d.getDay()]}） ${fmtTime(ts)}`
}
let seq = 0
const uid = () => `n${Date.now().toString(36)}${(seq++).toString(36)}`
const pick = <T,>(a: readonly T[]) => a[Math.floor(Math.random() * a.length)]
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v))
const mentionsMe = (t: string) => /@凪|@channel|@here/.test(t)
const san = (u: UserId) => (USERS[u].app ? USERS[u].short : `${USERS[u].short}さん`)

/* ───────────── 状態(reducer) ───────────── */

interface ChatState {
  msgs: Record<ChannelId, Msg[]>
  unread: Partial<Record<ChannelId, number>>
  mentions: Partial<Record<ChannelId, number>>
  topics: Record<ChannelId, string>
}

type Action =
  | { t: 'post'; ch: ChannelId; msg: Msg; active: ChannelId }
  | { t: 'reply'; ch: ChannelId; parent: string; msg: Msg; broadcast?: boolean }
  | { t: 'react'; ch: ChannelId; id: string; emoji: string; user: UserId; add?: boolean }
  | { t: 'edit'; ch: ChannelId; id: string; text: string }
  | { t: 'delete'; ch: ChannelId; id: string }
  | { t: 'restore'; ch: ChannelId; msg: Msg; index: number; parent?: string }
  | { t: 'pin'; ch: ChannelId; id: string }
  | { t: 'read'; ch: ChannelId }
  | { t: 'topic'; ch: ChannelId; topic: string }

function mapMsg(list: Msg[], id: string, fn: (m: Msg) => Msg | null): Msg[] {
  const out: Msg[] = []
  for (const m of list) {
    if (m.id === id) {
      const n = fn(m)
      if (n) out.push(n)
    } else if (m.replies?.some((r) => r.id === id)) {
      out.push({ ...m, replies: mapMsg(m.replies, id, fn) })
    } else out.push(m)
  }
  return out
}

function findMsg(list: Msg[], id: string): { msg: Msg; parent?: Msg } | null {
  for (const m of list) {
    if (m.id === id) return { msg: m }
    const r = m.replies?.find((x) => x.id === id)
    if (r) return { msg: r, parent: m }
  }
  return null
}

function initState(): ChatState {
  return {
    msgs: { ...SEED },
    unread: { ...INITIAL_UNREAD, dev: 0 },
    mentions: { ...INITIAL_MENTIONS, dev: 0 },
    topics: Object.fromEntries(CHANNELS.map((c) => [c.id, c.topic])) as Record<ChannelId, string>,
  }
}

function reducer(s: ChatState, a: Action): ChatState {
  switch (a.t) {
    case 'post': {
      const c = CHANNEL_BY_ID[a.ch]
      const other = a.ch !== a.active && a.msg.author !== 'me' && a.msg.kind !== 'ephemeral'
      return {
        ...s,
        msgs: { ...s.msgs, [a.ch]: [...s.msgs[a.ch], a.msg] },
        unread: other ? { ...s.unread, [a.ch]: (s.unread[a.ch] ?? 0) + 1 } : s.unread,
        mentions: other && (c.kind !== 'channel' || mentionsMe(a.msg.text)) ? { ...s.mentions, [a.ch]: (s.mentions[a.ch] ?? 0) + 1 } : s.mentions,
      }
    }
    case 'reply': {
      let list = mapMsg(s.msgs[a.ch], a.parent, (m) => ({ ...m, replies: [...(m.replies ?? []), a.msg] }))
      if (a.broadcast) list = [...list, { ...a.msg, id: `${a.msg.id}-b`, broadcast: true, parent: a.parent, reactions: [] }]
      return { ...s, msgs: { ...s.msgs, [a.ch]: list } }
    }
    case 'react':
      return {
        ...s,
        msgs: {
          ...s.msgs,
          [a.ch]: mapMsg(s.msgs[a.ch], a.id, (m) => {
            const ex = m.reactions.find((r) => r.emoji === a.emoji)
            if (!ex) return { ...m, reactions: [...m.reactions, { emoji: a.emoji, users: [a.user] }] }
            if (ex.users.includes(a.user)) {
              if (a.add) return m
              return {
                ...m,
                reactions: m.reactions.map((r) => (r === ex ? { ...r, users: r.users.filter((u) => u !== a.user) } : r)).filter((r) => r.users.length > 0),
              }
            }
            return { ...m, reactions: m.reactions.map((r) => (r === ex ? { ...r, users: [...r.users, a.user] } : r)) }
          }),
        },
      }
    case 'edit':
      return { ...s, msgs: { ...s.msgs, [a.ch]: mapMsg(s.msgs[a.ch], a.id, (m) => ({ ...m, text: a.text, edited: true })) } }
    case 'delete':
      return { ...s, msgs: { ...s.msgs, [a.ch]: mapMsg(s.msgs[a.ch], a.id, () => null) } }
    case 'restore': {
      if (a.parent) {
        return {
          ...s,
          msgs: {
            ...s.msgs,
            [a.ch]: mapMsg(s.msgs[a.ch], a.parent, (m) => {
              const r = [...(m.replies ?? [])]
              r.splice(a.index, 0, a.msg)
              return { ...m, replies: r }
            }),
          },
        }
      }
      const list = [...s.msgs[a.ch]]
      list.splice(a.index, 0, a.msg)
      return { ...s, msgs: { ...s.msgs, [a.ch]: list } }
    }
    case 'pin':
      return { ...s, msgs: { ...s.msgs, [a.ch]: mapMsg(s.msgs[a.ch], a.id, (m) => ({ ...m, pinned: !m.pinned })) } }
    case 'read':
      return { ...s, unread: { ...s.unread, [a.ch]: 0 }, mentions: { ...s.mentions, [a.ch]: 0 } }
    case 'topic':
      return { ...s, topics: { ...s.topics, [a.ch]: a.topic } }
  }
}

/* ───────────── リッチテキスト ───────────── */

const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const MENTION_NAMES = [...TEAM.map((u) => USERS[u].short), 'channel', 'here'].sort((a, b) => b.length - a.length)
const CH_NAMES = CHANNELS.filter((c) => c.kind === 'channel')
  .map((c) => c.name)
  .sort((a, b) => b.length - a.length)
const INLINE = new RegExp(
  [
    '(`[^`\\n]+`)',
    '((?<![\\w\\\\*])\\*(?=\\S)[^*\\n]*?\\S\\*(?![\\w*]))',
    '((?<![\\w\\\\])_(?=\\S)[^_\\n]*?\\S_(?!\\w))',
    '((?<![\\w\\\\])~(?=\\S)[^~\\n]*?\\S~(?!\\w))',
    '(https?://[^\\s<>()（）]+)',
    `(@(?:${MENTION_NAMES.map(esc).join('|')}))`,
    `(#(?:${CH_NAMES.map(esc).join('|')}))`,
  ].join('|'),
  'g',
)
const FENCE = /```(\w*)\n?([\s\S]*?)```/g
const SHORT_TO_USER = Object.fromEntries(TEAM.map((u) => [USERS[u].short, u])) as Record<string, UserId>
const NAME_TO_CH = Object.fromEntries(CHANNELS.map((c) => [c.name, c.id])) as Record<string, ChannelId>

function Inline({ text }: { text: string }) {
  const api = useApi()
  const out: ReactNode[] = []
  let last = 0
  let k = 0
  for (const mm of text.matchAll(INLINE)) {
    const i = mm.index ?? 0
    if (i > last) out.push(text.slice(last, i))
    const [s, code, bold, ital, strike, url, men, chn] = mm
    if (code) {
      out.push(
        <code key={k++} className="rounded-[4px] border border-[#e8dcd8] bg-[#faf5f3] px-1 py-px font-mono text-[0.86em] text-[#c2412d]">
          {code.slice(1, -1)}
        </code>,
      )
    } else if (bold) out.push(<strong key={k++} className="font-bold">{bold.slice(1, -1)}</strong>)
    else if (ital) out.push(<em key={k++}>{ital.slice(1, -1)}</em>)
    else if (strike) out.push(<s key={k++}>{strike.slice(1, -1)}</s>)
    else if (url) {
      out.push(
        <a
          key={k++}
          href={url}
          onClick={(e) => {
            e.preventDefault()
            api.toast('デモのためリンクは開きません')
          }}
          className="break-all text-[var(--link)] hover:underline focus-visible:rounded focus-visible:outline-2 focus-visible:outline-[var(--acc)]"
        >
          {url}
        </a>,
      )
    } else if (men) {
      const name = men.slice(1)
      const u = SHORT_TO_USER[name]
      const me = u === 'me' || name === 'channel' || name === 'here'
      const cls = `rounded-[4px] px-0.5 font-medium ${me ? 'bg-[#fde8a6] text-[#7a5200]' : 'bg-[#e4f0ff] text-[#1260b8] hover:bg-[#d3e6ff]'}`
      out.push(
        u && u !== 'me' ? (
          <button key={k++} type="button" className={cls} onClick={(e) => api.openOverlay({ kind: 'profile', anchor: e.currentTarget, user: u })}>
            {men}
          </button>
        ) : (
          <span key={k++} className={cls}>
            {men}
          </span>
        ),
      )
    } else if (chn) {
      const id = NAME_TO_CH[chn.slice(1)]
      out.push(
        <button key={k++} type="button" onClick={() => api.openChannel(id, true)} className="rounded-[4px] bg-[#e4f0ff] px-0.5 font-medium text-[#1260b8] hover:bg-[#d3e6ff]">
          {chn}
        </button>,
      )
    }
    last = i + s.length
  }
  if (last < text.length) out.push(text.slice(last))
  return <>{out}</>
}

const CODE_RE =
  /(\/\/.*$)|('(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*"|`(?:[^`\\]|\\.)*`)|\b(const|let|var|function|return|if|else|new|await|async|import|from|export|type|interface)\b|\b(\d+(?:\.\d+)?)\b|([A-Za-z_$][\w$]*)(?=\()/gm

function highlight(src: string) {
  const out: ReactNode[] = []
  let last = 0
  let k = 0
  for (const mm of src.matchAll(CODE_RE)) {
    const i = mm.index ?? 0
    if (i > last) out.push(src.slice(last, i))
    const [s, com, str, kw, num, fn] = mm
    const cls = com ? 'italic text-[#7d8b8f]' : str ? 'text-[#2f8a55]' : kw ? 'text-[#8a3fc7]' : num ? 'text-[#c2611d]' : fn ? 'text-[#1f63b8]' : ''
    out.push(
      <span key={k++} className={cls}>
        {s}
      </span>,
    )
    last = i + s.length
  }
  if (last < src.length) out.push(src.slice(last))
  return out
}

function CodeBlock({ lang, src }: { lang: string; src: string }) {
  const api = useApi()
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(src)
    } catch {
      /* クリップボード不可の環境でも表示だけは切り替える */
    }
    setCopied(true)
    api.toast('コードをコピーしました')
    window.setTimeout(() => setCopied(false), 1400)
  }
  return (
    <div className="group/code relative my-1 max-w-full overflow-hidden rounded-lg border border-[var(--line)] bg-[#f8f9f9]">
      <div className="flex items-center justify-between border-b border-[var(--line)] px-3 py-1 text-[11px] text-[var(--sub)]">
        <span className="font-mono">{lang || 'code'}</span>
        <button
          type="button"
          onClick={copy}
          aria-label="コードをコピー"
          className="flex items-center gap-1 rounded px-1.5 py-0.5 hover:bg-black/5 focus-visible:outline-2 focus-visible:outline-[var(--acc)]"
        >
          {copied ? <Check size={12} /> : <Copy size={12} />}
          {copied ? 'コピー済み' : 'コピー'}
        </button>
      </div>
      <pre className="tc-scroll overflow-x-auto px-3 py-2 font-mono text-[12.5px] leading-[1.6] text-[#24323a]">
        <code>{highlight(src.replace(/\n$/, ''))}</code>
      </pre>
    </div>
  )
}

const isBlockLine = (l: string) => /^([-•・] |\d+[.)] |> )/.test(l)

function Para({ text }: { text: string }) {
  const lines = text.replace(/^\n+|\n+$/g, '').split('\n')
  if (lines.length === 1 && lines[0] === '') return null
  const blocks: ReactNode[] = []
  let i = 0
  let k = 0
  while (i < lines.length) {
    const l = lines[i]
    if (/^[-•・] /.test(l)) {
      const items: string[] = []
      while (i < lines.length && /^[-•・] /.test(lines[i])) items.push(lines[i++].slice(2))
      blocks.push(
        <ul key={k++} className="my-0.5 list-disc space-y-0.5 pl-5 marker:text-[var(--sub)]">
          {items.map((t, j) => (
            <li key={j}>
              <Inline text={t} />
            </li>
          ))}
        </ul>,
      )
      continue
    }
    if (/^\d+[.)] /.test(l)) {
      const items: string[] = []
      while (i < lines.length && /^\d+[.)] /.test(lines[i])) items.push(lines[i++].replace(/^\d+[.)] /, ''))
      blocks.push(
        <ol key={k++} className="my-0.5 list-decimal space-y-0.5 pl-5 marker:text-[var(--sub)]">
          {items.map((t, j) => (
            <li key={j}>
              <Inline text={t} />
            </li>
          ))}
        </ol>,
      )
      continue
    }
    if (/^> /.test(l)) {
      const items: string[] = []
      while (i < lines.length && /^> /.test(lines[i])) items.push(lines[i++].slice(2))
      blocks.push(
        <blockquote key={k++} className="my-0.5 border-l-[3px] border-[#cfd6d8] pl-3 text-[#4d5a60]">
          {items.map((t, j) => (
            <Fragment key={j}>
              {j > 0 && <br />}
              <Inline text={t} />
            </Fragment>
          ))}
        </blockquote>,
      )
      continue
    }
    const para: string[] = []
    while (i < lines.length && !isBlockLine(lines[i])) para.push(lines[i++])
    blocks.push(
      <p key={k++}>
        {para.map((t, j) => (
          <Fragment key={j}>
            {j > 0 && <br />}
            <Inline text={t} />
          </Fragment>
        ))}
      </p>,
    )
  }
  return <>{blocks}</>
}

function RichText({ text }: { text: string }) {
  const parts: ReactNode[] = []
  let last = 0
  let k = 0
  for (const mm of text.matchAll(FENCE)) {
    const i = mm.index ?? 0
    if (i > last) parts.push(<Para key={k++} text={text.slice(last, i)} />)
    parts.push(<CodeBlock key={k++} lang={mm[1]} src={mm[2]} />)
    last = i + mm[0].length
  }
  if (last < text.length) parts.push(<Para key={k++} text={text.slice(last)} />)
  return <>{parts}</>
}

/** 検索結果などで使う、記法を外した平文 */
const plain = (t: string) => t.replace(/```\w*\n?/g, '').replace(/[*_~`]/g, '').replace(/\n+/g, ' ')

/* ───────────── 小さな部品 ───────────── */

function PresenceDot({ p, size = 10, ring = 'var(--side)' }: { p: Presence; size?: number; ring?: string }) {
  const base = 'absolute -right-0.5 -bottom-0.5 rounded-full'
  const style = { width: size, height: size, boxShadow: `0 0 0 2px ${ring}` }
  if (p === 'active') return <span className={`${base} bg-[#2bac76]`} style={style} />
  if (p === 'dnd')
    return (
      <span className={`${base} grid place-items-center bg-[#e0503c]`} style={style}>
        <span className="block h-[1.5px] w-[55%] rounded bg-white" />
      </span>
    )
  return <span className={`${base} border-[1.5px] ${p === 'away' ? 'border-[#c3a14a] bg-[#fdf3d4]' : 'border-[#8d9aa0] bg-transparent'}`} style={{ ...style, background: p === 'away' ? undefined : ring }} />
}

const PRESENCE_LABEL: Record<Presence, string> = { active: 'アクティブ', away: '離席中', dnd: '通知を一時停止中', offline: 'オフライン' }

function Avatar({ id, size = 36, presence, ring }: { id: UserId; size?: number; presence?: Presence; ring?: string }) {
  return (
    <span className="relative inline-block shrink-0 align-middle" style={{ width: size, height: size }}>
      <AvatarArt user={USERS[id]} size={size} className="block" />
      {presence && <PresenceDot p={presence} size={Math.max(8, Math.round(size * 0.36))} ring={ring} />}
    </span>
  )
}

function IconBtn({
  label,
  onClick,
  children,
  className = '',
  pressed,
  dark,
}: {
  label: string
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void
  children: ReactNode
  className?: string
  pressed?: boolean
  dark?: boolean
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      aria-pressed={pressed}
      onClick={onClick}
      className={`grid size-8 shrink-0 place-items-center rounded-md transition-colors focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--acc)] ${
        dark ? 'text-[var(--side-sub)] hover:bg-white/10 hover:text-white' : 'text-[#5b676d] hover:bg-[#eef1f2] hover:text-[#1c2326]'
      } ${pressed ? (dark ? 'bg-white/15 text-white' : 'bg-[#e3f1ee] text-[var(--acc)]') : ''} ${className}`}
    >
      {children}
    </button>
  )
}

function ChannelGlyph({ c, size = 15, presence }: { c: Channel; size?: number; presence?: Presence }) {
  if (c.dm) return <Avatar id={c.dm} size={size + 3} presence={presence} ring="var(--ring, var(--side))" />
  if (c.private) return <Lock size={size - 1} strokeWidth={2.4} className="shrink-0" />
  return <Hash size={size} strokeWidth={2.4} className="shrink-0" />
}

function TypingDots({ reduce }: { reduce: boolean }) {
  return (
    <span className="inline-flex items-end gap-[3px] pb-[3px]" aria-hidden>
      {[0, 1, 2].map((i) => (
        <span key={i} className={`size-[4px] rounded-full bg-current ${reduce ? 'opacity-60' : 'tc-dot'}`} style={{ animationDelay: `${i * 0.16}s` }} />
      ))}
    </span>
  )
}

/* ───────────── 添付 ───────────── */

function Attachments({ files }: { files: Attachment[] }) {
  const api = useApi()
  return (
    <div className="mt-1.5 flex flex-col gap-1.5">
      {files.map((f, i) =>
        f.type === 'image' ? (
          <div key={i} className="max-w-full" style={{ width: Math.min(f.w, 360) }}>
            <button
              type="button"
              onClick={() => api.showImage(f)}
              aria-label={`${f.name} を拡大表示`}
              className="group/img relative block w-full overflow-hidden rounded-lg border border-[var(--line)] bg-[#f3f5f5] transition-shadow hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--acc)]"
              style={{ aspectRatio: `${f.w} / ${f.h}` }}
            >
              <Art kind={f.art} />
              <span className="absolute top-1.5 right-1.5 rounded-md bg-black/55 px-1.5 py-0.5 text-[10px] text-white opacity-0 transition-opacity group-hover/img:opacity-100">
                クリックで拡大
              </span>
            </button>
            <div className="mt-0.5 truncate text-[11px] text-[var(--sub)]">{f.name}</div>
          </div>
        ) : (
          <div key={i} className="flex w-full max-w-[380px] items-center gap-3 rounded-lg border border-[var(--line)] bg-white p-2.5 shadow-[0_1px_0_rgba(0,0,0,0.03)]">
            <FileGlyph ext={f.ext} />
            <div className="min-w-0 flex-1">
              <div className="truncate text-[13px] font-semibold text-[#1c2326]">{f.name}</div>
              <div className="text-[11px] text-[var(--sub)]">
                {f.ext.toUpperCase()} · {f.size}
              </div>
            </div>
            <IconBtn label={`${f.name} をダウンロード`} onClick={() => api.toast(`「${f.name}」をダウンロードしました（デモ）`)}>
              <Download size={16} />
            </IconBtn>
          </div>
        ),
      )}
    </div>
  )
}

function UnfurlCard({ u }: { u: NonNullable<Msg['unfurl']> }) {
  const api = useApi()
  return (
    <div className="mt-1.5 flex max-w-[460px] gap-3 border-l-[3px] py-0.5 pl-3" style={{ borderColor: u.color }}>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 text-[12px] font-semibold text-[#3d494e]">
          <span className="size-3 rounded-[3px]" style={{ background: u.color }} />
          {u.site}
        </div>
        <button type="button" onClick={() => api.toast('デモのためリンクは開きません')} className="mt-0.5 text-left text-[14px] font-bold text-[var(--link)] hover:underline">
          {u.title}
        </button>
        <p className="mt-0.5 text-[13px] leading-snug text-[#4d5a60]">{u.desc}</p>
        {u.meta && (
          <p className="mt-1 inline-flex items-center gap-1.5 rounded-full bg-[#e7f5ee] px-2 py-0.5 font-mono text-[11px] text-[#23774f]">
            <span className="size-1.5 rounded-full bg-[#2f9e6b]" />
            {u.meta}
          </p>
        )}
      </div>
      {u.thumb && (
        <div className="hidden h-[72px] w-[96px] shrink-0 overflow-hidden rounded-md border border-[var(--line)] @sm:block">
          <UnfurlThumb kind={u.thumb} />
        </div>
      )}
    </div>
  )
}

function CiCardView({ ci }: { ci: NonNullable<Msg['ci']> }) {
  const api = useApi()
  const ok = ci.status === 'success'
  return (
    <div className="mt-1.5 max-w-[440px] overflow-hidden rounded-lg border border-[var(--line)] bg-white">
      <div className="flex">
        <div className="w-1 shrink-0" style={{ background: ok ? '#2bac76' : '#e0503c' }} />
        <div className="min-w-0 flex-1 p-3">
          <div className="flex items-center gap-1.5 text-[13.5px] font-bold">
            {ok ? <CircleCheck size={16} className="text-[#2bac76]" /> : <CircleX size={16} className="text-[#e0503c]" />}
            {ci.title}
            <span className={`ml-1 rounded px-1.5 py-px text-[10.5px] font-semibold ${ok ? 'bg-[#e4f6ec] text-[#1f7a4f]' : 'bg-[#fde8e4] text-[#b8321f]'}`}>{ok ? '成功' : '失敗'}</span>
          </div>
          <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-[12px]">
            <dt className="text-[var(--sub)]">ブランチ</dt>
            <dd className="truncate font-mono">{ci.branch}</dd>
            <dt className="text-[var(--sub)]">コミット</dt>
            <dd className="truncate font-mono">{ci.commit}</dd>
            <dt className="text-[var(--sub)]">所要時間</dt>
            <dd>{ci.duration}</dd>
          </dl>
          {ci.note && <p className="mt-1.5 text-[12px] font-medium text-[#b8321f]">{ci.note}</p>}
          <div className="mt-2.5 flex gap-1.5">
            <button
              type="button"
              onClick={() => api.toast('ビルドログはデモでは開けません')}
              className="rounded-md border border-[#cfd6d8] px-2.5 py-1 text-[12px] font-semibold hover:bg-[#f3f5f5] focus-visible:outline-2 focus-visible:outline-[var(--acc)]"
            >
              ログを見る
            </button>
            {!ok && (
              <button
                type="button"
                onClick={() => api.toast('再実行をキューに追加しました')}
                className="flex items-center gap-1 rounded-md border border-[#cfd6d8] px-2.5 py-1 text-[12px] font-semibold hover:bg-[#f3f5f5] focus-visible:outline-2 focus-visible:outline-[var(--acc)]"
              >
                <RotateCw size={12} /> 再実行
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

/* ───────────── メッセージ ───────────── */

function Reactions({ ch, msg }: { ch: ChannelId; msg: Msg }) {
  const api = useApi()
  if (msg.reactions.length === 0) return null
  return (
    <div className="mt-1 flex flex-wrap items-center gap-1">
      <AnimatePresence initial={false} mode="popLayout">
        {msg.reactions.map((r) => {
          const mine = r.users.includes('me')
          const names = r.users.map((u) => (u === 'me' ? 'あなた' : USERS[u].short)).join('、')
          return (
            <motion.button
              key={r.emoji}
              type="button"
              layout={!api.reduce}
              initial={api.reduce ? { opacity: 0 } : { opacity: 0, scale: 0.6 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={api.reduce ? { opacity: 0 } : { opacity: 0, scale: 0.6 }}
              transition={api.reduce ? { duration: 0.12 } : { type: 'spring', stiffness: 520, damping: 28 }}
              whileTap={api.reduce ? undefined : { scale: 0.88 }}
              onClick={() => api.react(ch, msg.id, r.emoji)}
              aria-pressed={mine}
              aria-label={`${r.emoji} ${r.users.length}件 ${mine ? '（押すと取り消し）' : ''}`}
              title={`${names} が ${EMOJI_NAME[r.emoji] ?? r.emoji} でリアクションしました`}
              className={`flex h-6 items-center gap-1 rounded-full border px-2 text-[12px] transition-colors focus-visible:outline-2 focus-visible:outline-[var(--acc)] ${
                mine ? 'border-[#5fb7a6] bg-[#e3f4f0] text-[#0f6b5e]' : 'border-[#e3e7e9] bg-[#f4f6f7] text-[#3d494e] hover:border-[#c9d1d4] hover:bg-white'
              }`}
            >
              <span className="text-[14px] leading-none">{r.emoji}</span>
              <span className="relative inline-block min-w-[0.6em] overflow-hidden text-center font-semibold tabular-nums">
                <AnimatePresence initial={false} mode="popLayout">
                  <motion.span
                    key={r.users.length}
                    className="inline-block"
                    initial={api.reduce ? { opacity: 0 } : { y: 10, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={api.reduce ? { opacity: 0 } : { y: -10, opacity: 0 }}
                    transition={{ duration: api.reduce ? 0.1 : 0.22 }}
                  >
                    {r.users.length}
                  </motion.span>
                </AnimatePresence>
              </span>
            </motion.button>
          )
        })}
      </AnimatePresence>
      <button
        type="button"
        aria-label="リアクションを追加"
        onClick={(e) => api.openOverlay({ kind: 'emoji', anchor: e.currentTarget, forId: msg.id, onPick: (em) => api.react(ch, msg.id, em) })}
        className="grid h-6 w-8 place-items-center rounded-full border border-transparent bg-[#f4f6f7] text-[#6b777d] opacity-0 transition hover:border-[#c9d1d4] hover:bg-white group-hover/msg:opacity-100 focus-visible:opacity-100 focus-visible:outline-2 focus-visible:outline-[var(--acc)]"
      >
        <SmilePlus size={14} />
      </button>
    </div>
  )
}

function ThreadSummary({ ch, msg }: { ch: ChannelId; msg: Msg }) {
  const api = useApi()
  const replies = msg.replies ?? []
  if (!replies.length) return null
  const people = [...new Set(replies.map((r) => r.author))].slice(0, 4)
  const lastTs = replies[replies.length - 1].ts
  return (
    <button
      type="button"
      onClick={() => api.openThread(ch, msg.id)}
      className="group/th mt-1 flex max-w-[460px] items-center gap-2 rounded-lg border border-transparent py-1 pr-2 pl-1 text-left transition-colors hover:border-[var(--line)] hover:bg-white focus-visible:outline-2 focus-visible:outline-[var(--acc)]"
    >
      <span className="flex -space-x-1">
        {people.map((p) => (
          <span key={p} className="rounded-[6px] ring-2 ring-white">
            <Avatar id={p} size={20} />
          </span>
        ))}
      </span>
      <motion.span key={replies.length} initial={api.reduce ? false : { scale: 1.12 }} animate={{ scale: 1 }} className="text-[12.5px] font-bold text-[var(--link)]">
        {replies.length}件の返信
      </motion.span>
      <span className="text-[12px] text-[var(--sub)] group-hover/th:hidden">最終返信 {fmtTime(lastTs)}</span>
      <span className="hidden text-[12px] text-[var(--sub)] group-hover/th:inline">スレッドを表示</span>
      <ChevronRight size={14} className="ml-auto hidden text-[var(--sub)] group-hover/th:block" />
    </button>
  )
}

function EditBox({ initial, onSave, onCancel }: { initial: string; onSave: (t: string) => void; onCancel: () => void }) {
  const [v, setV] = useState(initial)
  const ref = useRef<HTMLTextAreaElement>(null)
  useLayoutEffect(() => {
    const ta = ref.current
    if (!ta) return
    ta.style.height = 'auto'
    ta.style.height = `${Math.min(ta.scrollHeight, 220)}px`
  }, [v])
  useEffect(() => {
    const ta = ref.current
    if (!ta) return
    ta.focus({ preventScroll: true })
    ta.setSelectionRange(ta.value.length, ta.value.length)
  }, [])
  return (
    <div className="mt-1 rounded-lg border border-[#9fb9b4] bg-white p-2 shadow-[0_0_0_3px_rgba(18,122,108,0.12)]">
      <textarea
        ref={ref}
        value={v}
        aria-label="メッセージを編集"
        onChange={(e) => setV(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            e.stopPropagation()
            onCancel()
          } else if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing && e.keyCode !== 229) {
            e.preventDefault()
            if (v.trim()) onSave(v.trim())
          }
        }}
        className="tc-scroll block w-full resize-none bg-transparent text-[14.5px] leading-[1.55] outline-none"
        rows={1}
      />
      <div className="mt-2 flex items-center justify-end gap-2 text-[12px]">
        <span className="mr-auto text-[var(--sub)]">Esc でキャンセル · Enter で保存</span>
        <button type="button" onClick={onCancel} className="rounded-md border border-[#cfd6d8] px-3 py-1 font-semibold hover:bg-[#f3f5f5] focus-visible:outline-2 focus-visible:outline-[var(--acc)]">
          キャンセル
        </button>
        <button
          type="button"
          onClick={() => v.trim() && onSave(v.trim())}
          className="rounded-md bg-[var(--acc)] px-3 py-1 font-semibold text-white hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--acc)]"
        >
          保存
        </button>
      </div>
    </div>
  )
}

const QUICK = ['✅', '👀', '🙌']

function MessageRow({ ch, msg, compact, inThread }: { ch: ChannelId; msg: Msg; compact: boolean; inThread: boolean }) {
  const api = useApi()
  const u = USERS[msg.author]
  const own = msg.author === 'me'
  const editing = api.editing === msg.id
  const forMe = !own && msg.kind !== 'system' && mentionsMe(msg.text)
  const toolbarPinned = api.overlay && 'forId' in api.overlay && api.overlay.forId === msg.id

  const onKeyDown = (e: RKeyboardEvent<HTMLDivElement>) => {
    if (e.target !== e.currentTarget) return
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault()
      const rows = [...(e.currentTarget.closest('[data-msglist]')?.querySelectorAll<HTMLElement>('[data-mid]') ?? [])]
      const i = rows.indexOf(e.currentTarget)
      rows[clamp(i + (e.key === 'ArrowDown' ? 1 : -1), 0, rows.length - 1)]?.focus({ preventScroll: false })
    } else if (e.key === 't' && !inThread && !msg.kind) {
      e.preventDefault()
      api.openThread(ch, msg.id)
    } else if (e.key === 'e' && own && !msg.kind) {
      e.preventDefault()
      api.setEditing(msg.id)
    } else if (e.key === 'r' && !msg.kind) {
      e.preventDefault()
      const btn = e.currentTarget.querySelector<HTMLElement>('[data-react-btn]')
      if (btn) api.openOverlay({ kind: 'emoji', anchor: btn, forId: msg.id, onPick: (em) => api.react(ch, msg.id, em) })
    }
  }

  if (msg.kind === 'system') {
    return (
      <div data-mid={msg.id} tabIndex={-1} className={`flex items-center gap-2 px-4 py-1.5 text-[13px] text-[var(--sub)] @lg:px-5 ${api.flash === msg.id ? 'tc-flash' : ''}`}>
        <span className="grid w-9 shrink-0 place-items-center">
          <Avatar id={msg.author} size={20} />
        </span>
        <span>
          <b className="font-semibold text-[#3d494e]">{u.short}</b> {msg.text}
          <span className="ml-2 text-[11px]">{fmtTime(msg.ts)}</span>
        </span>
      </div>
    )
  }

  return (
    <div
      data-mid={msg.id}
      tabIndex={0}
      onKeyDown={onKeyDown}
      aria-label={`${u.name} ${fmtTime(msg.ts)} ${plain(msg.text).slice(0, 60)}`}
      className={`group/msg relative px-4 outline-none transition-colors focus-visible:bg-[#f2f7f6] focus-visible:shadow-[inset_2px_0_0_var(--acc)] @lg:px-5 ${compact ? 'py-0.5' : 'pt-2 pb-1'} ${
        msg.pinned ? 'bg-[#fffaf0]' : forMe ? 'bg-[var(--mention)] shadow-[inset_3px_0_0_#e8b100]' : msg.kind === 'ephemeral' ? 'bg-[#f6f8ff]' : 'hover:bg-[var(--hover)]'
      } ${editing ? '!bg-[#f2f8f6]' : ''} ${api.flash === msg.id ? 'tc-flash' : ''}`}
    >
      {msg.pinned && (
        <div className="mb-0.5 flex items-center gap-1 pl-11 text-[11.5px] font-medium text-[#a36d00]">
          <Pin size={11} className="rotate-45" /> ピン留め済み
        </div>
      )}
      {msg.broadcast && msg.parent && (
        <button type="button" onClick={() => api.openThread(ch, msg.parent!)} className="mb-0.5 flex items-center gap-1 pl-11 text-[11.5px] text-[var(--sub)] hover:underline">
          <CornerDownRight size={12} /> スレッドに返信しました
        </button>
      )}
      <div className="flex gap-2">
        <div className="w-9 shrink-0">
          {compact ? (
            <span className="invisible block pt-[3px] text-right text-[10.5px] leading-5 text-[var(--sub)] tabular-nums group-hover/msg:visible group-focus-within/msg:visible">{fmtTime(msg.ts)}</span>
          ) : (
            <button
              type="button"
              aria-label={`${u.name} のプロフィール`}
              onClick={(e) => api.openOverlay({ kind: 'profile', anchor: e.currentTarget, user: msg.author })}
              className="mt-0.5 block rounded-[9px] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--acc)]"
            >
              <Avatar id={msg.author} size={36} />
            </button>
          )}
        </div>
        <div className="min-w-0 flex-1 [overflow-wrap:anywhere]">
          {!compact && (
            <div className="flex flex-wrap items-baseline gap-x-1.5 leading-5">
              <button
                type="button"
                onClick={(e) => api.openOverlay({ kind: 'profile', anchor: e.currentTarget, user: msg.author })}
                className="text-[14.5px] font-bold text-[#1c2326] hover:underline focus-visible:outline-2 focus-visible:outline-[var(--acc)]"
              >
                {u.name}
              </button>
              {u.status && (
                <span title={u.status.text} className="text-[12px]">
                  {u.status.emoji}
                </span>
              )}
              {u.app && <span className="rounded-[3px] bg-[#e9ecee] px-1 py-px text-[9.5px] font-bold tracking-wide text-[#5b676d]">APP</span>}
              <time title={fullDate(msg.ts)} className="text-[11.5px] text-[var(--sub)] tabular-nums">
                {fmtTime(msg.ts)}
              </time>
              {msg.kind === 'ephemeral' && (
                <span className="flex items-center gap-1 text-[11.5px] text-[var(--sub)]">
                  · あなただけに表示されています
                </span>
              )}
            </div>
          )}
          {editing ? (
            <EditBox initial={msg.text} onCancel={() => api.setEditing(null)} onSave={(t) => api.saveEdit(ch, msg.id, t)} />
          ) : (
            <div className={`text-[14.5px] leading-[1.55] text-[#1f282c] [&_p+p]:mt-1 [&_p+ul]:mt-0.5 ${msg.edited ? '[&>p:nth-last-child(2)]:inline' : ''}`}>
              <RichText text={msg.text} />
              {msg.edited && <span className="ml-1 text-[11px] text-[var(--sub)]">（編集済み）</span>}
            </div>
          )}
          {msg.files && <Attachments files={msg.files} />}
          {msg.unfurl && <UnfurlCard u={msg.unfurl} />}
          {msg.ci && <CiCardView ci={msg.ci} />}
          {msg.kind === 'ephemeral' && (
            <button type="button" onClick={() => api.removeMsg(ch, msg.id)} className="mt-1 text-[12px] font-medium text-[var(--link)] hover:underline">
              このメッセージを閉じる
            </button>
          )}
          <Reactions ch={ch} msg={msg} />
          {!inThread && <ThreadSummary ch={ch} msg={msg} />}
        </div>
      </div>

      {!editing && msg.kind !== 'ephemeral' && (
        <div
          role="toolbar"
          aria-label="メッセージの操作"
          className={`absolute -top-3.5 right-3 z-10 flex items-center gap-0.5 rounded-lg border border-[var(--line)] bg-white p-0.5 shadow-[0_4px_14px_rgba(15,30,35,0.12)] ${
            toolbarPinned ? 'visible' : 'invisible group-hover/msg:visible group-focus-within/msg:visible'
          }`}
        >
          <span className="hidden items-center @md:flex">
            {QUICK.map((q) => (
              <button
                key={q}
                type="button"
                aria-label={`${EMOJI_NAME[q] ?? q} でリアクション`}
                onClick={() => api.react(ch, msg.id, q)}
                className="grid size-8 place-items-center rounded-md text-[15px] transition-transform hover:scale-110 hover:bg-[#eef1f2] focus-visible:outline-2 focus-visible:outline-[var(--acc)]"
              >
                {q}
              </button>
            ))}
            <span className="mx-0.5 h-5 w-px bg-[var(--line)]" />
          </span>
          <span data-react-btn className="contents">
            <IconBtn
              label="リアクションを追加"
              onClick={(e) => api.openOverlay({ kind: 'emoji', anchor: e.currentTarget, forId: msg.id, onPick: (em) => api.react(ch, msg.id, em) })}
            >
              <SmilePlus size={17} />
            </IconBtn>
          </span>
          {!inThread && (
            <IconBtn label="スレッドで返信" onClick={() => api.openThread(ch, msg.broadcast && msg.parent ? msg.parent : msg.id)}>
              <MessageSquareText size={17} />
            </IconBtn>
          )}
          {own && (
            <IconBtn label="メッセージを編集" onClick={() => api.setEditing(msg.id)}>
              <Pencil size={16} />
            </IconBtn>
          )}
          <IconBtn label="その他の操作" onClick={(e) => api.openOverlay({ kind: 'more', anchor: e.currentTarget, forId: msg.id, ch, id: msg.id, inThread })}>
            <Ellipsis size={17} />
          </IconBtn>
        </div>
      )}
    </div>
  )
}

/* ───────────── メッセージ一覧 ───────────── */

function ChannelIntro({ c }: { c: Channel }) {
  const api = useApi()
  if (c.dm) {
    const u = USERS[c.dm]
    return (
      <div className="px-4 pt-8 pb-4 @lg:px-5">
        <Avatar id={c.dm} size={72} />
        <h3 className="mt-3 flex items-center gap-2 text-[20px] font-extrabold">
          {u.name}
          {u.status && <span className="text-[16px]">{u.status.emoji}</span>}
        </h3>
        <p className="mt-0.5 text-[13px] text-[var(--sub)]">
          {u.role} · {PRESENCE_LABEL[api.presence[c.dm]]}
        </p>
        <p className="mt-3 text-[14px] text-[#3d494e]">
          これは <b>{u.app ? u.name : `${u.short}さん`}</b> とのダイレクトメッセージの始まりです。
        </p>
      </div>
    )
  }
  return (
    <div className="px-4 pt-8 pb-4 @lg:px-5">
      <div className="grid size-14 place-items-center rounded-2xl bg-[#e3f1ee] text-[var(--acc)]">{c.private ? <Lock size={26} /> : <Hash size={28} />}</div>
      <h3 className="mt-3 text-[20px] font-extrabold">#{c.name} へようこそ</h3>
      <p className="mt-1 text-[14px] text-[#3d494e]">{c.intro}</p>
    </div>
  )
}

interface Section {
  key: string
  label: string
  items: Msg[]
}

function groupByDay(list: Msg[]): Section[] {
  const out: Section[] = []
  for (const m of list) {
    const k = dayKey(m.ts)
    const last = out[out.length - 1]
    if (last && last.key === k) last.items.push(m)
    else out.push({ key: k, label: dayLabel(m.ts), items: [m] })
  }
  return out
}

const isCompact = (prev: Msg | undefined, m: Msg) =>
  !!prev && prev.author === m.author && m.ts - prev.ts < 5 * 60e3 && !prev.kind && !m.kind && !m.broadcast && !m.pinned && !prev.broadcast

const rowMotion = (reduce: boolean) =>
  reduce
    ? { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 }, transition: { duration: 0.15 } }
    : {
        initial: { opacity: 0, y: 10 },
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 0, height: 0, transition: { duration: 0.2 } },
        transition: { type: 'spring' as const, stiffness: 420, damping: 34 },
      }

function scrollToEl(scroller: HTMLElement, el: HTMLElement, offset: number, smooth: boolean) {
  const top = scroller.scrollTop + el.getBoundingClientRect().top - scroller.getBoundingClientRect().top - offset
  scroller.scrollTo({ top, behavior: smooth ? 'smooth' : 'auto' })
}

function MessageList({
  c,
  msgs,
  divider,
  onClearDivider,
  jump,
}: {
  c: Channel
  msgs: Msg[]
  divider: Divider | null
  onClearDivider: () => void
  jump: { id: string; n: number } | null
}) {
  const api = useApi()
  const ref = useRef<HTMLDivElement>(null)
  const innerRef = useRef<HTMLDivElement>(null)
  const nearBottom = useRef(true)
  const [below, setBelow] = useState(0)
  const [dividerAbove, setDividerAbove] = useState(false)
  const prev = useRef({ ch: c.id, count: msgs.length })
  const sections = useMemo(() => groupByDay(msgs), [msgs])
  const dv = divider && divider.ch === c.id ? divider : null

  const measure = useCallback(() => {
    const el = ref.current
    if (!el) return
    nearBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 90
    if (nearBottom.current) setBelow(0)
    const d = el.querySelector<HTMLElement>('[data-new-divider]')
    setDividerAbove(!!d && d.getBoundingClientRect().bottom < el.getBoundingClientRect().top + 6)
  }, [])

  // チャンネルを開いたとき: 新着線があればそこへ、なければ最下部へ
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const d = el.querySelector<HTMLElement>('[data-new-divider]')
    if (d) scrollToEl(el, d, 64, false)
    else el.scrollTop = el.scrollHeight
    setBelow(0)
    measure()
    prev.current = { ch: c.id, count: msgs.length }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [c.id])

  // 新しいメッセージ: 自分の発言か最下部付近ならスクロール、そうでなければ「新着 ↓」ピル
  const last = msgs[msgs.length - 1]
  useLayoutEffect(() => {
    const el = ref.current
    if (!el || prev.current.ch !== c.id) return
    const added = msgs.length - prev.current.count
    prev.current.count = msgs.length
    if (added <= 0 || !last) return
    if (last.author === 'me' || last.kind === 'ephemeral' || nearBottom.current) {
      el.scrollTo({ top: el.scrollHeight, behavior: api.reduce ? 'auto' : 'smooth' })
    } else setBelow((b) => b + added)
  }, [msgs.length, last, c.id, api.reduce])

  // 中身の高さが変わっても(スレッド要約・リアクション)最下部にいれば張り付いたまま
  useEffect(() => {
    const inner = innerRef.current
    const el = ref.current
    if (!inner || !el) return
    const ro = new ResizeObserver(() => {
      if (nearBottom.current) el.scrollTop = el.scrollHeight
    })
    ro.observe(inner)
    return () => ro.disconnect()
  }, [])

  // 検索結果やピン留めからのジャンプ
  useLayoutEffect(() => {
    if (!jump) return
    const el = ref.current
    const t = el?.querySelector<HTMLElement>(`[data-mid="${jump.id}"]`)
    if (el && t) {
      scrollToEl(el, t, el.clientHeight / 2 - t.offsetHeight / 2, !api.reduce)
      t.focus({ preventScroll: true })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jump])

  return (
    <div className="relative min-h-0 flex-1">
      <div ref={ref} onScroll={measure} data-msglist className="tc-scroll absolute inset-0 overflow-x-hidden overflow-y-auto overscroll-contain">
        <div ref={innerRef} className="pb-3">
          <ChannelIntro c={c} />
          {sections.map((s) => (
            <section key={s.key} aria-label={s.label}>
              <div aria-hidden className="relative h-0">
                <div className="absolute inset-x-0 top-[14px] h-px bg-[var(--line)]" />
              </div>
              <div className="sticky top-1.5 z-[5] flex justify-center py-0.5">
                <span className="rounded-full border border-[var(--line)] bg-white px-3 py-[3px] text-[11.5px] font-bold text-[#3d494e] shadow-[0_1px_3px_rgba(0,0,0,0.06)]">{s.label}</span>
              </div>
              <AnimatePresence initial={false}>
                {s.items.map((m, i) => {
                  const isDiv = dv?.id === m.id
                  return (
                    <motion.div key={m.id} {...rowMotion(api.reduce)}>
                      {isDiv && (
                        <div data-new-divider className="relative my-1.5 flex items-center px-4 @lg:px-5" role="separator" aria-label="ここから新着">
                          <div className="h-px flex-1 bg-[var(--coral)]" />
                          <span className="ml-2 rounded px-1 text-[11px] font-bold text-[var(--coral)]">新着</span>
                        </div>
                      )}
                      <MessageRow ch={c.id} msg={m} compact={!isDiv && isCompact(s.items[i - 1], m)} inThread={false} />
                    </motion.div>
                  )
                })}
              </AnimatePresence>
            </section>
          ))}
        </div>
      </div>

      <AnimatePresence>
        {dv && dividerAbove && (
          <motion.div
            key="jump-unread"
            initial={api.reduce ? { opacity: 0 } : { opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={api.reduce ? { opacity: 0 } : { opacity: 0, y: -12 }}
            className="absolute top-2 left-1/2 z-10 flex -translate-x-1/2 items-center overflow-hidden rounded-full bg-[#2b6cb0] text-[12.5px] font-semibold whitespace-nowrap text-white shadow-lg"
          >
            <button
              type="button"
              onClick={() => {
                const el = ref.current
                const d = el?.querySelector<HTMLElement>('[data-new-divider]')
                if (el && d) scrollToEl(el, d, 64, !api.reduce)
              }}
              className="flex items-center gap-1.5 py-1.5 pr-2 pl-3 hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-white"
            >
              <ArrowUp size={14} /> 新着 {dv.count}件 · {fmtTime(dv.ts)} から
            </button>
            <span className="h-4 w-px bg-white/30" />
            <button type="button" onClick={onClearDivider} className="py-1.5 pr-3 pl-2 hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-white">
              既読にする
            </button>
          </motion.div>
        )}
        {below > 0 && (
          <motion.button
            key="new-below"
            type="button"
            initial={api.reduce ? { opacity: 0 } : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={api.reduce ? { opacity: 0 } : { opacity: 0, y: 12 }}
            onClick={() => {
              ref.current?.scrollTo({ top: ref.current.scrollHeight, behavior: api.reduce ? 'auto' : 'smooth' })
              setBelow(0)
            }}
            className="absolute bottom-3 left-1/2 z-10 flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-[var(--acc)] px-3.5 py-1.5 text-[12.5px] font-semibold whitespace-nowrap text-white shadow-lg hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--acc)]"
          >
            <ArrowDown size={14} /> 新着メッセージ {below}件
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  )
}

/* ───────────── 入力欄 ───────────── */

type Popup = { type: 'mention'; q: string; start: number } | { type: 'slash'; q: string } | null

function Composer({
  draft,
  setDraft,
  placeholder,
  members,
  onSend,
  onEditLast,
  focusNonce,
  typing,
  extra,
  allowSlash,
}: {
  draft: string
  setDraft: (v: string) => void
  placeholder: string
  members: UserId[]
  onSend: (text: string, files: Attachment[]) => void
  onEditLast: () => void
  focusNonce: number
  typing: UserId[]
  extra?: ReactNode
  allowSlash: boolean
}) {
  const api = useApi()
  const ref = useRef<HTMLTextAreaElement>(null)
  const [files, setFiles] = useState<Attachment[]>([])
  const [popup, setPopup] = useState<Popup>(null)
  const [idx, setIdx] = useState(0)
  const [fmtOpen, setFmtOpen] = useState(false)
  const listId = useRef(`tc-pop-${uid()}`).current

  useLayoutEffect(() => {
    const ta = ref.current
    if (!ta) return
    ta.style.height = 'auto'
    ta.style.height = `${Math.min(ta.scrollHeight, 168)}px`
  }, [draft])

  useEffect(() => {
    if (focusNonce > 0) ref.current?.focus({ preventScroll: true })
  }, [focusNonce])

  const mentionItems = useMemo(() => {
    if (popup?.type !== 'mention') return []
    const q = popup.q.toLowerCase()
    const people = members
      .filter((u) => u !== 'me' && !USERS[u].app)
      .filter((u) => !q || USERS[u].short.includes(q) || USERS[u].name.includes(q) || USERS[u].handle.includes(q))
      .map((u) => ({ key: u as string, label: USERS[u].short, user: u as UserId | null, sub: USERS[u].name }))
    const special = [
      { key: 'here', label: 'here', user: null, sub: 'このチャンネルのアクティブなメンバーに通知' },
      { key: 'channel', label: 'channel', user: null, sub: 'このチャンネルの全員に通知' },
    ].filter((s) => !q || s.key.includes(q))
    return [...people, ...special].slice(0, 7)
  }, [popup, members])

  const slashItems = useMemo(() => {
    if (popup?.type !== 'slash') return []
    return SLASH_COMMANDS.filter((c) => c.cmd.startsWith(popup.q.toLowerCase()))
  }, [popup])

  const itemsLen = popup?.type === 'mention' ? mentionItems.length : slashItems.length

  const sync = (value: string, caret: number) => {
    const before = value.slice(0, caret)
    const mm = /(^|[\s　(（])@([^\s@　]{0,12})$/.exec(before)
    if (mm) {
      setPopup({ type: 'mention', q: mm[2], start: caret - mm[2].length - 1 })
      setIdx(0)
      return
    }
    const sm = allowSlash ? /^\/(\w*)$/.exec(before) : null
    if (sm && !value.slice(caret).trim()) {
      setPopup({ type: 'slash', q: sm[1] })
      setIdx(0)
      return
    }
    setPopup(null)
  }

  const setCaret = (pos: number, end = pos) =>
    requestAnimationFrame(() => {
      const ta = ref.current
      if (!ta) return
      ta.focus({ preventScroll: true })
      ta.setSelectionRange(pos, end)
    })

  const choose = (i: number) => {
    if (popup?.type === 'mention') {
      const it = mentionItems[i]
      if (!it) return
      const ta = ref.current
      const caret = ta?.selectionStart ?? draft.length
      const ins = `@${it.label} `
      const next = draft.slice(0, popup.start) + ins + draft.slice(caret)
      setDraft(next)
      setPopup(null)
      setCaret(popup.start + ins.length)
    } else if (popup?.type === 'slash') {
      const it = slashItems[i]
      if (!it) return
      const next = `/${it.cmd} `
      setDraft(next)
      setPopup(null)
      setCaret(next.length)
    }
  }

  const insert = (s: string) => {
    const ta = ref.current
    const a = ta?.selectionStart ?? draft.length
    const b = ta?.selectionEnd ?? draft.length
    const next = draft.slice(0, a) + s + draft.slice(b)
    setDraft(next)
    setCaret(a + s.length)
    return { next, caret: a + s.length }
  }

  const wrap = (l: string, r: string, ph: string) => {
    const ta = ref.current
    const a = ta?.selectionStart ?? draft.length
    const b = ta?.selectionEnd ?? draft.length
    const sel = draft.slice(a, b) || ph
    setDraft(draft.slice(0, a) + l + sel + r + draft.slice(b))
    setCaret(a + l.length, a + l.length + sel.length)
  }

  const prefixLines = (kind: 'ul' | 'ol') => {
    const ta = ref.current
    const a = ta?.selectionStart ?? draft.length
    const b = ta?.selectionEnd ?? draft.length
    const ls = draft.lastIndexOf('\n', a - 1) + 1
    const block = draft.slice(ls, b) || 'リスト項目'
    const out = block
      .split('\n')
      .map((l, i) => `${kind === 'ul' ? '- ' : `${i + 1}. `}${l}`)
      .join('\n')
    setDraft(draft.slice(0, ls) + out + draft.slice(b))
    setCaret(ls + out.length)
  }

  const send = () => {
    const t = draft.trim()
    if (!t && !files.length) return
    onSend(t, files)
    setDraft('')
    setFiles([])
    setPopup(null)
  }

  const onKeyDown = (e: RKeyboardEvent<HTMLTextAreaElement>) => {
    const composing = e.nativeEvent.isComposing || e.keyCode === 229
    if (popup && itemsLen > 0 && !composing) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault()
        setIdx((i) => (i + (e.key === 'ArrowDown' ? 1 : itemsLen - 1)) % itemsLen)
        return
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault()
        choose(idx)
        return
      }
    }
    if (popup && e.key === 'Escape') {
      e.stopPropagation()
      setPopup(null)
      return
    }
    if (e.key === 'Enter' && !e.shiftKey && !composing) {
      e.preventDefault()
      send()
      return
    }
    if (e.key === 'ArrowUp' && !draft && !composing) {
      e.preventDefault()
      onEditLast()
      return
    }
    if ((e.ctrlKey || e.metaKey) && !composing) {
      const k = e.key.toLowerCase()
      if (k === 'b') {
        e.preventDefault()
        wrap('*', '*', '太字')
      } else if (k === 'i') {
        e.preventDefault()
        wrap('_', '_', '斜体')
      }
    }
  }

  const fmtButtons: { label: string; icon: ReactNode; run: () => void }[] = [
    { label: '太字 (Ctrl+B)', icon: <Bold size={15} />, run: () => wrap('*', '*', '太字') },
    { label: '斜体 (Ctrl+I)', icon: <Italic size={15} />, run: () => wrap('_', '_', '斜体') },
    { label: '取り消し線', icon: <Strikethrough size={15} />, run: () => wrap('~', '~', 'テキスト') },
    { label: 'リンク', icon: <Link2 size={15} />, run: () => wrap('', '', 'https://') },
    { label: '箇条書き', icon: <List size={15} />, run: () => prefixLines('ul') },
    { label: '番号付きリスト', icon: <ListOrdered size={15} />, run: () => prefixLines('ol') },
    { label: 'コード', icon: <Code size={15} />, run: () => wrap('`', '`', 'code') },
    { label: 'コードブロック', icon: <SquareCode size={15} />, run: () => wrap('```\n', '\n```', 'コード') },
  ]

  const can = !!draft.trim() || files.length > 0
  const activeOpt = popup ? `${listId}-${idx}` : undefined

  return (
    <div className="relative shrink-0 px-3 @lg:px-5">
      <AnimatePresence>
        {popup && itemsLen > 0 && (
          <motion.div
            key={popup.type}
            initial={api.reduce ? { opacity: 0 } : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.14 }}
            className="absolute right-3 bottom-full left-3 z-30 mb-1.5 overflow-hidden rounded-xl border border-[var(--line)] bg-white shadow-[0_10px_30px_rgba(15,30,35,0.16)] @lg:right-5 @lg:left-5"
          >
            <div className="border-b border-[var(--line)] px-3 py-1.5 text-[11.5px] font-semibold text-[var(--sub)]">{popup.type === 'mention' ? 'メンバー' : 'コマンド'}</div>
            <ul id={listId} role="listbox" aria-label={popup.type === 'mention' ? 'メンションの候補' : 'スラッシュコマンド'} className="max-h-56 overflow-y-auto py-1">
              {popup.type === 'mention'
                ? mentionItems.map((it, i) => (
                    <li
                      key={it.key}
                      id={`${listId}-${i}`}
                      role="option"
                      aria-selected={i === idx}
                      onMouseDown={(e) => {
                        e.preventDefault()
                        choose(i)
                      }}
                      onMouseEnter={() => setIdx(i)}
                      className={`mx-1 flex cursor-pointer items-center gap-2.5 rounded-lg px-2 py-1.5 text-[13.5px] ${i === idx ? 'bg-[var(--acc)] text-white' : ''}`}
                    >
                      {it.user ? (
                        <Avatar id={it.user} size={22} presence={api.presence[it.user]} ring={i === idx ? 'var(--acc)' : '#fff'} />
                      ) : (
                        <span className={`grid size-[22px] place-items-center rounded-md ${i === idx ? 'bg-white/20' : 'bg-[#eef1f2]'}`}>
                          <AtSign size={13} />
                        </span>
                      )}
                      <span className="font-semibold">{it.user ? it.sub : `@${it.label}`}</span>
                      <span className={`truncate text-[12px] ${i === idx ? 'text-white/80' : 'text-[var(--sub)]'}`}>{it.user ? `@${it.label}` : it.sub}</span>
                    </li>
                  ))
                : slashItems.map((it, i) => (
                    <li
                      key={it.cmd}
                      id={`${listId}-${i}`}
                      role="option"
                      aria-selected={i === idx}
                      onMouseDown={(e) => {
                        e.preventDefault()
                        choose(i)
                      }}
                      onMouseEnter={() => setIdx(i)}
                      className={`mx-1 flex cursor-pointer items-baseline gap-2 rounded-lg px-2.5 py-1.5 text-[13.5px] ${i === idx ? 'bg-[var(--acc)] text-white' : ''}`}
                    >
                      <span className="font-mono font-semibold">/{it.cmd}</span>
                      <span className={`font-mono text-[12px] ${i === idx ? 'text-white/70' : 'text-[#98a3a8]'}`}>{it.args}</span>
                      <span className={`ml-auto truncate pl-2 text-[12px] ${i === idx ? 'text-white/85' : 'text-[var(--sub)]'}`}>{it.desc}</span>
                    </li>
                  ))}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="rounded-xl border border-[#cdd5d8] bg-white transition-[border-color,box-shadow] focus-within:border-[#8fa9a4] focus-within:shadow-[0_2px_10px_rgba(15,30,35,0.08)]">
        <div className={`${fmtOpen ? 'flex' : 'hidden'} items-center gap-0.5 overflow-x-auto rounded-t-xl border-b border-[#eef1f2] bg-[#fafbfb] px-1.5 py-1 @xl:flex`} role="toolbar" aria-label="書式">
          {fmtButtons.map((b, i) => (
            <Fragment key={b.label}>
              {(i === 3 || i === 4 || i === 6) && <span className="mx-1 h-4 w-px shrink-0 bg-[#dde3e5]" />}
              <button
                type="button"
                aria-label={b.label}
                title={b.label}
                onMouseDown={(e) => e.preventDefault()}
                onClick={b.run}
                className="grid size-7 shrink-0 place-items-center rounded-md text-[#5b676d] hover:bg-[#eaeeef] hover:text-[#1c2326] focus-visible:outline-2 focus-visible:outline-[var(--acc)]"
              >
                {b.icon}
              </button>
            </Fragment>
          ))}
        </div>

        <AnimatePresence initial={false}>
          {files.length > 0 && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="flex gap-2 overflow-hidden px-3 pt-2.5">
              {files.map((f, i) => (
                <div key={i} className="relative h-14 w-20 overflow-hidden rounded-lg border border-[var(--line)] bg-[#f3f5f5]">
                  {f.type === 'image' && <Art kind={f.art} />}
                  <button
                    type="button"
                    aria-label={`${f.name} を外す`}
                    onClick={() => setFiles((fs) => fs.filter((_, j) => j !== i))}
                    className="absolute top-0.5 right-0.5 grid size-5 place-items-center rounded-full bg-black/70 text-white hover:bg-black focus-visible:outline-2 focus-visible:outline-white"
                  >
                    <X size={12} />
                  </button>
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        <textarea
          ref={ref}
          value={draft}
          rows={1}
          placeholder={placeholder}
          aria-label={placeholder}
          role="combobox"
          aria-expanded={!!popup && itemsLen > 0}
          aria-controls={popup ? listId : undefined}
          aria-activedescendant={activeOpt}
          aria-autocomplete="list"
          onChange={(e) => {
            setDraft(e.target.value)
            sync(e.target.value, e.target.selectionStart)
          }}
          onSelect={(e) => {
            const t = e.currentTarget
            if (popup) sync(t.value, t.selectionStart)
          }}
          onBlur={() => setPopup(null)}
          onKeyDown={onKeyDown}
          className="tc-scroll block w-full resize-none bg-transparent px-3 pt-2.5 pb-1 text-[14.5px] leading-[1.55] text-[#1c2326] outline-none placeholder:text-[#8d999e]"
        />

        <div className="flex items-center gap-0.5 px-1.5 pb-1.5">
          <IconBtn
            label="ファイルを添付"
            onClick={() => {
              setFiles((fs) => [...fs, { type: 'image', art: 'screenshot', name: `スクリーンショット ${fmtTime(BASE_NOW)}.png`, w: 320, h: 200 }])
              ref.current?.focus({ preventScroll: true })
            }}
          >
            <Plus size={18} />
          </IconBtn>
          <IconBtn label="書式ツールバー" pressed={fmtOpen} onClick={() => setFmtOpen((v) => !v)} className="@xl:hidden">
            <Type size={16} />
          </IconBtn>
          <span className="mx-0.5 h-4 w-px bg-[#e3e8ea]" />
          <IconBtn
            label="絵文字"
            onClick={(e) =>
              api.openOverlay({
                kind: 'emoji',
                anchor: e.currentTarget,
                align: 'start',
                onPick: (em) => insert(em),
              })
            }
          >
            <Smile size={17} />
          </IconBtn>
          <IconBtn
            label="メンション"
            onClick={() => {
              const ta = ref.current
              const a = ta?.selectionStart ?? draft.length
              const needSpace = a > 0 && !/\s$/.test(draft.slice(0, a))
              const { next, caret } = insert(needSpace ? ' @' : '@')
              sync(next, caret)
            }}
          >
            <AtSign size={16} />
          </IconBtn>
          {allowSlash && (
            <IconBtn
              label="スラッシュコマンド"
              onClick={() => {
                setDraft('/')
                sync('/', 1)
                setCaret(1)
              }}
              className="hidden @sm:grid"
            >
              <Slash size={15} />
            </IconBtn>
          )}
          {extra}
          <motion.button
            type="button"
            onClick={send}
            disabled={!can}
            aria-label="送信"
            whileTap={can && !api.reduce ? { scale: 0.9 } : undefined}
            className={`ml-auto grid h-8 w-10 place-items-center rounded-lg transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--acc)] ${
              can ? 'bg-[var(--acc)] text-white hover:brightness-110' : 'text-[#aab4b8]'
            }`}
          >
            <SendHorizontal size={17} />
          </motion.button>
        </div>
      </div>

      <div className="flex h-6 items-center justify-between gap-3 px-1 text-[11.5px] text-[var(--sub)]" aria-live="polite">
        <span className="flex min-w-0 items-center gap-1.5 truncate">
          {typing.length > 0 && (
            <>
              <TypingDots reduce={api.reduce} />
              <span className="truncate">
                <b className="font-semibold text-[#3d494e]">{typing.map((u) => san(u)).join('、')}</b> が入力中…
              </span>
            </>
          )}
        </span>
        <span className="hidden shrink-0 @2xl:inline">
          <kbd className="font-sans font-semibold">Shift + Enter</kbd> で改行
        </span>
      </div>
    </div>
  )
}

/* ───────────── ポップオーバー ───────────── */

function Popover({ anchor, width, align = 'end', label, children }: { anchor: HTMLElement; width: number; align?: 'start' | 'end'; label: string; children: ReactNode }) {
  const api = useApi()
  const ref = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null)
  useLayoutEffect(() => {
    const el = ref.current
    const root = api.rootRef.current
    if (!el || !root) return
    const rr = root.getBoundingClientRect()
    const ar = anchor.getBoundingClientRect()
    const w = el.offsetWidth
    const h = el.offsetHeight
    let left = align === 'end' ? ar.right - rr.left - w : ar.left - rr.left
    left = clamp(left, 8, rr.width - w - 8)
    let top = ar.bottom - rr.top + 6
    if (top + h > rr.height - 8) top = ar.top - rr.top - h - 6
    top = clamp(top, 8, Math.max(8, rr.height - h - 8))
    setPos({ left, top })
  }, [anchor, align, api.rootRef])
  const placed = !!pos
  useEffect(() => {
    if (!placed) return
    ref.current?.querySelector<HTMLElement>('input, [role="menuitem"], [role="menuitemradio"], button')?.focus({ preventScroll: true })
  }, [placed])
  return (
    <motion.div
      ref={ref}
      role="dialog"
      aria-label={label}
      data-overlay
      initial={api.reduce ? { opacity: 0 } : { opacity: 0, scale: 0.96, y: 4 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, transition: { duration: 0.1 } }}
      transition={{ duration: api.reduce ? 0.12 : 0.16, ease: 'easeOut' }}
      className="absolute z-[60] overflow-hidden rounded-xl border border-[var(--line)] bg-white text-[#1c2326] shadow-[0_16px_40px_rgba(10,25,30,0.22)]"
      style={{ left: pos?.left ?? 0, top: pos?.top ?? 0, width: `min(${width}px, calc(100% - 16px))`, visibility: pos ? 'visible' : 'hidden' }}
    >
      {children}
    </motion.div>
  )
}

const CAT_ICONS: Record<string, ReactNode> = {
  recent: <Clock size={15} />,
  smileys: <Smile size={15} />,
  hands: <Hand size={15} />,
  nature: <Leaf size={15} />,
  objects: <Lamp size={15} />,
  symbols: <Shapes size={15} />,
}

function EmojiPicker({ onPick }: { onPick: (e: string) => void }) {
  const api = useApi()
  const [q, setQ] = useState('')
  const [hover, setHover] = useState<string | null>(null)
  const scroller = useRef<HTMLDivElement>(null)
  const cats = useMemo(() => [{ id: 'recent', label: 'よく使う', items: api.recent.map((e) => [e, EMOJI_NAME[e] ?? ''] as [string, string]) }, ...EMOJI_CATS], [api.recent])
  const results = useMemo(() => {
    const s = q.trim().toLowerCase()
    if (!s) return null
    return EMOJI_CATS.flatMap((c) => c.items).filter(([e, k]) => k.toLowerCase().includes(s) || e === s)
  }, [q])
  const cell = (e: string, k: string, key: string) => (
    <button
      key={key}
      type="button"
      aria-label={k.split(' ')[0] || e}
      onClick={() => onPick(e)}
      onMouseEnter={() => setHover(e)}
      onFocus={() => setHover(e)}
      className="grid aspect-square place-items-center rounded-lg text-[21px] transition-transform hover:scale-110 hover:bg-[#eef1f2] focus-visible:bg-[#e3f1ee] focus-visible:outline-2 focus-visible:outline-[var(--acc)]"
    >
      {e}
    </button>
  )
  return (
    <div className="flex h-[340px] flex-col">
      <div className="p-2.5 pb-1.5">
        <label className="flex items-center gap-2 rounded-lg border border-[#cdd5d8] px-2.5 py-1.5 focus-within:border-[var(--acc)]">
          <Search size={14} className="text-[var(--sub)]" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && results?.[0]) {
                e.preventDefault()
                onPick(results[0][0])
              }
            }}
            placeholder="絵文字を検索（例: なみ, party）"
            aria-label="絵文字を検索"
            className="w-full bg-transparent text-[13px] outline-none placeholder:text-[#98a3a8]"
          />
        </label>
      </div>
      {!results && (
        <div className="flex gap-0.5 border-b border-[var(--line)] px-2 pb-1">
          {cats.map((c) => (
            <button
              key={c.id}
              type="button"
              aria-label={c.label}
              title={c.label}
              onClick={() => {
                const el = scroller.current?.querySelector<HTMLElement>(`[data-cat="${c.id}"]`)
                if (el && scroller.current) scroller.current.scrollTo({ top: el.offsetTop - 4, behavior: api.reduce ? 'auto' : 'smooth' })
              }}
              className="grid size-7 place-items-center rounded-md text-[#6b777d] hover:bg-[#eef1f2] hover:text-[#1c2326] focus-visible:outline-2 focus-visible:outline-[var(--acc)]"
            >
              {CAT_ICONS[c.id]}
            </button>
          ))}
        </div>
      )}
      <div ref={scroller} className="tc-scroll relative min-h-0 flex-1 overflow-y-auto px-2 py-1.5">
        {results ? (
          results.length ? (
            <div className="grid grid-cols-8 gap-0.5">{results.map(([e, k]) => cell(e, k, e))}</div>
          ) : (
            <p className="py-10 text-center text-[13px] text-[var(--sub)]">見つかりませんでした</p>
          )
        ) : (
          cats.map((c) => (
            <div key={c.id} data-cat={c.id} className="mb-1.5">
              <div className="sticky top-0 z-[1] bg-white/95 px-1 py-1 text-[11px] font-bold text-[var(--sub)]">{c.label}</div>
              <div className="grid grid-cols-8 gap-0.5">{c.items.map(([e, k]) => cell(e, k, `${c.id}-${e}`))}</div>
            </div>
          ))
        )}
      </div>
      <div className="flex h-10 items-center gap-2 border-t border-[var(--line)] bg-[#fafbfb] px-3 text-[12px] text-[var(--sub)]">
        {hover ? (
          <>
            <span className="text-[20px]">{hover}</span>
            <span className="font-semibold text-[#3d494e]">:{EMOJI_NAME[hover] ?? ''}:</span>
          </>
        ) : (
          'Enter で最初の候補を選択'
        )}
      </div>
    </div>
  )
}

function MenuItem({ icon, label, onClick, danger }: { icon: ReactNode; label: string; onClick: () => void; danger?: boolean }) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return
        e.preventDefault()
        const items = [...(e.currentTarget.parentElement?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? [])]
        const i = items.indexOf(e.currentTarget)
        items[(i + (e.key === 'ArrowDown' ? 1 : items.length - 1)) % items.length]?.focus()
      }}
      className={`flex w-full items-center gap-2.5 rounded-md px-2.5 py-1.5 text-left text-[13.5px] outline-none focus-visible:bg-[var(--acc)] focus-visible:text-white ${
        danger ? 'text-[#c2412d] hover:bg-[#c2412d] hover:text-white' : 'hover:bg-[var(--acc)] hover:text-white'
      }`}
    >
      {icon}
      {label}
    </button>
  )
}

/* ───────────── ハドル ───────────── */

function useTicker(ms: number) {
  const [, setN] = useState(0)
  useEffect(() => {
    const id = window.setInterval(() => setN((n) => n + 1), ms)
    return () => window.clearInterval(id)
  }, [ms])
}

function HuddleBar({ variant }: { variant: 'side' | 'bar' }) {
  const api = useApi()
  useTicker(1000)
  const ch = api.myHuddle
  const h = ch ? api.huddles[ch] : undefined
  const [speaker, setSpeaker] = useState<UserId | null>(null)
  const people = h?.people
  useEffect(() => {
    if (!people?.length) return
    const id = window.setInterval(() => {
      const cand = people.filter((p) => p !== 'me' || !api.muted)
      setSpeaker(Math.random() < 0.25 ? null : pick(cand.length ? cand : people))
    }, 1300)
    return () => window.clearInterval(id)
  }, [people, api.muted])
  if (!ch || !h) return null
  const sec = Math.max(0, Math.floor((Date.now() - h.start) / 1000))
  const time = `${Math.floor(sec / 60)}:${pad(sec % 60)}`
  const c = CHANNEL_BY_ID[ch]
  const avatars = (
    <span className="flex -space-x-1.5">
      {h.people.slice(0, 4).map((p) => (
        <span key={p} className={`relative rounded-[8px] ring-2 ring-[#0d3a35] ${speaker === p ? (api.reduce ? 'outline-2 outline-[#3ddc97]' : 'tc-speak') : ''}`} title={USERS[p].name}>
          <Avatar id={p} size={variant === 'side' ? 26 : 22} />
          {p === 'me' && api.muted && (
            <span className="absolute -right-1 -bottom-1 grid size-3.5 place-items-center rounded-full bg-[#e0503c] text-white">
              <MicOff size={8} />
            </span>
          )}
        </span>
      ))}
    </span>
  )
  const buttons = (
    <span className="flex items-center gap-1">
      <button
        type="button"
        aria-label={api.muted ? 'ミュートを解除' : 'ミュート'}
        aria-pressed={api.muted}
        onClick={() => api.setMuted(!api.muted)}
        className={`grid size-8 place-items-center rounded-lg transition-colors focus-visible:outline-2 focus-visible:outline-white ${api.muted ? 'bg-[#e0503c] text-white' : 'bg-white/12 text-white hover:bg-white/20'}`}
      >
        {api.muted ? <MicOff size={15} /> : <Mic size={15} />}
      </button>
      <button
        type="button"
        aria-label="ハドルから退出"
        onClick={api.leaveHuddle}
        className="grid h-8 place-items-center rounded-lg bg-[#d6402b] px-2.5 text-white hover:bg-[#e04a34] focus-visible:outline-2 focus-visible:outline-white"
      >
        <PhoneOff size={15} />
      </button>
    </span>
  )
  const title = (
    <button type="button" onClick={() => api.openChannel(ch, true)} className="flex min-w-0 items-center gap-1 truncate font-semibold hover:underline">
      {c.dm ? c.name : `#${c.name}`}
    </button>
  )
  if (variant === 'bar') {
    return (
      <div className="flex shrink-0 items-center gap-2.5 bg-[#0d3a35] px-3 py-1.5 text-[12.5px] text-white">
        <Headphones size={15} className="shrink-0 text-[#3ddc97]" />
        <span className="flex min-w-0 flex-1 items-center gap-1.5">
          {title}
          <span className="text-white/60 tabular-nums">{time}</span>
        </span>
        {avatars}
        {buttons}
      </div>
    )
  }
  return (
    <motion.div
      initial={api.reduce ? { opacity: 0 } : { opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={api.reduce ? { opacity: 0 } : { opacity: 0, y: 16 }}
      className="m-2 rounded-xl bg-[#0d3a35] p-2.5 text-[12.5px] text-white shadow-[0_8px_24px_rgba(0,0,0,0.35)] ring-1 ring-white/10"
    >
      <div className="flex items-center gap-1.5">
        <span className="relative grid size-5 place-items-center">
          {!api.reduce && <span className="absolute inset-0 animate-ping rounded-full bg-[#3ddc97]/40" />}
          <Headphones size={14} className="relative text-[#3ddc97]" />
        </span>
        {title}
        <span className="ml-auto text-white/60 tabular-nums">{time}</span>
      </div>
      <div className="mt-2 flex items-center justify-between gap-2">
        {avatars}
        {buttons}
      </div>
    </motion.div>
  )
}

/* ───────────── サイドバー ───────────── */

type SectionId = 'channels' | 'dms' | 'apps'

function Sidebar({
  state,
  drafts,
  collapsed,
  toggle,
}: {
  state: ChatState
  drafts: Record<string, string>
  collapsed: Record<SectionId, boolean>
  toggle: (s: SectionId) => void
}) {
  const api = useApi()
  const sections: { id: SectionId; label: string; items: Channel[] }[] = [
    { id: 'channels', label: 'チャンネル', items: CHANNELS.filter((c) => c.kind === 'channel') },
    { id: 'dms', label: 'ダイレクトメッセージ', items: CHANNELS.filter((c) => c.kind === 'dm') },
    { id: 'apps', label: 'アプリ', items: CHANNELS.filter((c) => c.kind === 'app') },
  ]
  return (
    <div className="flex min-w-0 flex-1 flex-col bg-[var(--side)] text-[var(--side-fg)] @3xl/app:w-[236px] @3xl/app:flex-none @6xl/app:w-[256px]">
      <div className="flex h-[52px] shrink-0 items-center gap-1 border-b border-white/10 px-3">
        <button
          type="button"
          onClick={() => api.toast('ワークスペースの設定はデモでは開けません')}
          className="flex min-w-0 items-center gap-1 rounded-md px-1.5 py-1 text-[15.5px] font-extrabold hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-white/70"
        >
          <span className="truncate">ミナモ工房</span>
          <ChevronDown size={15} className="shrink-0 opacity-70" />
        </button>
        <IconBtn label="新規メッセージ" dark className="ml-auto" onClick={() => api.openChannel(api.active, true)}>
          <SquarePen size={16} />
        </IconBtn>
      </div>
      <nav aria-label="チャンネルとダイレクトメッセージ" className="tc-side-scroll min-h-0 flex-1 overflow-y-auto px-2 pt-2 pb-3">
        {sections.map((s) => {
          const isCol = collapsed[s.id]
          return (
            <div key={s.id} className="mb-2">
              <button
                type="button"
                aria-expanded={!isCol}
                onClick={() => toggle(s.id)}
                className="flex w-full items-center gap-1 rounded-md px-1.5 py-1 text-[13px] font-semibold text-[var(--side-sub)] hover:bg-white/5 hover:text-[var(--side-fg)] focus-visible:outline-2 focus-visible:outline-white/70"
              >
                <ChevronDown size={14} className={`transition-transform ${api.reduce ? 'duration-0' : 'duration-200'} ${isCol ? '-rotate-90' : ''}`} />
                {s.label}
              </button>
              <ul className="mt-0.5">
                {s.items.map((c) => {
                  const unread = state.unread[c.id] ?? 0
                  const men = state.mentions[c.id] ?? 0
                  const active = api.active === c.id
                  const hidden = isCol && !active && !(unread > 0 && !c.muted)
                  const bold = unread > 0 && !c.muted && !active
                  const draft = !active && !!drafts[c.id]?.trim()
                  const hud = api.huddles[c.id]
                  return (
                    <li
                      key={c.id}
                      className={`grid transition-[grid-template-rows,opacity] ${api.reduce ? 'duration-100' : 'duration-200'} ${hidden ? 'grid-rows-[0fr] opacity-0' : 'grid-rows-[1fr] opacity-100'}`}
                      inert={hidden}
                    >
                      <div className="overflow-hidden">
                        <button
                          type="button"
                          aria-current={active ? 'page' : undefined}
                          onClick={() => api.openChannel(c.id, true)}
                          style={{ ['--ring' as string]: active ? 'var(--side-act)' : 'var(--side)' }}
                          className={`group/ch flex h-[30px] w-full items-center gap-2 rounded-md px-2 text-left text-[14px] transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-white/70 ${
                            active ? 'bg-[var(--side-act)] text-white' : bold ? 'font-bold text-white hover:bg-white/8' : `text-[var(--side-sub)] hover:bg-white/8 ${c.muted ? 'opacity-55' : ''}`
                          }`}
                        >
                          <span className="grid w-[18px] shrink-0 place-items-center">
                            <ChannelGlyph c={c} presence={c.dm ? api.presence[c.dm] : undefined} />
                          </span>
                          <span className="min-w-0 flex-1 truncate">
                            {c.name}
                            {c.dm && USERS[c.dm].status && <span className="ml-1 text-[12px]">{USERS[c.dm].status!.emoji}</span>}
                          </span>
                          {c.muted && <BellOff size={13} className="shrink-0 opacity-60" aria-label="ミュート中" />}
                          {hud && (
                            <span className="flex shrink-0 items-center gap-0.5 rounded-full bg-[#3ddc97]/15 px-1.5 py-px text-[11px] font-semibold text-[#3ddc97]" title="ハドル中">
                              <Headphones size={11} />
                              {hud.people.length}
                            </span>
                          )}
                          {draft && <Pencil size={12} className="shrink-0 opacity-70" aria-label="下書きあり" />}
                          <AnimatePresence initial={false}>
                            {men > 0 && !active && (
                              <motion.span
                                key={men}
                                initial={api.reduce ? { opacity: 0 } : { scale: 0.4, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0.4, opacity: 0 }}
                                transition={api.reduce ? { duration: 0.12 } : { type: 'spring', stiffness: 600, damping: 18 }}
                                className="grid h-[18px] min-w-[20px] shrink-0 place-items-center rounded-full bg-[var(--coral)] px-1.5 text-[11px] font-bold text-white"
                                aria-label={`メンション ${men}件`}
                              >
                                {men}
                              </motion.span>
                            )}
                          </AnimatePresence>
                        </button>
                      </div>
                    </li>
                  )
                })}
              </ul>
            </div>
          )
        })}
      </nav>
      <AnimatePresence>{api.myHuddle && <HuddleBar key="hb" variant="side" />}</AnimatePresence>
    </div>
  )
}

function Rail() {
  const api = useApi()
  const ws: { id: 'minamo' | 'boulder' | 'kagari'; name: string; dot?: boolean }[] = [
    { id: 'minamo', name: 'ミナモ工房' },
    { id: 'boulder', name: '週末ボルダー部', dot: true },
    { id: 'kagari', name: 'kagari-ui（OSS）' },
  ]
  return (
    <div className="flex w-[64px] shrink-0 flex-col items-center gap-3 bg-[var(--rail)] py-3">
      {ws.map((w, i) => (
        <div key={w.id} className="relative">
          {i === 0 && <span className="absolute top-1/2 -left-[14px] h-6 w-1 -translate-y-1/2 rounded-r bg-white" />}
          <button
            type="button"
            aria-label={w.name}
            title={w.name}
            aria-current={i === 0 ? 'true' : undefined}
            onClick={() => i > 0 && api.toast(`「${w.name}」はこのデモでは表示だけです`)}
            className={`block rounded-[11px] transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white ${i === 0 ? 'ring-2 ring-white/90 ring-offset-2 ring-offset-[var(--rail)]' : 'opacity-75 hover:opacity-100'}`}
          >
            <WorkspaceLogo kind={w.id} />
          </button>
          {w.dot && <span className="absolute -top-0.5 -right-0.5 size-2.5 rounded-full bg-white ring-2 ring-[var(--rail)]" aria-label="未読あり" />}
        </div>
      ))}
      <button
        type="button"
        aria-label="ワークスペースを追加"
        onClick={() => api.toast('ワークスペースの追加はデモでは使えません')}
        className="grid size-9 place-items-center rounded-[11px] border border-dashed border-white/25 text-white/60 hover:border-white/50 hover:text-white focus-visible:outline-2 focus-visible:outline-white"
      >
        <Plus size={17} />
      </button>
      <button
        type="button"
        aria-label={`あなたのステータス: ${PRESENCE_LABEL[api.presence.me]}`}
        onClick={(e) => api.openOverlay({ kind: 'status', anchor: e.currentTarget })}
        className="mt-auto rounded-[10px] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
      >
        <Avatar id="me" size={36} presence={api.presence.me} ring="var(--rail)" />
      </button>
    </div>
  )
}

/* ───────────── 本体 ───────────── */

const SECTION_DEFAULT: Record<SectionId, boolean> = { channels: false, dms: false, apps: false }

export function TeamChat() {
  const reduce = !!useReducedMotion()
  const rootRef = useRef<HTMLDivElement>(null)
  const [t0] = useState(() => Date.now())
  const now = useCallback(() => BASE_NOW + (Date.now() - t0), [t0])

  const [state, dispatch] = useReducer(reducer, undefined, initState)
  const [active, setActive] = useState<ChannelId>('dev')
  const [divider, setDivider] = useState<Divider | null>(() => {
    const u = INITIAL_UNREAD.dev ?? 0
    const list = SEED.dev
    const m = list[list.length - u]
    return u && m ? { ch: 'dev', id: m.id, count: u, ts: m.ts } : null
  })
  const [thread, setThread] = useState<{ ch: ChannelId; id: string } | null>(null)
  const [drawer, setDrawer] = useState(false)
  const [collapsed, setCollapsed] = useState(SECTION_DEFAULT)
  const [overlay, setOverlay] = useState<Overlay | null>(null)
  const [editing, setEditing] = useState<string | null>(null)
  const [drafts, setDrafts] = useState<Record<string, string>>({})
  const [typing, setTyping] = useState<Record<string, UserId[]>>({})
  const [presence, setPresence] = useState(INITIAL_PRESENCE)
  const [toasts, setToasts] = useState<Toast[]>([])
  const [lightbox, setLightbox] = useState<ImageAtt | null>(null)
  const [flash, setFlash] = useState<string | null>(null)
  const [jump, setJump] = useState<{ id: string; n: number } | null>(null)
  const [focusNonce, setFocusNonce] = useState(0)
  const [threadFocus, setThreadFocus] = useState(0)
  const [recent, setRecent] = useState<string[]>(['👍', '🙌', '🎉', '✅', '👀', '🙏', '😂', '🔥'])
  const [query, setQuery] = useState('')
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchIdx, setSearchIdx] = useState(0)
  const searchRef = useRef<HTMLInputElement>(null)
  const [broadcast, setBroadcast] = useState(false)
  const [huddles, setHuddles] = useState<Partial<Record<ChannelId, HuddleState>>>(() => ({ design: { start: Date.now() - (4 * 60 + 12) * 1000, people: ['noa', 'akari'] } }))
  const [myHuddle, setMyHuddle] = useState<ChannelId | null>(null)
  const [muted, setMuted] = useState(false)

  // タイマーから参照する最新値
  const activeRef = useRef(active)
  const stateRef = useRef(state)
  const presenceRef = useRef(presence)
  const huddlesRef = useRef(huddles)
  const timers = useRef(new Set<number>())
  const replying = useRef(false)
  useLayoutEffect(() => {
    activeRef.current = active
    stateRef.current = state
    presenceRef.current = presence
    huddlesRef.current = huddles
  })

  const later = useCallback((fn: () => void, ms: number) => {
    const id = window.setTimeout(() => {
      timers.current.delete(id)
      fn()
    }, ms)
    timers.current.add(id)
  }, [])

  const toast = useCallback(
    (text: string, action?: { label: string; fn: () => void }) => {
      const id = uid()
      setToasts((t) => [...t.slice(-2), { id, kind: 'info', text, action }])
      later(() => setToasts((t) => t.filter((x) => x.id !== id)), action ? 5000 : 2800)
    },
    [later],
  )

  const notify = useCallback(
    (ch: ChannelId, from: UserId, text: string) => {
      const id = uid()
      setToasts((t) => [...t.slice(-2), { id, kind: 'notif', ch, from, text }])
      later(() => setToasts((t) => t.filter((x) => x.id !== id)), 5200)
    },
    [later],
  )

  const setTypingFor = useCallback((key: string, user: UserId, on: boolean) => {
    setTyping((t) => {
      const cur = t[key] ?? []
      const next = on ? (cur.includes(user) ? cur : [...cur, user]) : cur.filter((u) => u !== user)
      return { ...t, [key]: next }
    })
  }, [])

  const incoming = useCallback(
    (ch: ChannelId, from: UserId, text: string, extra: Partial<Msg> = {}) => {
      const msg: Msg = { id: uid(), author: from, ts: now(), text, reactions: [], ...extra }
      dispatch({ t: 'post', ch, msg, active: activeRef.current })
      const c = CHANNEL_BY_ID[ch]
      if (ch !== activeRef.current && !c.muted && (c.kind !== 'channel' || mentionsMe(text))) notify(ch, from, text)
      return msg
    },
    [now, notify],
  )

  const incomingReply = useCallback(
    (ch: ChannelId, parent: string, from: UserId, text: string) => {
      dispatch({ t: 'reply', ch, parent, msg: { id: uid(), author: from, ts: now(), text, reactions: [] } })
    },
    [now],
  )

  const typeThen = useCallback(
    (key: string, user: UserId, ms: number, fn: () => void) => {
      setTypingFor(key, user, true)
      later(() => {
        setTypingFor(key, user, false)
        fn()
      }, ms)
    },
    [later, setTypingFor],
  )

  /* ── 台本: 時間差で届くメッセージ ── */
  useEffect(() => {
    const T = timers.current
    const steps: [number, () => void][] = [
      [4200, () => typeThen('dev', 'akari', 2600, () => incoming('dev', 'akari', '@凪 PR 見ました！ 端末を回転してもちらつかなくなってるの確認できました 🙌 マージして大丈夫です'))],
      [9800, () => dispatch({ t: 'react', ch: 'dev', id: 'd-pr', emoji: '🎉', user: 'minato', add: true })],
      [10600, () => dispatch({ t: 'react', ch: 'dev', id: 'd-pr', emoji: '🎉', user: 'kei', add: true })],
      [14500, () => typeThen('dm-minato', 'minato', 2200, () => incoming('dm-minato', 'minato', 'ステージングの DB、15:00 から 5 分だけ止めます 🙏 何かあれば言ってください'))],
      [20500, () => typeThen('t:d-u1', 'minato', 2000, () => incomingReply('dev', 'd-u1', 'minato', '429 で Retry-After ヘッダーが返ってきたら、そっちの秒数を優先する形にしますね'))],
      [27000, () => setPresence((p) => ({ ...p, kei: 'active' }))],
      [33000, () => incoming('release', 'ci', 'ビルドが完了しました', { ci: { status: 'success', title: 'shiosai-android #641', branch: 'release/2.4', commit: '1d7e9aa 潮位グラフの再描画を制限', duration: '6分05秒' } })],
      [41000, () => typeThen('dev', 'yuzu', 3000, () => incoming('dev', 'yuzu', '回帰テスト終わりました ✅ iOS 17 で 1 件だけ気になる挙動があったので、チェックリストのスレッドに書きます'))],
      [49000, () => typeThen('t:d-u4', 'yuzu', 2400, () => incomingReply('dev', 'd-u4', 'yuzu', '設定画面から戻ったときに、潮位の単位が一瞬 ft になります。3 回に 1 回くらいの再現率です'))],
    ]
    for (const [ms, fn] of steps) later(fn, ms)
    // 以降は雑多な発言がときどき流れてくる
    let n = 0
    const ambient = () => {
      if (n >= AMBIENT.length) return
      const a = AMBIENT[n++]
      typeThen(a.ch, a.from, 1800, () => incoming(a.ch, a.from, a.text, a.files ? { files: a.files } : {}))
      later(ambient, 22000 + Math.random() * 12000)
    }
    later(ambient, 58000)
    return () => {
      T.forEach((id) => window.clearTimeout(id))
      T.clear()
      replying.current = false
    }
  }, [later, typeThen, incoming, incomingReply])

  /* ── 自分の発言への自動返信 ── */
  const autoReply = useCallback(
    (ch: ChannelId, text: string, msgId: string, parent?: string) => {
      if (replying.current) return
      const c = CHANNEL_BY_ID[ch]
      const pres = presenceRef.current
      if (c.dm === 'ci') {
        replying.current = true
        later(() => {
          incoming(ch, 'ci', '🤖 最新のビルド状況: `release/2.4` は *すべて成功* しています（iOS #812 / Android #641）')
          replying.current = false
        }, 900)
        return
      }
      const cands = c.dm ? [c.dm] : c.members.filter((u) => u !== 'me' && !USERS[u].app && pres[u] !== 'offline')
      if (!cands.length || (c.dm && pres[c.dm] === 'offline')) return
      const who = pick(cands)
      const pool = /[?？]/.test(text)
        ? AUTO_REPLIES.question
        : /ありがと|感謝|助かり/.test(text)
          ? AUTO_REPLIES.thanks
          : /おはよ|おつかれ|お疲れ/.test(text)
            ? AUTO_REPLIES.greet
            : AUTO_REPLIES.plain
      replying.current = true
      const key = parent ? `t:${parent}` : ch
      if (Math.random() < 0.65) {
        const reactor = pick(cands)
        later(() => dispatch({ t: 'react', ch, id: msgId, emoji: pick(['👀', '✅', '👍', '🙌']), user: reactor, add: true }), 1300)
      }
      later(
        () =>
          typeThen(key, who, 1500 + Math.random() * 1200, () => {
            if (parent) incomingReply(ch, parent, who, pick(pool))
            else incoming(ch, who, pick(pool))
            replying.current = false
          }),
        800 + Math.random() * 700,
      )
    },
    [later, typeThen, incoming, incomingReply],
  )

  /* ── チャンネル操作 ── */
  const openChannel = useCallback(
    (id: ChannelId, focus = false) => {
      setDrawer(false)
      setOverlay(null)
      setSearchOpen(false)
      if (focus) setFocusNonce((n) => n + 1)
      if (id === activeRef.current) return
      const s = stateRef.current
      const u = s.unread[id] ?? 0
      const list = s.msgs[id]
      const m = u > 0 ? list[Math.max(0, list.length - u)] : undefined
      setDivider(m ? { ch: id, id: m.id, count: u, ts: m.ts } : null)
      dispatch({ t: 'read', ch: id })
      activeRef.current = id
      setActive(id)
      setThread(null)
      setEditing(null)
    },
    [],
  )

  const openThread = useCallback((ch: ChannelId, id: string) => {
    setThread({ ch, id })
    setOverlay(null)
    setThreadFocus((n) => n + 1)
  }, [])

  const react = useCallback((ch: ChannelId, id: string, emoji: string) => {
    dispatch({ t: 'react', ch, id, emoji, user: 'me' })
    setRecent((r) => [emoji, ...r.filter((e) => e !== emoji)].slice(0, 16))
  }, [])

  const closeOverlay = useCallback(
    (refocus = false) => {
      setOverlay((o) => {
        if (o && refocus) requestAnimationFrame(() => o.anchor.focus({ preventScroll: true }))
        return null
      })
    },
    [],
  )

  const removeMsg = useCallback(
    (ch: ChannelId, id: string) => {
      const found = findMsg(stateRef.current.msgs[ch], id)
      if (!found) return
      const index = found.parent ? (found.parent.replies ?? []).indexOf(found.msg) : stateRef.current.msgs[ch].indexOf(found.msg)
      dispatch({ t: 'delete', ch, id })
      if (thread?.id === id) setThread(null)
      if (found.msg.kind === 'ephemeral') return
      toast('メッセージを削除しました', { label: '元に戻す', fn: () => dispatch({ t: 'restore', ch, msg: found.msg, index, parent: found.parent?.id }) })
    },
    [toast, thread],
  )

  const jumpTo = useCallback(
    (ch: ChannelId, id: string, parent?: string) => {
      openChannel(ch)
      if (parent) {
        setThread({ ch, id: parent })
      }
      setOverlay(null)
      setSearchOpen(false)
      setFlash(id)
      setJump({ id, n: Date.now() })
      later(() => setFlash((f) => (f === id ? null : f)), 1900)
    },
    [openChannel, later],
  )

  /* ── ハドル ── */
  const leaveHuddle = useCallback(() => {
    setMyHuddle((cur) => {
      if (cur) {
        setHuddles((h) => {
          const x = h[cur]
          if (!x) return h
          const people = x.people.filter((p) => p !== 'me')
          const next = { ...h }
          if (people.length) next[cur] = { ...x, people }
          else delete next[cur]
          return next
        })
      }
      return null
    })
    setMuted(false)
  }, [])

  const joinHuddle = useCallback(
    (ch: ChannelId) => {
      if (myHuddle === ch) return
      if (myHuddle) leaveHuddle()
      const existing = huddlesRef.current[ch]
      setHuddles((h) => {
        const x = h[ch]
        return { ...h, [ch]: x ? { ...x, people: [...x.people.filter((p) => p !== 'me'), 'me'] } : { start: Date.now(), people: ['me'] } }
      })
      setMyHuddle(ch)
      setMuted(false)
      if (!existing) {
        dispatch({ t: 'post', ch, active: activeRef.current, msg: { id: uid(), author: 'me', ts: now(), text: 'がハドルを開始しました 🎧', kind: 'system', reactions: [] } })
        const c = CHANNEL_BY_ID[ch]
        const cands = (c.dm ? [c.dm] : c.members).filter((u) => u !== 'me' && !USERS[u].app && presenceRef.current[u] === 'active')
        if (cands.length) {
          const who = pick(cands)
          later(() => {
            setHuddles((h) => {
              const x = h[ch]
              if (!x || x.people.includes(who)) return h
              return { ...h, [ch]: { ...x, people: [...x.people, who] } }
            })
            toast(`${san(who)}がハドルに参加しました`)
          }, 3200)
        }
      }
    },
    [myHuddle, leaveHuddle, now, later, toast],
  )

  /* ── 送信 ── */
  const sendTo = useCallback(
    (ch: ChannelId, text: string, files: Attachment[], parent?: string) => {
      if (!parent && text.startsWith('/')) {
        const [, cmd = '', arg = ''] = /^\/(\S*)\s*([\s\S]*)$/.exec(text) ?? []
        const eph = (t: string) => dispatch({ t: 'post', ch, active: ch, msg: { id: uid(), author: 'bot', ts: now(), text: t, kind: 'ephemeral', reactions: [] } })
        switch (cmd) {
          case 'shrug': {
            const msg: Msg = { id: uid(), author: 'me', ts: now(), text: `${arg} ¯\\_(ツ)_/¯`.trim(), reactions: [] }
            dispatch({ t: 'post', ch, msg, active: ch })
            return
          }
          case 'topic':
            if (!arg.trim()) return eph('トピックを入力してください。例: `/topic 今週はリリース準備`')
            dispatch({ t: 'topic', ch, topic: arg.trim() })
            dispatch({ t: 'post', ch, active: ch, msg: { id: uid(), author: 'me', ts: now(), text: `がチャンネルトピックを「${arg.trim()}」に設定しました`, kind: 'system', reactions: [] } })
            return
          case 'huddle':
            joinHuddle(ch)
            return
          case 'remind':
            return eph(`⏰ 了解です。*${fmtTime(now() + 30 * 60e3)}* に「${arg.trim() || 'このチャンネルを確認'}」をリマインドします。`)
          case 'away': {
            const next: Presence = presenceRef.current.me === 'away' ? 'active' : 'away'
            setPresence((p) => ({ ...p, me: next }))
            return eph(next === 'away' ? 'ステータスを *離席中* にしました。' : 'ステータスを *アクティブ* に戻しました。')
          }
          default:
            return eph(`「/${cmd}」は有効なコマンドではありません。\`/\` を入力するとコマンドの一覧が出ます。`)
        }
      }
      const msg: Msg = { id: uid(), author: 'me', ts: now(), text, reactions: [], ...(files.length ? { files } : {}) }
      if (parent) {
        dispatch({ t: 'reply', ch, parent, msg, broadcast })
        setBroadcast(false)
      } else {
        dispatch({ t: 'post', ch, msg, active: ch })
        setDivider((d) => (d?.ch === ch ? null : d))
      }
      autoReply(ch, text, msg.id, parent)
    },
    [now, joinHuddle, autoReply, broadcast],
  )

  const saveEdit = useCallback((ch: ChannelId, id: string, text: string) => {
    dispatch({ t: 'edit', ch, id, text })
    setEditing(null)
  }, [])

  /* ── 検索 ── */
  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return []
    const out: { ch: ChannelId; msg: Msg; parent?: Msg }[] = []
    for (const c of CHANNELS) {
      for (const m of state.msgs[c.id]) {
        if (m.kind || m.broadcast) continue
        if (plain(m.text).toLowerCase().includes(q) || USERS[m.author].name.includes(q)) out.push({ ch: c.id, msg: m })
        for (const r of m.replies ?? []) if (plain(r.text).toLowerCase().includes(q)) out.push({ ch: c.id, msg: r, parent: m })
      }
    }
    return out.sort((a, b) => b.msg.ts - a.msg.ts).slice(0, 8)
  }, [query, state.msgs])

  /* ── キー操作(デモ内のみ) ── */
  const order = useMemo(() => CHANNELS.map((c) => c.id), [])
  const onKeyDown = (e: RKeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Escape') {
      if (overlay) {
        e.preventDefault()
        closeOverlay(true)
      } else if (lightbox) setLightbox(null)
      else if (searchOpen) setSearchOpen(false)
      else if (editing) setEditing(null)
      else if (thread) {
        setThread(null)
        setFocusNonce((n) => n + 1)
      } else if (drawer) setDrawer(false)
      return
    }
    if (e.altKey && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
      e.preventDefault()
      const i = order.indexOf(active)
      openChannel(order[(i + (e.key === 'ArrowDown' ? 1 : order.length - 1)) % order.length], true)
    }
  }

  const onPointerDownCapture = (e: React.PointerEvent) => {
    if (!overlay) return
    const t = e.target as Element
    if (t.closest('[data-overlay]') || overlay.anchor.contains(t)) return
    setOverlay(null)
  }

  const openOverlay = useCallback((o: Overlay) => {
    setOverlay((cur) => (cur && cur.anchor === o.anchor && cur.kind === o.kind ? null : o))
  }, [])

  const setMyPresence = useCallback((p: Presence) => setPresence((x) => ({ ...x, me: p })), [])

  const api: Api = {
    reduce,
    rootRef,
    presence,
    active,
    overlay,
    editing,
    flash,
    recent,
    huddles,
    myHuddle,
    muted,
    openChannel,
    openThread,
    react,
    openOverlay,
    closeOverlay,
    pickedEmoji: (e) => setRecent((r) => [e, ...r.filter((x) => x !== e)].slice(0, 16)),
    setEditing,
    saveEdit,
    removeMsg,
    showImage: setLightbox,
    toast,
    jumpTo,
    joinHuddle,
    leaveHuddle,
    setMuted,
    setMyPresence,
  }

  const c = CHANNEL_BY_ID[active]
  const msgs = state.msgs[active]
  const topic = state.topics[active]
  const threadParent = thread ? findMsg(state.msgs[thread.ch], thread.id)?.msg : undefined
  const pinned = msgs.filter((m) => m.pinned)
  const totalUnread = CHANNELS.reduce((n, x) => n + (x.id !== active && !x.muted ? (state.mentions[x.id] ?? 0) : 0), 0)
  const hud = huddles[active]
  const inHud = myHuddle === active

  const editLast = (list: Msg[]) => {
    const mine = [...list].reverse().find((m) => m.author === 'me' && !m.kind)
    if (mine) {
      setEditing(mine.id)
      setJump({ id: mine.id, n: Date.now() })
    }
  }

  return (
    <Ctx.Provider value={api}>
      <div
        ref={rootRef}
        onKeyDown={onKeyDown}
        onPointerDownCapture={onPointerDownCapture}
        className="@container/app relative flex h-full w-full overflow-hidden bg-white font-['Noto_Sans_JP',Inter,system-ui,sans-serif] text-[#1c2326] antialiased"
        style={
          {
            '--side': '#10292e',
            '--side-act': '#1f7c6e',
            '--side-fg': '#eef5f4',
            '--side-sub': '#a8bfbe',
            '--rail': '#0a1d21',
            '--acc': '#127a6c',
            '--coral': '#ef5f45',
            '--link': '#1565c0',
            '--line': '#e5e9eb',
            '--hover': '#f6f8f8',
            '--mention': '#fff8e1',
            '--sub': '#66737a',
          } as React.CSSProperties
        }
      >
        <style>{`
          @keyframes tc-flash { 0%, 35% { background-color: #fff0b3; } 100% { background-color: transparent; } }
          .tc-flash { animation: tc-flash 1.9s ease-out; }
          @keyframes tc-dot { 0%, 60%, 100% { transform: translateY(0); opacity: .45; } 30% { transform: translateY(-3px); opacity: 1; } }
          .tc-dot { animation: tc-dot 1.1s infinite; }
          @keyframes tc-speak { 0% { box-shadow: 0 0 0 0 rgba(61,220,151,.85); } 100% { box-shadow: 0 0 0 7px rgba(61,220,151,0); } }
          .tc-speak { animation: tc-speak 1s ease-out infinite; outline: 2px solid #3ddc97; }
          .tc-scroll { scrollbar-width: thin; scrollbar-color: rgba(20,40,45,.2) transparent; }
          .tc-side-scroll { scrollbar-width: thin; scrollbar-color: rgba(255,255,255,.18) transparent; }
        `}</style>

        {/* ドロワーの背景(狭い幅のみ) */}
        <AnimatePresence>
          {drawer && (
            <motion.div
              key="scrim"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setDrawer(false)}
              className="absolute inset-0 z-40 bg-[#061214]/50 @3xl/app:hidden"
              aria-hidden
            />
          )}
        </AnimatePresence>

        <aside
          aria-label="ワークスペース"
          className={`absolute inset-y-0 left-0 z-50 flex w-[min(86%,330px)] shadow-2xl transition-[translate,opacity,visibility] ${reduce ? 'duration-150' : 'duration-300 ease-[cubic-bezier(.2,.8,.2,1)]'} @3xl/app:static @3xl/app:visible @3xl/app:w-auto @3xl/app:translate-x-0 @3xl/app:opacity-100 @3xl/app:shadow-none ${
            drawer ? 'visible translate-x-0 opacity-100' : `invisible ${reduce ? 'opacity-0' : '-translate-x-full'}`
          }`}
        >
          <Rail />
          <Sidebar state={state} drafts={drafts} collapsed={collapsed} toggle={(s) => setCollapsed((x) => ({ ...x, [s]: !x[s] }))} />
        </aside>

        <div className="relative flex min-w-0 flex-1">
          <main className="@container/main relative flex min-w-0 flex-1 flex-col bg-white" aria-label={c.dm ? `${c.name} とのダイレクトメッセージ` : `#${c.name}`}>
            {/* チャンネルヘッダー */}
            <header className="relative z-20 flex h-[56px] shrink-0 items-center gap-1.5 border-b border-[var(--line)] px-2.5 @lg:px-4">
              <span className="relative @3xl/app:hidden">
                <IconBtn label="チャンネル一覧を開く" onClick={() => setDrawer(true)}>
                  <Menu size={19} />
                </IconBtn>
                {totalUnread > 0 && (
                  <span className="pointer-events-none absolute -top-0.5 -right-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-[var(--coral)] px-1 text-[10px] font-bold text-white">{totalUnread}</span>
                )}
              </span>
              <div className="min-w-0 flex-1 pl-1">
                <h2 className="flex min-w-0 items-center gap-1.5 text-[15.5px] leading-tight font-extrabold">
                  <span className="text-[#5b676d]">
                    <ChannelGlyph c={c} size={16} presence={c.dm ? presence[c.dm] : undefined} />
                  </span>
                  <span className="truncate" style={{ ['--ring' as string]: '#fff' }}>
                    {c.name}
                  </span>
                  {c.dm && USERS[c.dm].status && <span className="text-[13px] font-normal">{USERS[c.dm].status!.emoji}</span>}
                </h2>
                <p className="mt-0.5 truncate text-[12px] text-[var(--sub)]">{c.dm ? `${USERS[c.dm].role} · ${PRESENCE_LABEL[presence[c.dm]]}${USERS[c.dm].status ? ` · ${USERS[c.dm].status!.text}` : ''}` : topic}</p>
              </div>

              {!c.dm && (
                <button
                  type="button"
                  aria-label={`メンバー ${c.members.length}人`}
                  onClick={(e) => openOverlay({ kind: 'members', anchor: e.currentTarget })}
                  className="hidden h-8 items-center gap-1.5 rounded-lg border border-[var(--line)] pr-2 pl-1 hover:bg-[var(--hover)] focus-visible:outline-2 focus-visible:outline-[var(--acc)] @md:flex"
                >
                  <span className="flex -space-x-1.5">
                    {c.members
                      .filter((u) => !USERS[u].app)
                      .slice(0, 3)
                      .map((u) => (
                        <span key={u} className="rounded-[6px] ring-2 ring-white">
                          <Avatar id={u} size={20} />
                        </span>
                      ))}
                  </span>
                  <span className="text-[12.5px] font-semibold text-[#3d494e] tabular-nums">{c.members.length}</span>
                </button>
              )}

              {inHud ? (
                <button
                  type="button"
                  onClick={leaveHuddle}
                  aria-label="ハドルから退出"
                  className="flex h-8 items-center gap-1.5 rounded-lg bg-[#2bac76] px-2.5 text-[12.5px] font-semibold text-white hover:bg-[#25975f] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2bac76]"
                >
                  <Headphones size={15} />
                  <span className="hidden @md:inline">ハドル中</span>
                </button>
              ) : hud ? (
                <button
                  type="button"
                  onClick={() => joinHuddle(active)}
                  className="flex h-8 items-center gap-1.5 rounded-lg border border-[#2bac76] bg-[#e9f8f0] px-2 text-[12.5px] font-semibold text-[#1f7a4f] hover:bg-[#dcf3e7] focus-visible:outline-2 focus-visible:outline-[#2bac76]"
                >
                  <Headphones size={15} />
                  <span className="flex -space-x-1">
                    {hud.people.slice(0, 2).map((p) => (
                      <span key={p} className="rounded-[5px] ring-2 ring-[#e9f8f0]">
                        <Avatar id={p} size={16} />
                      </span>
                    ))}
                  </span>
                  参加
                </button>
              ) : (
                <IconBtn label="ハドルを開始" onClick={() => joinHuddle(active)}>
                  <Headphones size={17} />
                </IconBtn>
              )}

              <span className="relative">
                <IconBtn label={`ピン留め ${pinned.length}件`} onClick={(e) => openOverlay({ kind: 'pinned', anchor: e.currentTarget })}>
                  <Pin size={16} />
                </IconBtn>
                {pinned.length > 0 && (
                  <span className="pointer-events-none absolute top-0.5 right-0.5 grid size-3.5 place-items-center rounded-full bg-[#5b676d] text-[9px] font-bold text-white">{pinned.length}</span>
                )}
              </span>

              {/* 検索: 広い幅は入力欄、狭い幅はアイコン → ヘッダー全体に重なる */}
              <div className={`${searchOpen ? 'absolute inset-0 z-10 flex items-center gap-1.5 bg-white px-2.5' : 'hidden'} @2xl:static @2xl:flex @2xl:w-[200px] @2xl:bg-transparent @2xl:p-0 @4xl:w-[240px]`}>
                <label className="flex h-8 min-w-0 flex-1 items-center gap-1.5 rounded-lg border border-[#d5dcdf] bg-[#f6f8f8] px-2 transition-colors focus-within:border-[var(--acc)] focus-within:bg-white">
                  <Search size={14} className="shrink-0 text-[var(--sub)]" />
                  <input
                    ref={searchRef}
                    value={query}
                    onChange={(e) => {
                      setQuery(e.target.value)
                      setSearchIdx(0)
                      setSearchOpen(true)
                    }}
                    onFocus={() => setSearchOpen(true)}
                    onKeyDown={(e) => {
                      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
                        e.preventDefault()
                        if (results.length) setSearchIdx((i) => (i + (e.key === 'ArrowDown' ? 1 : results.length - 1)) % results.length)
                      } else if (e.key === 'Enter' && results[searchIdx]) {
                        const r = results[searchIdx]
                        jumpTo(r.ch, r.msg.id, r.parent?.id)
                      } else if (e.key === 'Escape') {
                        e.stopPropagation()
                        if (query) setQuery('')
                        else {
                          setSearchOpen(false)
                          e.currentTarget.blur()
                        }
                      }
                    }}
                    placeholder="ミナモ工房 を検索"
                    aria-label="メッセージを検索"
                    role="combobox"
                    aria-expanded={searchOpen && !!query.trim()}
                    aria-controls="tc-search-results"
                    aria-activedescendant={results[searchIdx] ? `tc-sr-${searchIdx}` : undefined}
                    className="min-w-0 flex-1 bg-transparent text-[13px] outline-none placeholder:text-[#8d999e]"
                  />
                  {query && (
                    <button type="button" aria-label="検索語を消去" onClick={() => setQuery('')} className="grid size-5 place-items-center rounded text-[var(--sub)] hover:bg-black/5">
                      <X size={13} />
                    </button>
                  )}
                </label>
                <button type="button" onClick={() => setSearchOpen(false)} className="shrink-0 px-1.5 text-[13px] font-semibold text-[var(--acc)] @2xl:hidden">
                  閉じる
                </button>
              </div>
              <IconBtn
                label="検索"
                onClick={() => {
                  setSearchOpen(true)
                  requestAnimationFrame(() => searchRef.current?.focus({ preventScroll: true }))
                }}
                className="@2xl:hidden"
              >
                <Search size={17} />
              </IconBtn>

              <AnimatePresence>
                {searchOpen && query.trim() && (
                  <motion.div
                    key="sr"
                    data-overlay
                    initial={reduce ? { opacity: 0 } : { opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.14 }}
                    className="absolute top-[52px] right-2 z-30 w-[min(400px,calc(100%-16px))] overflow-hidden rounded-xl border border-[var(--line)] bg-white shadow-[0_16px_40px_rgba(10,25,30,0.2)]"
                  >
                    <div className="border-b border-[var(--line)] px-3 py-2 text-[11.5px] font-semibold text-[var(--sub)]">
                      {results.length ? `「${query.trim()}」のメッセージ ${results.length}件` : `「${query.trim()}」に一致するメッセージはありません`}
                    </div>
                    <ul id="tc-search-results" role="listbox" aria-label="検索結果" className="tc-scroll max-h-[320px] overflow-y-auto py-1">
                      {results.map((r, i) => {
                        const t = plain(r.msg.text)
                        const q = query.trim().toLowerCase()
                        const at = t.toLowerCase().indexOf(q)
                        const start = Math.max(0, at - 18)
                        const snip = t.slice(start, start + 80)
                        const hi = at >= 0 ? at - start : -1
                        return (
                          <li
                            key={`${r.ch}-${r.msg.id}`}
                            id={`tc-sr-${i}`}
                            role="option"
                            aria-selected={i === searchIdx}
                            onMouseEnter={() => setSearchIdx(i)}
                            onMouseDown={(e) => {
                              e.preventDefault()
                              jumpTo(r.ch, r.msg.id, r.parent?.id)
                            }}
                            className={`mx-1 flex cursor-pointer gap-2.5 rounded-lg px-2 py-2 ${i === searchIdx ? 'bg-[#eef6f4]' : ''}`}
                          >
                            <Avatar id={r.msg.author} size={28} />
                            <div className="min-w-0 flex-1">
                              <div className="flex items-baseline gap-1.5 text-[12px]">
                                <b className="font-bold">{USERS[r.msg.author].short}</b>
                                <span className="truncate text-[var(--sub)]">
                                  {CHANNEL_BY_ID[r.ch].dm ? 'DM' : `#${CHANNEL_BY_ID[r.ch].name}`}
                                  {r.parent ? ' · スレッド' : ''} · {dayLabel(r.msg.ts)} {fmtTime(r.msg.ts)}
                                </span>
                              </div>
                              <p className="truncate text-[13px] text-[#3d494e]">
                                {start > 0 && '…'}
                                {hi >= 0 ? (
                                  <>
                                    {snip.slice(0, hi)}
                                    <mark className="rounded-sm bg-[#ffe58f] px-px text-inherit">{snip.slice(hi, hi + q.length)}</mark>
                                    {snip.slice(hi + q.length)}
                                  </>
                                ) : (
                                  snip
                                )}
                              </p>
                            </div>
                          </li>
                        )
                      })}
                    </ul>
                  </motion.div>
                )}
              </AnimatePresence>
            </header>

            {myHuddle && (
              <div className="@3xl/app:hidden">
                <HuddleBar variant="bar" />
              </div>
            )}

            <MessageList key={active} c={c} msgs={msgs} divider={divider} onClearDivider={() => setDivider(null)} jump={thread && jump && findMsg(state.msgs[thread.ch], jump.id)?.parent ? null : jump} />

            <Composer
              key={`c-${active}`}
              draft={drafts[active] ?? ''}
              setDraft={(v) => setDrafts((d) => ({ ...d, [active]: v }))}
              placeholder={c.dm ? `${c.kind === 'app' ? c.name : `${USERS[c.dm].short}さん`}へのメッセージ` : `#${c.name} へのメッセージ`}
              members={c.members}
              onSend={(t, f) => sendTo(active, t, f)}
              onEditLast={() => editLast(msgs)}
              focusNonce={focusNonce}
              typing={typing[active] ?? []}
              allowSlash
            />
          </main>

          {/* スレッド */}
          <AnimatePresence>
            {thread && threadParent && (
              <ThreadPanel
                key={thread.id}
                ch={thread.ch}
                parent={threadParent}
                jump={jump}
                onClose={() => {
                  setThread(null)
                  setFocusNonce((n) => n + 1)
                }}
                composer={
                  <Composer
                    draft={drafts[`t:${thread.id}`] ?? ''}
                    setDraft={(v) => setDrafts((d) => ({ ...d, [`t:${thread.id}`]: v }))}
                    placeholder="返信…"
                    members={CHANNEL_BY_ID[thread.ch].members}
                    onSend={(t, f) => sendTo(thread.ch, t, f, thread.id)}
                    onEditLast={() => editLast(threadParent.replies ?? [])}
                    focusNonce={threadFocus}
                    typing={typing[`t:${thread.id}`] ?? []}
                    allowSlash={false}
                    extra={
                      !CHANNEL_BY_ID[thread.ch].dm && (
                        <label className="ml-1 flex cursor-pointer items-center gap-1.5 truncate text-[12px] text-[var(--sub)] select-none">
                          <input type="checkbox" checked={broadcast} onChange={(e) => setBroadcast(e.target.checked)} className="peer sr-only" />
                          <span className="grid size-3.5 shrink-0 place-items-center rounded-[4px] border border-[#9aa6ab] bg-white text-white peer-checked:border-[var(--acc)] peer-checked:bg-[var(--acc)] peer-focus-visible:outline-2 peer-focus-visible:outline-offset-1 peer-focus-visible:outline-[var(--acc)]">
                            {broadcast && <Check size={10} strokeWidth={3.5} />}
                          </span>
                          <span className="truncate">#{CHANNEL_BY_ID[thread.ch].name} にも送信</span>
                        </label>
                      )
                    }
                  />
                }
              />
            )}
          </AnimatePresence>
        </div>

        {/* ポップオーバー */}
        <AnimatePresence>
          {overlay && (
            <OverlayView
              key={`${overlay.kind}-${'forId' in overlay ? overlay.forId : ''}`}
              overlay={overlay}
              state={state}
              close={() => closeOverlay(true)}
              onPin={(ch, id) => dispatch({ t: 'pin', ch, id })}
              onMarkUnread={(ch, id) => {
                const list = state.msgs[ch]
                const i = list.findIndex((m) => m.id === id)
                if (i >= 0) setDivider({ ch, id, count: list.length - i, ts: list[i].ts })
                toast('ここから未読にしました')
              }}
            />
          )}
        </AnimatePresence>

        {/* トースト */}
        <div className="pointer-events-none absolute top-3 right-3 z-[80] flex w-[min(330px,calc(100%-24px))] flex-col items-end gap-2" aria-live="polite">
          <AnimatePresence initial={false}>
            {toasts.map((t) => (
              <motion.div
                key={t.id}
                layout={!reduce}
                initial={reduce ? { opacity: 0 } : { opacity: 0, x: 40, scale: 0.96 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={reduce ? { opacity: 0 } : { opacity: 0, x: 40 }}
                transition={reduce ? { duration: 0.15 } : { type: 'spring', stiffness: 380, damping: 30 }}
                className="pointer-events-auto w-full"
              >
                {t.kind === 'info' ? (
                  <div className="flex items-center gap-3 rounded-xl bg-[#1c2326] px-3.5 py-2.5 text-[13px] text-white shadow-xl">
                    <span className="min-w-0 flex-1">{t.text}</span>
                    {t.action && (
                      <button
                        type="button"
                        onClick={() => {
                          t.action!.fn()
                          setToasts((x) => x.filter((y) => y.id !== t.id))
                        }}
                        className="shrink-0 font-bold text-[#5fd1b9] hover:underline"
                      >
                        {t.action.label}
                      </button>
                    )}
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      openChannel(t.ch, true)
                      setToasts((x) => x.filter((y) => y.id !== t.id))
                    }}
                    className="flex w-full items-start gap-2.5 rounded-xl border border-[var(--line)] bg-white p-3 text-left shadow-[0_12px_32px_rgba(10,25,30,0.18)] hover:bg-[#fbfcfc] focus-visible:outline-2 focus-visible:outline-[var(--acc)]"
                  >
                    <Avatar id={t.from} size={34} />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-baseline gap-1.5 text-[12px] text-[var(--sub)]">
                        <b className="text-[13px] font-bold text-[#1c2326]">{USERS[t.from].name}</b>
                        {CHANNEL_BY_ID[t.ch].dm ? 'ダイレクトメッセージ' : `#${CHANNEL_BY_ID[t.ch].name}`}
                      </span>
                      <span className="mt-0.5 line-clamp-2 text-[13px] text-[#3d494e]">{plain(t.text)}</span>
                    </span>
                  </button>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* 画像のライトボックス */}
        <AnimatePresence>
          {lightbox && (
            <motion.div
              key="lb"
              role="dialog"
              aria-modal="true"
              aria-label={lightbox.name}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: reduce ? 0.12 : 0.2 }}
              onClick={() => setLightbox(null)}
              className="absolute inset-0 z-[90] flex flex-col items-center justify-center gap-3 bg-[#061214]/85 p-6 backdrop-blur-sm"
            >
              <div className="flex w-full max-w-[760px] items-center justify-between text-white">
                <span className="truncate text-[13px] font-semibold">{lightbox.name}</span>
                <button
                  type="button"
                  autoFocus
                  aria-label="閉じる"
                  onClick={() => setLightbox(null)}
                  className="grid size-9 place-items-center rounded-full bg-white/10 hover:bg-white/20 focus-visible:outline-2 focus-visible:outline-white"
                >
                  <X size={18} />
                </button>
              </div>
              <motion.div
                initial={reduce ? false : { scale: 0.94 }}
                animate={{ scale: 1 }}
                onClick={(e) => e.stopPropagation()}
                className="max-h-[calc(100%-80px)] w-full max-w-[760px] overflow-hidden rounded-xl shadow-2xl"
                style={{ aspectRatio: `${lightbox.w} / ${lightbox.h}`, maxWidth: `min(760px, calc((100cqh - 120px) * ${lightbox.w / lightbox.h}))` }}
              >
                <Art kind={lightbox.art} />
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </Ctx.Provider>
  )
}

/* ───────────── スレッドパネル ───────────── */

function ThreadPanel({
  ch,
  parent,
  composer,
  onClose,
  jump,
}: {
  ch: ChannelId
  parent: Msg
  composer: ReactNode
  onClose: () => void
  jump: { id: string; n: number } | null
}) {
  const api = useApi()
  const ref = useRef<HTMLDivElement>(null)
  const replies = parent.replies ?? []
  const c = CHANNEL_BY_ID[ch]
  const count = replies.length
  const first = useRef(true)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    el.scrollTo({ top: el.scrollHeight, behavior: first.current || api.reduce ? 'auto' : 'smooth' })
    first.current = false
  }, [count, api.reduce])
  useLayoutEffect(() => {
    if (!jump) return
    const el = ref.current
    const t = el?.querySelector<HTMLElement>(`[data-mid="${jump.id}"]`)
    if (el && t) scrollToEl(el, t, el.clientHeight / 2 - t.offsetHeight / 2, false)
  }, [jump])
  return (
    <motion.aside
      aria-label="スレッド"
      initial={api.reduce ? { opacity: 0 } : { opacity: 0, x: 28 }}
      animate={{ opacity: 1, x: 0 }}
      exit={api.reduce ? { opacity: 0 } : { opacity: 0, x: 28 }}
      transition={api.reduce ? { duration: 0.14 } : { type: 'spring', stiffness: 380, damping: 36 }}
      className="@container absolute inset-0 z-30 flex flex-col border-l border-[var(--line)] bg-white @5xl/app:static @5xl/app:w-[330px] @5xl/app:shrink-0 @6xl/app:w-[370px]"
    >
      <header className="flex h-[56px] shrink-0 items-center gap-1.5 border-b border-[var(--line)] px-2.5">
        <IconBtn label="スレッドを閉じる" onClick={onClose} className="@5xl/app:hidden">
          <ChevronLeft size={19} />
        </IconBtn>
        <div className="min-w-0 flex-1 pl-1">
          <h2 className="text-[15px] font-extrabold">スレッド</h2>
          <p className="flex items-center gap-0.5 truncate text-[12px] text-[var(--sub)]">
            {c.dm ? c.name : <>#{c.name}</>}
          </p>
        </div>
        <IconBtn label="スレッドを閉じる" onClick={onClose} className="hidden @5xl/app:grid">
          <X size={18} />
        </IconBtn>
      </header>
      <div ref={ref} data-msglist className="tc-scroll min-h-0 flex-1 overflow-x-hidden overflow-y-auto pt-5 pb-3">
        <MessageRow ch={ch} msg={parent} compact={false} inThread />
        <div className="my-2 flex items-center gap-3 px-4">
          <span className="text-[12px] font-semibold whitespace-nowrap text-[var(--sub)]">{count ? `${count}件の返信` : 'まだ返信はありません'}</span>
          <span className="h-px flex-1 bg-[var(--line)]" />
        </div>
        <AnimatePresence initial={false}>
          {replies.map((r, i) => (
            <motion.div key={r.id} {...rowMotion(api.reduce)}>
              <MessageRow ch={ch} msg={r} compact={isCompact(replies[i - 1], r)} inThread />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
      {composer}
    </motion.aside>
  )
}

/* ───────────── ポップオーバーの中身 ───────────── */

function OverlayView({
  overlay,
  state,
  close,
  onPin,
  onMarkUnread,
}: {
  overlay: Overlay
  state: ChatState
  close: () => void
  onPin: (ch: ChannelId, id: string) => void
  onMarkUnread: (ch: ChannelId, id: string) => void
}) {
  const api = useApi()
  switch (overlay.kind) {
    case 'emoji':
      return (
        <Popover anchor={overlay.anchor} width={318} align={overlay.align} label="絵文字ピッカー">
          <EmojiPicker
            onPick={(e) => {
              overlay.onPick(e)
              api.pickedEmoji(e)
              close()
            }}
          />
        </Popover>
      )
    case 'more': {
      const found = findMsg(state.msgs[overlay.ch], overlay.id)
      if (!found) return null
      const m = found.msg
      const own = m.author === 'me'
      return (
        <Popover anchor={overlay.anchor} width={220} label="メッセージのメニュー">
          <div role="menu" aria-label="メッセージのメニュー" className="p-1.5">
            <MenuItem
              icon={m.pinned ? <PinOff size={15} /> : <Pin size={15} />}
              label={m.pinned ? 'ピン留めを外す' : 'チャンネルにピン留め'}
              onClick={() => {
                onPin(overlay.ch, overlay.id)
                api.toast(m.pinned ? 'ピン留めを外しました' : 'ピン留めしました')
                close()
              }}
            />
            <MenuItem
              icon={<Link2 size={15} />}
              label="リンクをコピー"
              onClick={() => {
                navigator.clipboard?.writeText(`https://minamo.tsudoi.chat/archives/${overlay.ch}/${overlay.id}`).catch(() => undefined)
                api.toast('メッセージへのリンクをコピーしました')
                close()
              }}
            />
            {!overlay.inThread && !found.parent && (
              <MenuItem
                icon={<CircleDot size={15} />}
                label="ここから未読にする"
                onClick={() => {
                  onMarkUnread(overlay.ch, overlay.id)
                  close()
                }}
              />
            )}
            {own && (
              <>
                <div className="my-1 h-px bg-[var(--line)]" />
                <MenuItem
                  icon={<Pencil size={15} />}
                  label="メッセージを編集"
                  onClick={() => {
                    api.setEditing(overlay.id)
                    close()
                  }}
                />
                <MenuItem
                  danger
                  icon={<Trash2 size={15} />}
                  label="メッセージを削除"
                  onClick={() => {
                    api.closeOverlay()
                    api.removeMsg(overlay.ch, overlay.id)
                  }}
                />
              </>
            )}
          </div>
        </Popover>
      )
    }
    case 'members': {
      const c = CHANNEL_BY_ID[api.active]
      return (
        <Popover anchor={overlay.anchor} width={290} label="メンバー">
          <div className="border-b border-[var(--line)] px-3.5 py-2.5 text-[13px] font-bold">
            #{c.name} のメンバー <span className="font-normal text-[var(--sub)]">{c.members.length}人</span>
          </div>
          <ul className="tc-scroll max-h-[300px] overflow-y-auto p-1.5">
            {c.members.map((u) => (
              <li key={u}>
                <button
                  type="button"
                  onClick={() => {
                    if (u === 'me') return
                    const dm = CHANNELS.find((x) => x.dm === u)
                    if (dm) api.openChannel(dm.id, true)
                  }}
                  className="flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left hover:bg-[#f1f5f4] focus-visible:outline-2 focus-visible:outline-[var(--acc)]"
                >
                  <Avatar id={u} size={30} presence={api.presence[u]} ring="#fff" />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1 text-[13.5px] font-semibold">
                      {USERS[u].name}
                      {u === 'me' && <span className="text-[11.5px] font-normal text-[var(--sub)]">（あなた）</span>}
                      {USERS[u].status && <span className="text-[12px]">{USERS[u].status!.emoji}</span>}
                    </span>
                    <span className="block truncate text-[11.5px] text-[var(--sub)]">
                      {USERS[u].role} · {PRESENCE_LABEL[api.presence[u]]}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </Popover>
      )
    }
    case 'pinned': {
      const ch = api.active
      const list = state.msgs[ch].filter((m) => m.pinned)
      return (
        <Popover anchor={overlay.anchor} width={320} label="ピン留め">
          <div className="border-b border-[var(--line)] px-3.5 py-2.5 text-[13px] font-bold">ピン留めされたメッセージ</div>
          {list.length === 0 ? (
            <p className="px-4 py-8 text-center text-[13px] text-[var(--sub)]">
              まだピン留めはありません。
              <br />
              メッセージの「…」からピン留めできます。
            </p>
          ) : (
            <ul className="tc-scroll max-h-[320px] overflow-y-auto p-1.5">
              {list.map((m) => (
                <li key={m.id}>
                  <button
                    type="button"
                    onClick={() => api.jumpTo(ch, m.id)}
                    className="flex w-full gap-2.5 rounded-lg px-2 py-2 text-left hover:bg-[#f1f5f4] focus-visible:outline-2 focus-visible:outline-[var(--acc)]"
                  >
                    <Avatar id={m.author} size={26} />
                    <span className="min-w-0 flex-1">
                      <span className="block text-[12px] text-[var(--sub)]">
                        <b className="font-bold text-[#1c2326]">{USERS[m.author].short}</b> · {dayLabel(m.ts)} {fmtTime(m.ts)}
                      </span>
                      <span className="line-clamp-2 text-[13px] text-[#3d494e]">{plain(m.text)}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Popover>
      )
    }
    case 'status': {
      const opts: { p: Presence; label: string; icon: ReactNode }[] = [
        { p: 'active', label: 'アクティブ', icon: <span className="size-2.5 rounded-full bg-[#2bac76]" /> },
        { p: 'away', label: '離席中にする', icon: <span className="size-2.5 rounded-full border-[1.5px] border-[#c3a14a]" /> },
        { p: 'dnd', label: '通知を一時停止', icon: <Moon size={13} className="text-[#e0503c]" /> },
      ]
      return (
        <Popover anchor={overlay.anchor} width={250} align="start" label="ステータス">
          <div className="flex items-center gap-2.5 border-b border-[var(--line)] p-3">
            <Avatar id="me" size={38} presence={api.presence.me} ring="#fff" />
            <div>
              <div className="text-[14px] font-bold">{USERS.me.name}</div>
              <div className="text-[12px] text-[var(--sub)]">{USERS.me.role}</div>
            </div>
          </div>
          <div role="menu" className="p-1.5">
            {opts.map((o) => (
              <button
                key={o.p}
                type="button"
                role="menuitemradio"
                aria-checked={api.presence.me === o.p}
                onClick={() => {
                  api.setMyPresence(o.p)
                  close()
                }}
                className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-1.5 text-left text-[13.5px] outline-none hover:bg-[var(--acc)] hover:text-white focus-visible:bg-[var(--acc)] focus-visible:text-white"
              >
                <span className="grid w-4 place-items-center">{o.icon}</span>
                {o.label}
                {api.presence.me === o.p && <Check size={14} className="ml-auto" />}
              </button>
            ))}
          </div>
        </Popover>
      )
    }
    case 'profile': {
      const u = USERS[overlay.user]
      const dm = CHANNELS.find((x) => x.dm === overlay.user)
      return (
        <Popover anchor={overlay.anchor} width={260} align="start" label={`${u.name} のプロフィール`}>
          <div className="h-14" style={{ background: `linear-gradient(120deg, ${u.bg}, ${u.app ? '#2c5d63' : u.shirt}55)` }} />
          <div className="-mt-8 px-4 pb-4">
            <span className="inline-block rounded-[14px] ring-4 ring-white">
              <Avatar id={overlay.user} size={60} />
            </span>
            <div className="mt-1.5 flex items-center gap-1.5 text-[16px] font-extrabold">
              {u.name}
              {u.status && <span className="text-[14px]">{u.status.emoji}</span>}
            </div>
            <div className="text-[12.5px] text-[var(--sub)]">
              {u.role}
              {u.status ? ` · ${u.status.text}` : ''}
            </div>
            <div className="mt-1.5 flex items-center gap-1.5 text-[12.5px] text-[#3d494e]">
              <span className="relative size-2.5">
                <PresenceDot p={api.presence[overlay.user]} size={9} ring="#fff" />
              </span>
              {PRESENCE_LABEL[api.presence[overlay.user]]}
            </div>
            {overlay.user !== 'me' && dm && (
              <button
                type="button"
                onClick={() => api.openChannel(dm.id, true)}
                className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg border border-[#cfd6d8] py-1.5 text-[13px] font-semibold hover:bg-[#f3f5f5] focus-visible:outline-2 focus-visible:outline-[var(--acc)]"
              >
                <MessageSquareText size={15} /> メッセージ
              </button>
            )}
          </div>
        </Popover>
      )
    }
  }
}

