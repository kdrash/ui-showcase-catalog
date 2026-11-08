/**
 * MusicStreaming のデータ。アーティスト・アルバム・曲・歌詞・プレイリストはすべて架空のオリジナル。
 * ジャケットは CoverSpec(描き方 + 4色パレット)から SVG で生成する。
 */

export type CoverStyle = 'sunset' | 'moon' | 'waves' | 'koi' | 'leaf' | 'pixel' | 'orbs' | 'bloom'
export interface CoverSpec {
  id: string
  style: CoverStyle
  pal: [string, string, string, string]
  label?: string
}
export interface Track {
  id: string
  title: string
  artist: string
  albumId: string
  dur: number
  plays: number
  explicit?: boolean
  instrumental?: boolean
  added?: string
}
export interface Album {
  id: string
  title: string
  artist: string
  artistId: string
  year: number
  date: string
  kind: 'アルバム' | 'EP' | 'シングル'
  genre: string
  cover: CoverSpec
  tracks: string[]
  /** Tone.js の自動演奏の性格 */
  sound: { style: 'pop' | 'ambient' | 'lofi' | 'folk' | 'synth'; bpm: number; key: number; minor?: boolean }
}
export interface Artist {
  id: string
  name: string
  hue: number
  listeners: string
}
export interface Playlist {
  id: string
  title: string
  desc: string
  owner: string
  kind: 'プレイリスト' | 'ミックス'
  cover: CoverSpec | { id: string; mix: string[]; tint: string; label: string } | { id: string; liked: true }
  tracks: string[]
}
export interface LyricLine {
  t: number
  text: string
}

const m = (s: string) => {
  const [a, b] = s.split(':').map(Number)
  return a * 60 + b
}

export const ARTISTS: Artist[] = [
  { id: 'ar-haru', name: '汐見ハル', hue: 330, listeners: '月間リスナー 182万人' },
  { id: 'ar-tram', name: 'The Velvet Tram', hue: 200, listeners: '月間リスナー 64万人' },
  { id: 'ar-akari', name: '霧島 灯', hue: 215, listeners: '月間リスナー 38万人' },
  { id: 'ar-koi', name: 'KOI-KOI CLUB', hue: 300, listeners: '月間リスナー 97万人' },
  { id: 'ar-kotori', name: 'ことりの庭', hue: 110, listeners: '月間リスナー 21万人' },
  { id: 'ar-hamster', name: 'Lo-Fi Hamster', hue: 30, listeners: '月間リスナー 233万人' },
  { id: 'ar-aster', name: 'Aster Bloom', hue: 20, listeners: '月間リスナー 51万人' },
  { id: 'ar-hakuchu', name: '白昼夢', hue: 190, listeners: '月間リスナー 76万人' },
]

