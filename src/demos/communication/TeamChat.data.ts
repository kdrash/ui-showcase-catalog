/* TeamChat のデータ(ユーザー・チャンネル・初期メッセージ・シミュレーション台本)。名前・会社・サービスはすべて架空 */

export type UserId = 'me' | 'akari' | 'minato' | 'noa' | 'yuzu' | 'kei' | 'ci' | 'bot'
export type Presence = 'active' | 'away' | 'dnd' | 'offline'

export interface User {
  id: UserId
  name: string
  short: string
  handle: string
  role: string
  bg: string
  shirt: string
  hair: string
  skin: string
  style: 0 | 1 | 2 | 3
  app?: boolean
  status?: { emoji: string; text: string }
}

export const USERS: Record<UserId, User> = {
  me: { id: 'me', name: '七瀬 凪', short: '凪', handle: 'nagi', role: 'フロントエンド', bg: '#cfe7e2', shirt: '#2f6f73', hair: '#2b2320', skin: '#f2d4bd', style: 0 },
  akari: { id: 'akari', name: '水野 灯里', short: '灯里', handle: 'akari', role: 'プロダクトマネージャー', bg: '#ffd9cc', shirt: '#e0674c', hair: '#5a3326', skin: '#f6dcc8', style: 1 },
  minato: { id: 'minato', name: '波多野 湊', short: '湊', handle: 'minato', role: 'バックエンド', bg: '#d6e2fb', shirt: '#3c5ba8', hair: '#1f1d24', skin: '#e9c6a8', style: 2, status: { emoji: '🏠', text: 'リモート' } },
  noa: { id: 'noa', name: '白石 ノア', short: 'ノア', handle: 'noa', role: 'デザイナー', bg: '#ece0fb', shirt: '#8a5cc7', hair: '#c9a07a', skin: '#f8e2d2', style: 3, status: { emoji: '🎨', text: '集中作業中' } },
  yuzu: { id: 'yuzu', name: '遠浅 柚', short: '柚', handle: 'yuzu', role: 'QA', bg: '#fff0bf', shirt: '#d29a17', hair: '#3a2a20', skin: '#f3d6bf', style: 0 },
  kei: { id: 'kei', name: '汐見 圭', short: '圭', handle: 'kei', role: 'iOS', bg: '#d4f0dc', shirt: '#2f8a55', hair: '#2a2626', skin: '#e2b996', style: 2, status: { emoji: '🚆', text: '移動中' } },
  ci: { id: 'ci', name: 'しおさいCI', short: 'しおさいCI', handle: 'shiosai-ci', role: 'ビルド通知アプリ', bg: '#12343a', shirt: '#000', hair: '#000', skin: '#000', style: 0, app: true },
  bot: { id: 'bot', name: 'Tsudoi', short: 'Tsudoi', handle: 'tsudoi', role: 'ヘルパー', bg: '#ff7a59', shirt: '#000', hair: '#000', skin: '#000', style: 0, app: true },
}

export const TEAM: UserId[] = ['me', 'akari', 'minato', 'noa', 'yuzu', 'kei']

export const INITIAL_PRESENCE: Record<UserId, Presence> = {
  me: 'active',
  akari: 'active',
  minato: 'active',
  noa: 'dnd',
  yuzu: 'away',
  kei: 'offline',
  ci: 'active',
  bot: 'active',
}

export type ChannelId =
  | 'general'
  | 'dev'
  | 'design'
  | 'release'
  | 'random'
  | 'lunch'
  | 'hiring'
  | 'dm-akari'
  | 'dm-minato'
  | 'dm-noa'
  | 'dm-yuzu'
  | 'dm-kei'
  | 'dm-ci'

export interface Channel {
  id: ChannelId
  name: string
  kind: 'channel' | 'dm' | 'app'
  private?: boolean
  muted?: boolean
  dm?: UserId
  topic: string
  members: UserId[]
  intro: string
}

const ALL: UserId[] = ['me', 'akari', 'minato', 'noa', 'yuzu', 'kei']

