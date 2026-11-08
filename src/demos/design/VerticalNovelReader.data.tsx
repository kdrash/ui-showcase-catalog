import type { ReactNode } from 'react'

/**
 * 縦書きリーダーの本文データ(架空の短編「潮見坂の時計屋」)と、その組版用マークアップの変換。
 * - ルビは青空文庫風の ｜親文字《るび》、傍点は **語**、半角2桁の数字と !? は自動で縦中横にする
 * - 段落を「文」単位の <span data-a> に分け、ページ割り付け後の位置を測るアンカーにする
 *   (しおりと「文字サイズを変えても読んでいた場所を保つ」はこのアンカー番号で記録する)
 */

export const BOOK_TITLE = '潮見坂の時計屋'
export const BOOK_AUTHOR = '水城 透'
export const BOOK_IMPRINT = '灯舟文庫'

type Chapter = { num: string; title: string; text: string }

const CHAPTERS: Chapter[] = [
  {
    num: '一',
    title: '潮見坂',
    text: `
汐見町の坂は、海に向かってまっすぐに落ちている。朝になると坂の下から潮の匂いがのぼってきて、軒先に吊るした風鈴を、まだ誰も起きないうちから鳴らしていく。
その坂の中ほどに、｜柚木《ゆのき》時計店はある。間口一間ほどの小さな店で、｜硝子《ガラス》戸には金の文字で屋号が書かれているが、半分ほどは剥げて、もう読む人もいない。けれど、それで困る者はいなかった。**読む必要がない**のだ。この町の人間なら誰でも、そこが時計屋であることを知っている。
店主の柚木は、今年で67になる。毎朝六時に起きて、表の掛け時計の｜螺子《ねじ》を巻き、湯を沸かして一杯だけ番茶を飲み、それから作業机に向かう。机の上には、町じゅうから預かった時計が、まるで眠っている小鳥のように並んでいる。
「直るのかい」と訊かれると、柚木はいつも少し考えてから、こう答える。
「時計は、たいてい直りたがっているものです」
それが返事になっているのかどうか、訊いた方にもよくわからない。けれど一週間もすると、時計はちゃんと動きはじめて、持ち主の手首や｜箪笥《たんす》の上へ帰っていく。
「えっ、もう直ったの!?」
目覚まし時計を受け取りにきた魚屋の息子は、そう言って目を丸くした。柚木は黙って笑い、小さな紙袋にそれを入れてやった。坂の下では、今日も波が、同じ速さで寄せては返していた。
`,
  },
  {
    num: '二',
    title: '止まった時計',
    text: `
十一月のはじめ、冷たい雨の降る午後に、ひとりの少女が店の戸を開けた。
紺色の傘をきちんと畳み、｜框《かまち》の前で一度だけ深く頭を下げる。中学生くらいだろうか。濡れた前髪の下で、目だけがやけに大人びていた。
「これを、直してほしいんです」
差し出されたのは、古い懐中時計だった。銀の蓋はところどころ黒ずみ、｜竜頭《りゅうず》の溝には細かな砂が詰まっている。蓋を開けると、針は11時58分を指したまま止まっていた。
「祖父のです。ずっと、船に乗っていました」
少女は朝倉｜小夜《さよ》と名乗った。祖父は先月、病院のベッドで静かに息を引き取ったのだという。最期まで、この時計を枕もとに置いていたらしい。
柚木は時計を｜掌《てのひら》にのせ、片目にルーペをはめた。機械そのものは悪くない。ただ、長いあいだ潮風にさらされたせいで、細かな歯車のあいだに塩が結晶していた。
「少し時間がかかります。三日……いや、四日ください」
「動くようになりますか」
「なりますよ」と柚木は言った。「この時計は、まだ**止まりたくない**と言っていますから」
小夜は不思議そうに柚木の顔を見て、それから、ほんのすこしだけ笑った。雨の音が店じゅうの時計の音と混じりあって、しばらくのあいだ、ふたりのあいだに降っていた。
`,
  },
  {
    num: '三',
    title: '十二時の汽笛',
    text: `
四日目の夕方、雨はあがり、坂の上の空は｜鴇色《ときいろ》に染まっていた。
小夜がやって来たとき、懐中時計は作業机の真ん中で、小さな、けれど確かな音をたてていた。こち、こち、こち。その音は店じゅうの時計の音にまぎれることなく、まっすぐに彼女の耳へ届いた。
「動いてる」
小夜はそう言ったきり、しばらく黙っていた。
「ひとつ、お伝えしておきたいことがあります」と柚木は言った。「蓋の裏に、文字が刻まれていました。汚れで見えなくなっていたのを、磨いたら出てきたんです」
柚木が蓋を開けて差し出す。内側には、細い線でこう彫られていた。
>小夜へ　十二時の汽笛が鳴ったら、帰っておいで。
「祖父は、わたしが小さいころ、いつも港で待っていてくれたんです。お昼の汽笛が鳴ったら帰ってこいって。それで、防波堤に並んで、ふたりでおにぎりを食べて……」
言葉の終わりは、窓の外の波の音にさらわれていった。
柚木は何も言わずに、表の掛け時計を見上げた。それから、ゆっくりと言った。
「止まっていたのは、きっと、あなたを待っていた時刻なんでしょう」
小夜は時計をそっと胸に当てた。こち、こち、こち。小さな心臓のような音が、セーターの毛糸ごしに伝わってくる。
坂の下で、港の汽笛がひとつ鳴った。夕方の最終便が出ていく合図だった。
小夜は深く頭を下げて、硝子戸を開けた。潮の匂いのする風が店の中に流れこみ、棚の上の時計たちが、いっせいに小さく揺れたように見えた。
坂を駆けおりていく紺色の背中を、柚木はしばらく見送っていた。それから作業机に戻り、次の時計の蓋を、静かに開けた。
`,
  },
]