type TDef = [title: string, dur: string, plays: number, extra?: Partial<Track>]
const ALBUM_DEFS: (Omit<Album, 'tracks'> & { defs: TDef[] })[] = [
  {
    id: 'al-yakou',
    title: '夜光ラジオ',
    artist: '汐見ハル',
    artistId: 'ar-haru',
    year: 2026,
    date: '2026年3月14日',
    kind: 'アルバム',
    genre: 'シティポップ',
    cover: { id: 'c-yakou', style: 'sunset', pal: ['#2b1055', '#ff6a88', '#ffd56b', '#fff4e6'], label: 'YAKOU RADIO' },
    sound: { style: 'pop', bpm: 104, key: 2 },
    defs: [
      ['夜光ラジオ', '3:24', 18240511],
      ['ハイウェイ・ブルーノート', '3:51', 9120334],
      ['午前二時のサイダー', '2:58', 7804219],
      ['Coastline', '4:12', 5511873],
      ['雨のち、シティライト', '3:37', 6402150],
      ['サヨナラ・ドライブイン', '4:05', 4190077],
    ],
  },
  {
    id: 'al-paper',
    title: 'Paper Moon Diner',
    artist: 'The Velvet Tram',
    artistId: 'ar-tram',
    year: 2025,
    date: '2025年10月2日',
    kind: 'アルバム',
    genre: 'インディー',
    cover: { id: 'c-paper', style: 'moon', pal: ['#0f2027', '#2c5364', '#f7d488', '#f3efe0'], label: 'PAPER MOON DINER' },
    sound: { style: 'pop', bpm: 92, key: 7 },
    defs: [
      ['Paper Moon Diner', '3:05', 8820144],
      ['Jukebox Heart', '2:47', 3310298],
      ['最終電車のワルツ', '3:33', 2890412],
      ['Milkshake Satellite', '3:12', 2410876],
      ['おやすみ、ウェイトレス', '4:20', 1987330],
    ],
  },
  {
    id: 'al-gunjo',
    title: '群青アンビエント',
    artist: '霧島 灯',
    artistId: 'ar-akari',
    year: 2026,
    date: '2026年1月21日',
    kind: 'アルバム',
    genre: 'アンビエント',
    cover: { id: 'c-gunjo', style: 'waves', pal: ['#06152b', '#1b4f8a', '#7fd1ff', '#dff4ff'], label: '群青' },
    sound: { style: 'ambient', bpm: 68, key: 4 },
    defs: [
      ['群青', '5:12', 3120488, { instrumental: true }],
      ['潮騒の記憶', '4:48', 1840221, { instrumental: true }],
      ['深海の図書館', '6:03', 1504996, { instrumental: true }],
      ['薄明', '3:56', 1210754, { instrumental: true }],
    ],
  },
  {
    id: 'al-koi',
    title: 'Neon Koi',
    artist: 'KOI-KOI CLUB',
    artistId: 'ar-koi',
    year: 2026,
    date: '2026年8月8日',
    kind: 'EP',
    genre: 'シンセポップ',
    cover: { id: 'c-koi', style: 'koi', pal: ['#14002b', '#ff2e88', '#00e0ff', '#ffffff'], label: 'NEON KOI' },
    sound: { style: 'synth', bpm: 118, key: 9, minor: true },
    defs: [
      ['Neon Koi', '3:16', 12408811, { explicit: false }],
      ['金魚すくいディスコ', '3:02', 6620130],
      ['夜市スーパーノヴァ', '3:44', 4870452],
    ],
  },
  {
    id: 'al-mori',
    title: '森のうた',
    artist: 'ことりの庭',
    artistId: 'ar-kotori',
    year: 2024,
    date: '2024年5月3日',
    kind: 'アルバム',
    genre: 'フォーク',
    cover: { id: 'c-mori', style: 'leaf', pal: ['#eef3dc', '#8fbf74', '#2f5d3a', '#1d2b1f'], label: 'mori no uta' },
    sound: { style: 'folk', bpm: 84, key: 0 },
    defs: [
      ['森のうた', '3:28', 2210473],
      ['木漏れ日のワルツ', '2:55', 1530288],
      ['どんぐりの行進', '2:12', 990127],
      ['雨宿りの小屋', '4:01', 1170345],
    ],
  },
  {
    id: 'al-laundro',
    title: 'Midnight Laundromat',
    artist: 'Lo-Fi Hamster',
    artistId: 'ar-hamster',
    year: 2026,
    date: '2026年6月19日',
    kind: 'EP',
    genre: 'ローファイ',
    cover: { id: 'c-laundro', style: 'pixel', pal: ['#2d1b3d', '#f2a65a', '#7cc6b3', '#fbe9d0'], label: 'LAUNDROMAT' },
    sound: { style: 'lofi', bpm: 78, key: 5 },
    defs: [
      ['spin cycle', '2:31', 15820449, { instrumental: true }],
      ['回る洗濯機', '2:44', 9210337, { instrumental: true }],
      ['100円玉と月', '2:18', 7720184, { instrumental: true }],
      ['softener', '2:52', 6105522, { instrumental: true }],
    ],
  },
  {
    id: 'al-solar',
    title: 'Solar Drift',
    artist: 'Aster Bloom',
    artistId: 'ar-aster',
    year: 2025,
    date: '2025年12月5日',
    kind: 'アルバム',
    genre: 'エレクトロニカ',
    cover: { id: 'c-solar', style: 'orbs', pal: ['#1a0b2e', '#ff7e5f', '#feb47b', '#ffe9d6'], label: 'SOLAR DRIFT' },
    sound: { style: 'synth', bpm: 110, key: 11 },
    defs: [
      ['Solar Drift', '4:20', 4420916, { instrumental: true }],
      ['Perihelion', '3:48', 2310445, { instrumental: true }],
      ['光年の手紙', '4:02', 2870119],
      ['Orbit Bloom', '3:35', 1960872, { instrumental: true }],
    ],
  },
  {
    id: 'al-onshitsu',
    title: '青い温室',
    artist: '白昼夢',
    artistId: 'ar-hakuchu',
    year: 2026,
    date: '2026年10月30日',
    kind: 'EP',
    genre: 'ドリームポップ',
    cover: { id: 'c-onshitsu', style: 'bloom', pal: ['#cfe8ff', '#8fb8ff', '#ff9fbd', '#24324d'], label: 'AOI ONSHITSU' },
    sound: { style: 'ambient', bpm: 76, key: 3 },
    defs: [
      ['青い温室', '3:40', 5520371],
      ['午睡', '3:12', 2130588],
      ['ひかりの粒', '2:59', 1840266],
    ],
  },
]