export const CHANNELS: Channel[] = [
  { id: 'general', name: '全体', kind: 'channel', topic: 'ミナモ工房の全体連絡。お知らせはここへ 📣', members: ALL, intro: '会社全体のお知らせと連絡のためのチャンネルです。' },
  { id: 'dev', name: 'shiosai-dev', kind: 'channel', topic: '潮位アプリ「しおさい」開発 · v2.4 は 11/12 リリース予定 · 障害は #リリース へ', members: [...ALL, 'ci'], intro: '潮位アプリ「しおさい」の開発チャンネルです。仕様・実装・レビューの相談はここで。' },
  { id: 'design', name: 'デザイン', kind: 'channel', topic: 'UI・アイコン・イラストの相談。ラフでも気軽に 🎨', members: ['me', 'akari', 'noa', 'kei'], intro: 'デザインの共有とレビューのチャンネルです。' },
  { id: 'release', name: 'リリース', kind: 'channel', topic: 'ビルドと配信の自動通知 · 失敗したら気づいた人がスレッドで宣言', members: ['me', 'minato', 'kei', 'yuzu', 'ci'], intro: 'CI からのビルド通知が流れるチャンネルです。' },
  { id: 'random', name: '雑談', kind: 'channel', topic: 'なんでも。海の写真歓迎 🌊', members: ALL, intro: '仕事に関係ない話はこちらへ。' },
  { id: 'lunch', name: 'ランチ部', kind: 'channel', muted: true, topic: '港のあたりのお昼情報 🍱', members: ['me', 'akari', 'minato', 'kei'], intro: 'お昼ごはんの相談チャンネルです。' },
  { id: 'hiring', name: '採用-2027', kind: 'channel', private: true, topic: '2027年度の採用 · 社外秘', members: ['me', 'akari'], intro: 'このチャンネルはプライベートです。招待されたメンバーだけが見られます。' },
  { id: 'dm-akari', name: '水野 灯里', kind: 'dm', dm: 'akari', topic: '', members: ['me', 'akari'], intro: '' },
  { id: 'dm-minato', name: '波多野 湊', kind: 'dm', dm: 'minato', topic: '', members: ['me', 'minato'], intro: '' },
  { id: 'dm-noa', name: '白石 ノア', kind: 'dm', dm: 'noa', topic: '', members: ['me', 'noa'], intro: '' },
  { id: 'dm-yuzu', name: '遠浅 柚', kind: 'dm', dm: 'yuzu', topic: '', members: ['me', 'yuzu'], intro: '' },
  { id: 'dm-kei', name: '汐見 圭', kind: 'dm', dm: 'kei', topic: '', members: ['me', 'kei'], intro: '' },
  { id: 'dm-ci', name: 'しおさいCI', kind: 'app', dm: 'ci', topic: '', members: ['me', 'ci'], intro: '' },
]

export const CHANNEL_BY_ID = Object.fromEntries(CHANNELS.map((c) => [c.id, c])) as Record<ChannelId, Channel>

/* ───────────── メッセージ ───────────── */

export type ArtKind = 'tide-pair' | 'flicker' | 'icons' | 'icon-final' | 'sea' | 'screenshot' | 'bento' | 'moon'

export type Attachment =
  | { type: 'image'; art: ArtKind; name: string; w: number; h: number }
  | { type: 'file'; name: string; size: string; ext: 'pdf' | 'zip' | 'mov' | 'pen' }

export interface Unfurl {
  site: string
  title: string
  desc: string
  color: string
  thumb?: 'pen' | 'docs'
  meta?: string
}

export interface CiCard {
  status: 'success' | 'failure'
  title: string
  branch: string
  commit: string
  duration: string
  note?: string
}

export interface Reaction {
  emoji: string
  users: UserId[]
}

export interface Msg {
  id: string
  author: UserId
  ts: number
  text: string
  files?: Attachment[]
  unfurl?: Unfurl
  ci?: CiCard
  reactions: Reaction[]
  replies?: Msg[]
  edited?: boolean
  pinned?: boolean
  kind?: 'system' | 'ephemeral'
  broadcast?: boolean
  parent?: string
}

/** デモ内の「今」は今日の 10:24 から実時間で進む */
export const BASE_NOW = (() => {
  const d = new Date()
  d.setHours(10, 24, 0, 0)
  return d.getTime()
})()

const at = (daysAgo: number, h: number, m: number) => {
  const d = new Date(BASE_NOW)
  d.setDate(d.getDate() - daysAgo)
  d.setHours(h, m, 0, 0)
  return d.getTime()
}

const r = (emoji: string, ...users: UserId[]): Reaction => ({ emoji, users })

const m = (id: string, author: UserId, ts: number, text: string, extra: Partial<Msg> = {}): Msg => ({
  id,
  author,
  ts,
  text,
  reactions: [],
  ...extra,
})