/* ───────────── マークアップの解析 ───────────── */

type Tok =
  | { t: 'text'; s: string }
  | { t: 'ruby'; base: string; rt: string }
  | { t: 'em'; s: string }
  | { t: 'tcy'; s: string }

const TOKEN_RE = /｜([^《]+)《([^》]+)》|\*\*(.+?)\*\*|(!\?|!!|(?<!\d)\d{2}(?!\d))/g

function tokenize(src: string): Tok[] {
  const out: Tok[] = []
  let last = 0
  for (const m of src.matchAll(TOKEN_RE)) {
    const i = m.index ?? 0
    if (i > last) out.push({ t: 'text', s: src.slice(last, i) })
    if (m[1]) out.push({ t: 'ruby', base: m[1], rt: m[2] })
    else if (m[3]) out.push({ t: 'em', s: m[3] })
    else out.push({ t: 'tcy', s: m[4] })
    last = i + m[0].length
  }
  if (last < src.length) out.push({ t: 'text', s: src.slice(last) })
  return out
}

const plain = (tok: Tok) => (tok.t === 'ruby' ? tok.base : tok.s)

/** 句点(と直後の閉じ括弧)で文に分ける。ルビ・傍点などのトークンは分割しない */
function toSentences(tokens: Tok[]): Tok[][] {
  const sentences: Tok[][] = []
  let cur: Tok[] = []
  let buf = ''
  let pending = false
  const flushBuf = () => {
    if (buf) cur.push({ t: 'text', s: buf })
    buf = ''
  }
  const flush = () => {
    flushBuf()
    if (cur.length) sentences.push(cur)
    cur = []
    pending = false
  }
  for (const tok of tokens) {
    if (tok.t !== 'text') {
      if (pending) flush()
      flushBuf()
      cur.push(tok)
      continue
    }
    for (const ch of tok.s) {
      if (pending && !'」』）'.includes(ch)) flush()
      buf += ch
      if (ch === '。' || ch === '」') pending = true
    }
  }
  flush()
  return sentences
}

function renderTok(tok: Tok, key: number): ReactNode {
  switch (tok.t) {
    case 'text':
      return tok.s
    case 'ruby':
      return (
        <ruby key={key}>
          {tok.base}
          <rp>（</rp>
          <rt>{tok.rt}</rt>
          <rp>）</rp>
        </ruby>
      )
    case 'em':
      return (
        <span key={key} className="vnr-em">
          {tok.s}
        </span>
      )
    case 'tcy':
      return (
        <span key={key} className="vnr-tcy">
          {tok.s}
        </span>
      )
  }
}

/* ───────────── 本の組み立て ───────────── */

export type Anchor = { id: number; chapter: number; text: string; start: number; kind: 'title' | 'heading' | 'text' | 'colophon' }

const anchors: Anchor[] = []
let chars = 0
const addAnchor = (chapter: number, text: string, kind: Anchor['kind']) => {
  const a: Anchor = { id: anchors.length, chapter, text, start: chars, kind }
  anchors.push(a)
  if (kind === 'text') chars += text.length
  return a.id
}

const nodes: ReactNode[] = []

nodes.push(
  <section key="title" className="vnr-title" data-a={addAnchor(-1, BOOK_TITLE, 'title')}>
    <p className="vnr-k">短編</p>
    <h1>{BOOK_TITLE}</h1>
    <p className="vnr-au">{BOOK_AUTHOR}</p>
  </section>,
)

export const CHAPTER_ANCHORS: number[] = []
export const CHAPTER_INFO = CHAPTERS.map((c) => ({ num: c.num, title: c.title }))

CHAPTERS.forEach((chapter, ci) => {
  const hid = addAnchor(ci, `${chapter.num}　${chapter.title}`, 'heading')
  CHAPTER_ANCHORS.push(hid)
  nodes.push(
    <h2 key={`h${ci}`} className="vnr-ch" data-a={hid}>
      <span className="vnr-n">第{chapter.num}章</span>
      <span className="vnr-t">{chapter.title}</span>
    </h2>,
  )
  chapter.text
    .trim()
    .split('\n')
    .forEach((raw, pi) => {
      const quote = raw.startsWith('>')
      const line = quote ? raw.slice(1) : raw
      const cls = quote ? 'vnr-quote' : line.startsWith('「') ? 'vnr-dlg' : undefined
      nodes.push(
        <p key={`p${ci}-${pi}`} className={cls}>
          {toSentences(tokenize(line)).map((sentence) => {
            const id = addAnchor(ci, sentence.map(plain).join(''), 'text')
            return (
              <span key={id} data-a={id}>
                {sentence.map(renderTok)}
              </span>
            )
          })}
        </p>,
      )
    })
})

nodes.push(
  <p key="end" className="vnr-endmark">
    （了）
  </p>,
)

nodes.push(
  <section key="colophon" className="vnr-colo" data-a={addAnchor(CHAPTERS.length - 1, '奥付', 'colophon')}>
    <p className="vnr-ct">{BOOK_TITLE}</p>
    <p>著　者　{BOOK_AUTHOR}</p>
    <p>発　行　{BOOK_IMPRINT}</p>
    <p className="vnr-note">この作品はフィクションです。登場する人物・団体・地名はすべて架空のものです。</p>
  </section>,
)

export const BOOK_NODES = <>{nodes}</>
export const ANCHORS: readonly Anchor[] = anchors
export const TOTAL_CHARS = chars
export const COLOPHON_ANCHOR = anchors.length - 1