export const TRACKS: Record<string, Track> = {}
export const ALBUMS: Album[] = ALBUM_DEFS.map(({ defs, ...a }) => {
  const ids = defs.map(([title, dur, plays, extra], i) => {
    const id = `${a.id}-${i + 1}`
    TRACKS[id] = { id, title, artist: a.artist, albumId: a.id, dur: m(dur), plays, ...extra }
    return id
  })
  return { ...a, tracks: ids }
})
export const ALBUM_BY_ID: Record<string, Album> = Object.fromEntries(ALBUMS.map((a) => [a.id, a]))

const ADDED = ['3日前', '1週間前', '2週間前', '2026年10月12日', '2026年9月30日', '2026年9月2日', '2026年8月18日', '2026年7月7日']

export const LIKED_INITIAL = ['al-yakou-1', 'al-koi-1', 'al-onshitsu-1', 'al-paper-1', 'al-laundro-1', 'al-gunjo-1', 'al-yakou-3', 'al-solar-3']
export const ADDED_LABEL = (i: number) => ADDED[i % ADDED.length]

export const PLAYLISTS: Playlist[] = [
  { id: 'liked', title: 'お気に入りの曲', desc: '', owner: 'あなた', kind: 'プレイリスト', cover: { id: 'c-liked', liked: true }, tracks: [] },
  {
    id: 'pl-coffee',
    title: '朝のコーヒーと',
    desc: '窓を開けて、ゆっくり目を覚ますための曲たち。',
    owner: 'あなた',
    kind: 'プレイリスト',
    cover: { id: 'c-coffee', style: 'sunset', pal: ['#ffe8c7', '#f6b26b', '#8a4b2a', '#3b2416'], label: 'MORNING' },
    tracks: ['al-mori-2', 'al-onshitsu-2', 'al-paper-2', 'al-yakou-3', 'al-mori-1', 'al-laundro-4', 'al-solar-3'],
  },
  {
    id: 'pl-drive',
    title: '深夜のドライブ',
    desc: '高速の灯りと、窓の外の街。',
    owner: 'あなた',
    kind: 'プレイリスト',
    cover: { id: 'c-drive', style: 'koi', pal: ['#050a1f', '#3d5afe', '#ffb300', '#ffffff'], label: 'NIGHT DRIVE' },
    tracks: ['al-yakou-2', 'al-koi-1', 'al-yakou-1', 'al-koi-3', 'al-solar-1', 'al-yakou-6', 'al-paper-3', 'al-koi-2'],
  },
  {
    id: 'pl-focus',
    title: '集中したいとき',
    desc: '歌のない音楽で、深く潜る。',
    owner: 'あなた',
    kind: 'プレイリスト',
    cover: { id: 'c-focus', style: 'waves', pal: ['#0e1a12', '#2f6b4f', '#a6e3a1', '#e8fff0'], label: 'FOCUS' },
    tracks: ['al-gunjo-1', 'al-laundro-1', 'al-gunjo-3', 'al-laundro-2', 'al-solar-2', 'al-laundro-3', 'al-gunjo-4'],
  },
  {
    id: 'mix-1',
    title: 'デイリーミックス 1',
    desc: '汐見ハル、KOI-KOI CLUB、The Velvet Tram など',
    owner: 'Otoha',
    kind: 'ミックス',
    cover: { id: 'c-mix1', mix: ['c-yakou', 'c-koi'], tint: '#ff6a88', label: 'Daily Mix 1' },
    tracks: ['al-yakou-1', 'al-koi-2', 'al-paper-1', 'al-yakou-5', 'al-koi-1', 'al-paper-4', 'al-yakou-4'],
  },
  {
    id: 'mix-2',
    title: 'デイリーミックス 2',
    desc: 'Lo-Fi Hamster、霧島 灯、Aster Bloom など',
    owner: 'Otoha',
    kind: 'ミックス',
    cover: { id: 'c-mix2', mix: ['c-laundro', 'c-gunjo'], tint: '#7cc6b3', label: 'Daily Mix 2' },
    tracks: ['al-laundro-1', 'al-gunjo-2', 'al-solar-1', 'al-laundro-3', 'al-gunjo-1', 'al-solar-4'],
  },
  {
    id: 'mix-3',
    title: 'デイリーミックス 3',
    desc: '白昼夢、ことりの庭、The Velvet Tram など',
    owner: 'Otoha',
    kind: 'ミックス',
    cover: { id: 'c-mix3', mix: ['c-onshitsu', 'c-mori'], tint: '#8fb8ff', label: 'Daily Mix 3' },
    tracks: ['al-onshitsu-1', 'al-mori-1', 'al-paper-5', 'al-onshitsu-3', 'al-mori-4', 'al-paper-3'],
  },
  {
    id: 'mix-radar',
    title: 'リリースレーダー',
    desc: 'フォロー中のアーティストの新曲を毎週金曜日にお届け。',
    owner: 'Otoha',
    kind: 'ミックス',
    cover: { id: 'c-radar', mix: ['c-onshitsu', 'c-koi'], tint: '#2ee6a8', label: 'Release Radar' },
    tracks: ['al-onshitsu-1', 'al-koi-3', 'al-yakou-1', 'al-laundro-2', 'al-onshitsu-2', 'al-koi-2'],
  },
]