export const SEED: Record<ChannelId, Msg[]> = {
  general: [
    m('g1', 'akari', at(3, 10, 0), '@channel 来週金曜は全社ワークショップです。午後は *海辺の会議室（3F）* で、テーマは「潮と暮らすプロダクト」。お昼は出ます 🍙', {
      pinned: true,
      reactions: [r('🙌', 'minato', 'noa', 'yuzu', 'kei'), r('🍙', 'kei', 'me')],
    }),
    m('g2', 'minato', at(1, 17, 40), 'オフィスの Wi-Fi、明日 8:00〜8:15 にメンテで止まります 🙏'),
    m('g3', 'akari', at(0, 9, 5), '@channel 11/12（木）に v2.4 をリリース予定です。当日 13:00〜 リリース判定会をやるので、関係者は予定を空けておいてください 📅', {
      reactions: [r('✅', 'minato', 'noa')],
    }),
  ],
  dev: [
    m('d-standup', 'akari', at(1, 18, 2), '明日の朝会で v2.4 のスコープを最終確認します。気になってるチケットがあればこのスレッドに書いておいてください 🙏', {
      reactions: [r('👀', 'minato', 'yuzu', 'me'), r('✅', 'noa', 'kei')],
      replies: [
        m('d-standup-1', 'minato', at(1, 18, 10), 'API のレート制限まわり、念のため入れておきたいです', { reactions: [] }),
        m('d-standup-2', 'yuzu', at(1, 18, 21), 'Android の潮位グラフのちらつき、まだ再現します。端末を回転させると出やすいです', { reactions: [r('🙏', 'akari')] }),
        m('d-standup-3', 'me', at(1, 18, 30), 'ちらつきは私が見ます！', { reactions: [r('🙌', 'yuzu', 'akari')] }),
      ],
    }),
    m('d2', 'minato', at(1, 18, 5), '潮位 API のキャッシュ、TTL を 10 分に延ばしました。仕様はこちら https://docs.minamo.dev/api/tides', {
      unfurl: { site: 'ミナモ工房 Docs', title: '潮位 API v3 — キャッシュとレート制限', desc: '観測点ごとの潮位予測を 10 分単位で返します。レスポンスには ETag が付き、1 分あたり 120 リクエストまで。', color: '#2f6f73', thumb: 'docs' },
    }),
    m('d3', 'noa', at(1, 18, 40), '新しい潮位グラフのデザイン置いておきます〜 夜間モードも作ってみました 🌙', {
      files: [{ type: 'image', art: 'tide-pair', name: '潮位グラフ_v2.4.png', w: 420, h: 250 }],
      reactions: [r('😍', 'akari', 'yuzu'), r('🌙', 'kei')],
    }),
    m('d4', 'noa', at(1, 18, 41), '元データ https://penboard.app/f/shiosai-v24', {
      unfurl: { site: 'Penboard', title: 'しおさい v2.4 — 潮位グラフ再設計', desc: 'フレーム 12 · 最終更新 白石 ノア', color: '#8a5cc7', thumb: 'pen' },
    }),
    m('d5', 'akari', at(1, 18, 44), 'めっちゃいい…！ 夜間モードのグラデーション好きです', { reactions: [r('💯', 'minato')] }),
    m('d6', 'yuzu', at(0, 9, 12), 'おはようございます ☀️ 昨日のちらつき、画面収録しました。回転した直後に線が二重になります', {
      files: [{ type: 'image', art: 'flicker', name: '画面収録_ちらつき.png', w: 300, h: 220 }],
    }),
    m('d-fix', 'me', at(0, 9, 30), '原因わかりました。リサイズのたびに `ResizeObserver` で path を作り直していたのが原因でした。こう直します 👇\n```ts\n// 幅が実際に変わったときだけ描き直す\nconst ro = new ResizeObserver(([entry]) => {\n  const w = Math.round(entry.contentRect.width)\n  if (w === lastWidth.current) return\n  lastWidth.current = w\n  requestAnimationFrame(() => drawTide(w, 0.5))\n})\n```', {
      pinned: true,
      reactions: [r('🙌', 'yuzu', 'akari', 'kei'), r('🔥', 'minato')],
    }),
    m('d-pr', 'me', at(0, 9, 31), 'PR 出しました → https://code.minamo.dev/shiosai/app/pull/1287', {
      unfurl: { site: 'ミナモ Code', title: '#1287 潮位グラフの再描画を幅が変わったときだけに制限', desc: 'nagi が main へのマージを依頼しています', meta: '+18 −42 · 3 ファイル · レビュー待ち', color: '#2f9e6b' },
    }),
    m('d-kei', 'kei', at(0, 9, 48), 'iOS 側も同じ実装なので、こっちも追従します', {
      replies: [m('d-kei-1', 'me', at(0, 9, 52), '助かります！ 差分は PR の説明に書いておきました', { reactions: [r('🙏', 'kei')] })],
    }),
    m('d-u1', 'minato', at(0, 10, 2), '@凪 レート制限の件、ステージングで 429 が返ったときのリトライ方針だけ相談させてください。*指数バックオフ + 最大 3 回* で考えてます'),
    m('d-u2', 'minato', at(0, 10, 5), 'あと、リリースノートの下書きです', {
      files: [{ type: 'file', name: 'shiosai-2.4-release-notes.pdf', size: '248 KB', ext: 'pdf' }],
    }),
    m('d-u3', 'noa', at(0, 10, 15), '@here 15時から 10分だけ、アイコンの最終確認しませんか？ ハドルでやります 🎧', { reactions: [r('👍', 'akari', 'kei')] }),
    m('d-u4', 'akari', at(0, 10, 21), 'v2.4 のチェックリスト更新しました\n- 潮位グラフのちらつき修正（凪さん）\n- API のリトライ方針（湊さん）\n- アイコン差し替え（ノアさん）\n- 回帰テスト（柚さん）', {
      reactions: [r('✅', 'yuzu')],
    }),
  ],
  design: [
    m('ds1', 'noa', at(1, 16, 10), 'アプリアイコン案を 3 つ作りました。投票お願いします 🗳', {
      files: [{ type: 'image', art: 'icons', name: 'icon_candidates.png', w: 400, h: 170 }],
      reactions: [r('1️⃣', 'akari', 'yuzu'), r('2️⃣', 'kei', 'minato', 'me', 'akari'), r('3️⃣', 'minato')],
    }),
    m('ds2', 'kei', at(1, 16, 30), '2 番の波の線、ストアのサムネイルでも潰れなさそうでいいですね'),
    m('ds3', 'noa', at(0, 10, 10), '2 番で進めます！ 角丸と余白だけ微調整しました', {
      files: [{ type: 'image', art: 'icon-final', name: 'icon_final_1024.png', w: 260, h: 200 }],
    }),
    m('ds4', 'noa', at(0, 10, 12), '#shiosai-dev にも共有しておきます'),
  ],
  release: [
    m('r1', 'ci', at(1, 19, 20), 'ビルドが完了しました', {
      ci: { status: 'success', title: 'shiosai-android #640', branch: 'main', commit: 'a91f3c2 キャッシュTTLを10分に', duration: '6分12秒' },
    }),
    m('r2', 'ci', at(0, 8, 55), 'ビルドに失敗しました', {
      ci: { status: 'failure', title: 'shiosai-ios #811', branch: 'release/2.4', commit: '4be07d1 潮位グラフの余白調整', duration: '8分40秒', note: 'TideGraphSnapshotTests で 2 件失敗' },
      replies: [m('r2-1', 'kei', at(0, 9, 40), 'スナップショットの更新漏れでした。直しました 🙇', { reactions: [r('🙏', 'yuzu')] })],
    }),
    m('r3', 'ci', at(0, 10, 18), 'ビルドが完了しました', {
      ci: { status: 'success', title: 'shiosai-ios #812', branch: 'release/2.4', commit: '9c2d1e0 スナップショット更新', duration: '8分02秒' },
      reactions: [r('🎉', 'kei', 'yuzu')],
    }),
  ],
  random: [
    m('x1', 'yuzu', at(1, 17, 30), '近所の堤防、夕方めちゃくちゃきれいでした', {
      files: [{ type: 'image', art: 'sea', name: 'IMG_2041.png', w: 380, h: 240 }],
      reactions: [r('🌊', 'akari', 'noa', 'kei', 'minato', 'me')],
    }),
    m('x2', 'kei', at(1, 17, 33), 'これは良い潮位'),
    m('x3', 'akari', at(0, 7, 50), '今日は大潮らしいです 🌕'),
    m('x4', 'minato', at(0, 8, 30), '朝の海、釣りの人が多かった 🎣'),
    m('x5', 'kei', at(0, 9, 0), '大潮の日にリリースしたら縁起いいのでは'),
    m('x6', 'yuzu', at(0, 9, 1), 'それな'),
    m('x7', 'noa', at(0, 9, 58), 'コーヒー淹れますけど飲む人いますか？ ☕ 3杯分あります', { reactions: [r('☕', 'akari', 'yuzu', 'kei')] }),
    m('x8', 'akari', at(0, 10, 20), 'いただきます！'),
  ],
  lunch: [
    m('l1', 'akari', at(0, 9, 40), '今日は港の定食屋さん行きます 🐟 11:45 出発です'),
    m('l2', 'minato', at(0, 9, 44), '行きます！'),
    m('l3', 'kei', at(0, 10, 1), '3人で予約しておきました'),
  ],
  hiring: [
    m('h1', 'akari', at(2, 15, 0), 'カジュアル面談の日程、共有カレンダーに入れました。凪さんは 木曜 16:00 の枠をお願いします'),
    m('h2', 'me', at(2, 15, 6), 'ありがとうございます！ ポートフォリオ見ておきます'),
  ],
  'dm-akari': [
    m('da1', 'akari', at(1, 19, 2), '凪さん、明日の朝会でちらつきの件を 1 分くらい共有してもらえますか？'),
    m('da2', 'me', at(1, 19, 10), 'もちろんです！'),
    m('da3', 'akari', at(1, 19, 11), 'ありがとう〜 🙏'),
  ],
  'dm-minato': [m('dm1', 'minato', at(0, 10, 3), '例のリトライの件、チャンネルにも書いたけど急ぎじゃないです！ 午後でも大丈夫')],
  'dm-noa': [
    m('dn1', 'noa', at(1, 15, 2), 'アイコンの書き出しサイズ、1024 で大丈夫でした？'),
    m('dn2', 'me', at(1, 15, 20), '大丈夫です 👌 ありがとうございます'),
  ],
  'dm-yuzu': [],
  'dm-kei': [
    m('dk1', 'kei', at(2, 20, 0), '週末、堤防で釣りしません？'),
    m('dk2', 'me', at(2, 20, 4), '行きたいです！ 🎣'),
  ],
  'dm-ci': [
    m('dc1', 'ci', at(3, 9, 0), 'こんにちは！ しおさいCI です。ビルドの成功・失敗を #リリース にお知らせします。'),
  ],
}

export const INITIAL_UNREAD: Partial<Record<ChannelId, number>> = { dev: 4, design: 2, random: 7, lunch: 3, general: 1, 'dm-minato': 1 }
export const INITIAL_MENTIONS: Partial<Record<ChannelId, number>> = { dev: 1, general: 1, 'dm-minato': 1 }

/* ───────────── 絵文字 ───────────── */

export interface EmojiCat {
  id: string
  label: string
  items: [string, string][]
}

export const EMOJI_CATS: EmojiCat[] = [
  {
    id: 'smileys',
    label: 'スマイリー',
    items: [
      ['😀', 'にこにこ smile grin'], ['😄', 'わらう 笑 laugh'], ['😂', 'なみだ 笑い joy'], ['🥹', 'うるうる 感動'], ['😊', 'てれ blush'],
      ['😍', 'ハート目 love'], ['🤩', 'きらきら star'], ['😎', 'サングラス cool'], ['🤔', 'かんがえる think'], ['🫡', '敬礼 salute'],
      ['😮', 'おどろき wow'], ['😅', 'あせ sweat'], ['😭', 'なく cry'], ['😴', 'ねむい sleep'], ['🥳', 'おいわい party'], ['🙃', 'さかさ upside'],
    ],
  },
  {
    id: 'hands',
    label: 'ジェスチャー',
    items: [
      ['👍', 'いいね good +1 thumbs'], ['👎', 'よくない -1'], ['🙌', 'ばんざい hooray'], ['👏', 'はくしゅ clap'], ['🙏', 'おねがい ありがとう pray'],
      ['👀', 'みてる eyes 確認中'], ['💪', 'がんばる muscle'], ['🤝', 'あくしゅ handshake'], ['👌', 'ok オッケー'], ['✌️', 'ピース peace'],
      ['🫶', 'ハート手 heart hands'], ['👋', 'やあ wave'],
    ],
  },
  {
    id: 'nature',
    label: '自然',
    items: [
      ['🌊', 'なみ 波 wave'], ['🌕', '満月 moon'], ['🌙', '月 夜 night'], ['☀️', 'たいよう sun'], ['🌧️', 'あめ rain'], ['🐟', 'さかな fish'],
      ['🐬', 'いるか dolphin'], ['🦀', 'かに crab'], ['🐚', 'かい shell'], ['🌱', 'め sprout'], ['🔥', 'ほのお fire'], ['⚡', 'いなずま zap'],
    ],
  },
  {
    id: 'objects',
    label: 'もの',
    items: [
      ['🎉', 'くす玉 tada party'], ['🚀', 'ロケット ship rocket'], ['🐛', 'バグ bug'], ['🛠️', '修理 tools'], ['📌', 'ピン pin'], ['📅', 'カレンダー calendar'],
      ['☕', 'コーヒー coffee'], ['🍙', 'おにぎり rice'], ['🍱', 'べんとう bento'], ['🎧', 'ヘッドホン huddle'], ['💡', 'アイデア idea'], ['🎣', 'つり fishing'],
    ],
  },
  {
    id: 'symbols',
    label: '記号',
    items: [
      ['✅', 'チェック done check'], ['❌', 'バツ no'], ['❤️', 'ハート heart'], ['💯', '100 満点'], ['⭐', 'ほし star'], ['❗', 'びっくり important'],
      ['❓', 'はてな question'], ['🆗', 'ok'], ['1️⃣', 'いち one'], ['2️⃣', 'に two'], ['3️⃣', 'さん three'], ['🔁', 'くりかえし repeat'],
    ],
  },
]