export const GENRES: { name: string; color: string; cover: string }[] = [
  { name: 'シティポップ', color: '#c2366b', cover: 'al-yakou' },
  { name: 'アンビエント', color: '#1e5aa8', cover: 'al-gunjo' },
  { name: 'インディー', color: '#5c6f2b', cover: 'al-paper' },
  { name: 'ローファイ', color: '#a15c22', cover: 'al-laundro' },
  { name: 'シンセポップ', color: '#7a2bbd', cover: 'al-koi' },
  { name: 'フォーク', color: '#2f7d4a', cover: 'al-mori' },
  { name: 'ドリームポップ', color: '#3b6fd1', cover: 'al-onshitsu' },
  { name: 'エレクトロニカ', color: '#c4532c', cover: 'al-solar' },
]

/* ───────────── 歌詞(時刻付き) ───────────── */

const L = (rows: [string, string][]): LyricLine[] => rows.map(([t, text]) => ({ t: m(t), text }))

export const LYRICS: Record<string, LyricLine[]> = {
  'al-yakou-1': L([
    ['0:00', '♪'],
    ['0:12', '午前零時の 周波数に合わせて'],
    ['0:19', '君の声が ノイズの奥で笑う'],
    ['0:26', '高速の灯り 窓に流れてく'],
    ['0:33', '何も言わずに ボリュームを上げた'],
    ['0:41', '♪'],
    ['0:48', '夜光ラジオ 届いているかな'],
    ['0:55', '眠れない街の 片隅まで'],
    ['1:02', '夜光ラジオ 消さないでいて'],
    ['1:09', 'あと一曲だけ 隣にいて'],
    ['1:18', '♪'],
    ['1:32', '交差点の青 にじんだフロントガラス'],
    ['1:40', '言えなかったこと 歌詞に隠して'],
    ['1:48', 'ハザードの点滅 心拍と重なる'],
    ['1:56', 'もう少しだけ 遠回りしよう'],
    ['2:06', '♪'],
    ['2:16', '夜光ラジオ 届いているかな'],
    ['2:23', '夜明け前の 静かな空まで'],
    ['2:30', '夜光ラジオ 消さないでいて'],
    ['2:37', '最後の一曲 君に贈るよ'],
    ['2:46', '♪'],
    ['3:00', '(おやすみ、また明日)'],
    ['3:12', '♪'],
  ]),
  'al-paper-1': L([
    ['0:00', '♪'],
    ['0:10', '閉店間際の ダイナーで'],
    ['0:16', '冷めたコーヒーと 紙の月'],
    ['0:23', 'ジュークボックスが 古い歌を回す'],
    ['0:30', '君は窓に 指で名前を書いた'],
    ['0:38', 'Paper moon, paper moon'],
    ['0:44', '本物じゃなくても かまわない'],
    ['0:51', 'Paper moon, paper moon'],
    ['0:57', '今夜だけ 照らしていて'],
    ['1:06', '♪'],
    ['1:20', 'ネオンが一つ また一つ消えて'],
    ['1:27', 'ウェイトレスが 椅子を上げはじめる'],
    ['1:34', '帰りたくない理由を 探してた'],
    ['1:41', '君も同じだと 知っていたよ'],
    ['1:50', 'Paper moon, paper moon'],
    ['1:56', '嘘みたいに きれいな夜'],
    ['2:03', 'Paper moon, paper moon'],
    ['2:09', 'もう少しだけ ここにいよう'],
    ['2:18', '♪'],
    ['2:40', '(Last call, last call)'],
    ['2:52', '♪'],
  ]),
  'al-onshitsu-1': L([
    ['0:00', '♪'],
    ['0:14', 'ガラス越しの 午後の陽だまり'],
    ['0:22', '名前のない 花が揺れてる'],
    ['0:30', '呼吸をするたび 曇る世界で'],
    ['0:38', '君の輪郭だけ 確かだった'],
    ['0:47', '♪'],
    ['0:56', '青い温室 時を止めて'],
    ['1:04', '溶けてゆく 光のなかで'],
    ['1:12', '青い温室 目を閉じたら'],
    ['1:20', 'もう一度 夢の続きを'],
    ['1:30', '♪'],
    ['1:48', '水やりを忘れた 鉢の影'],
    ['1:56', 'ひび割れた天窓 星がのぞく'],
    ['2:04', '枯れてしまう前に 伝えたいこと'],
    ['2:12', '指先が 少し震えてる'],
    ['2:22', '♪'],
    ['2:30', '青い温室 時を止めて'],
    ['2:38', '溶けてゆく 光のなかで'],
    ['2:46', '青い温室 目を覚ましても'],
    ['2:54', 'ここにいて 夢の続きで'],
    ['3:04', '♪'],
  ]),
  'al-koi-1': L([
    ['0:00', '♪'],
    ['0:09', 'ネオンの水面 跳ねる鯉'],
    ['0:15', '赤と青に 染まるウロコ'],
    ['0:21', 'Hey, hey 踊ろうよ'],
    ['0:27', '夜が明けるまで 泳いでいこう'],
    ['0:34', '♪'],
    ['0:44', 'ビルの谷間の 小さな池で'],
    ['0:50', '僕らはみんな 同じ夢を見る'],
    ['0:56', 'Hey, hey 回れ回れ'],
    ['1:02', 'ミラーボールの 月の下で'],
    ['1:10', '♪'],
    ['1:26', 'Neon Koi, Neon Koi'],
    ['1:32', '光の川を 登っていけ'],
    ['1:38', 'Neon Koi, Neon Koi'],
    ['1:44', '龍になるまで 止まらない'],
    ['1:52', '♪'],
    ['2:10', '(ワン、ツー、スリー、フォー)'],
    ['2:16', 'Neon Koi, Neon Koi'],
    ['2:22', '光の川を 登っていけ'],
    ['2:28', 'Neon Koi, Neon Koi'],
    ['2:34', '夜明けの空へ 跳ねていけ'],
    ['2:42', '♪'],
  ]),
  'al-mori-1': L([
    ['0:00', '♪'],
    ['0:11', '朝露ひかる 小径をぬけて'],
    ['0:19', 'ことりの声が 道をおしえる'],
    ['0:27', '名前も知らない 木の下で'],
    ['0:35', 'ちいさな歌を ひとつ拾った'],
    ['0:44', '♪'],
    ['0:52', 'ラララ 森のうた'],
    ['0:59', '風にのせて 届けにいこう'],
    ['1:07', 'ラララ 森のうた'],
    ['1:14', 'きみの窓まで'],
    ['1:22', '♪'],
    ['1:40', 'どんぐり三つ ポケットに入れて'],
    ['1:48', '帰り道は 少し遠回り'],
    ['1:56', '夕やけ色の 葉っぱの影が'],
    ['2:04', 'ぼくらの背中を そっと押した'],
    ['2:13', '♪'],
    ['2:24', 'ラララ 森のうた'],
    ['2:31', '明日もここで うたっているよ'],
    ['2:40', '♪'],
  ]),
}

export const fmtDur = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`
export const fmtTotal = (s: number) => {
  const h = Math.floor(s / 3600)
  const mm = Math.floor((s % 3600) / 60)
  const ss = Math.floor(s % 60)
  return h ? `${h}時間${mm}分` : `${mm}分${ss}秒`
}