export const EMOJI_NAME: Record<string, string> = Object.fromEntries(
  EMOJI_CATS.flatMap((c) => c.items.map(([e, k]) => [e, k.split(' ')[0]])),
)

/* ───────────── スラッシュコマンド ───────────── */

export const SLASH_COMMANDS = [
  { cmd: 'shrug', args: '[メッセージ]', desc: 'メッセージの最後に ¯\\_(ツ)_/¯ を付ける' },
  { cmd: 'topic', args: '[新しいトピック]', desc: 'チャンネルのトピックを変更する' },
  { cmd: 'huddle', args: '', desc: 'このチャンネルでハドルを始める' },
  { cmd: 'remind', args: '[内容]', desc: '30分後にリマインドする' },
  { cmd: 'away', args: '', desc: 'ステータスを「離席中」と「アクティブ」で切り替える' },
] as const

/* ───────────── シミュレーション ───────────── */

/** 自分の発言への自動返信候補 */
export const AUTO_REPLIES = {
  question: ['いいと思います！', 'それで進めましょう 👍', 'ちょっと確認してから返しますね', '賛成です〜', 'たぶん大丈夫です。念のため柚さんにも見てもらいましょう'],
  thanks: ['いえいえ〜！', 'こちらこそ 🙏', 'どういたしまして！'],
  greet: ['おはようございます ☀️', 'おつかれさまです〜'],
  plain: ['了解です！', 'ありがとうございます、見ておきます', 'なるほど、了解です', 'いいですね〜！', 'あとでスレッドで詳しく聞かせてください', '👍'],
}

/** 一定間隔で別チャンネルに流れてくる雑多なメッセージ */
export const AMBIENT: { ch: ChannelId; from: UserId; text: string; files?: Attachment[] }[] = [
  { ch: 'random', from: 'minato', text: 'お昼のお弁当、海苔で波を描いてみた', files: [{ type: 'image', art: 'bento', name: 'bento.png', w: 300, h: 200 }] },
  { ch: 'design', from: 'noa', text: 'スプラッシュ画面の色、もう少しだけ深い青にしてみます' },
  { ch: 'general', from: 'akari', text: '来週のワークショップ、参加フォームを #全体 のピン留めに追加しました 📌' },
  { ch: 'random', from: 'yuzu', text: '今夜の月、ほぼ満月です 🌕', files: [{ type: 'image', art: 'moon', name: 'IMG_2077.png', w: 300, h: 200 }] },
  { ch: 'lunch', from: 'kei', text: '定食屋さん、今日は金目鯛の煮付けらしいです 🐟' },
  { ch: 'dev', from: 'kei', text: 'iOS の追従 PR も出しました。レビューお願いします 🙏' },
  { ch: 'random', from: 'akari', text: 'オフィスのモンステラ、新しい葉っぱが出てました 🌱' },
  { ch: 'design', from: 'kei', text: 'ダークモードのタブバー、選択色のコントラスト少し足りないかもです' },
]
