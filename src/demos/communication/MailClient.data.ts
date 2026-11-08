/* MailClient のデータ。人物・会社・サービス・地名・本文はすべて架空 */

export type PersonId =
  | 'me'
  | 'morikawa'
  | 'hasebe'
  | 'onodera'
  | 'nakamura'
  | 'mother'
  | 'murakami'
  | 'sorano'
  | 'tabi'
  | 'pixel'
  | 'forge'
  | 'komichi'
  | 'kintai'

export type Person = { name: string; short: string; email: string; hue: number; org?: boolean; kana?: string }

export const PEOPLE: Record<PersonId, Person> = {
  me: { name: '宮下 遥', short: '自分', email: 'haruka@tomoshibi-lab.jp', hue: 228 },
  morikawa: { name: '森川 拓海', short: '森川', email: 'takumi.morikawa@tomoshibi-lab.jp', hue: 18, kana: 'もりかわ たくみ' },
  hasebe: { name: '長谷部 さくら', short: '長谷部', email: 'sakura@hasebe-photo.jp', hue: 338, kana: 'はせべ さくら' },
  onodera: { name: '小野寺 健', short: '小野寺', email: 'ken.onodera@tomoshibi-lab.jp', hue: 152, kana: 'おのでら けん' },
  nakamura: { name: '中村 理央', short: '理央', email: 'rio.n@kumoji-mail.jp', hue: 268, kana: 'なかむら りお' },
  mother: { name: '宮下 恵子', short: '母', email: 'keiko.miyashita@kumoji-mail.jp', hue: 36, kana: 'みやした けいこ はは' },
  murakami: { name: '村上 葵', short: '村上', email: 'aoi@murakami-studio.jp', hue: 192, kana: 'むらかみ あおい' },
  sorano: { name: 'ソラノ電気', short: 'ソラノ電気', email: 'billing@sorano-denki.jp', hue: 205, org: true },
  tabi: { name: 'たびのそら', short: 'たびのそら', email: 'noreply@tabinosora.jp', hue: 172, org: true },
  pixel: { name: '週刊ピクセル便り', short: 'ピクセル便り', email: 'letter@pixel-dayori.jp', hue: 296, org: true },
  forge: { name: 'Forgeline', short: 'Forgeline', email: 'notifications@forgeline.dev', hue: 250, org: true },
  komichi: { name: '本の小径', short: '本の小径', email: 'shop@hon-no-komichi.jp', hue: 24, org: true },
  kintai: { name: '勤怠ナビ', short: '勤怠ナビ', email: 'no-reply@kintai-navi.jp', hue: 128, org: true },
}

export const CONTACTS: PersonId[] = ['morikawa', 'hasebe', 'onodera', 'nakamura', 'murakami', 'mother']

export type LabelId = 'work' | 'travel' | 'bills' | 'family' | 'news' | 'dev'
export const LABELS: Record<LabelId, { name: string; color: string; soft: string }> = {
  work: { name: '仕事', color: '#3557d4', soft: '#e7ecfc' },
  travel: { name: '旅行', color: '#0f8a7a', soft: '#ddf3ef' },
  bills: { name: '請求書', color: '#b7791f', soft: '#fbf0d9' },
  family: { name: '家族', color: '#c2416b', soft: '#fbe4ec' },
  news: { name: 'ニュースレター', color: '#7a4fc9', soft: '#efe7fb' },
  dev: { name: '開発', color: '#475569', soft: '#e8ecf1' },
}
export const LABEL_IDS = Object.keys(LABELS) as LabelId[]

export type AttachKind = 'pdf' | 'lake' | 'tent' | 'coffee' | 'lighting' | 'logo' | 'doc'
export type Attachment = { name: string; size: string; kind: AttachKind }

export type Msg = {
  id: string
  from: PersonId
  to: PersonId[]
  cc?: PersonId[]
  at: number
  body: string[]
  attachments?: Attachment[]
}

export type Folder = 'inbox' | 'sent' | 'archive' | 'trash' | 'drafts'

export type Thread = {
  id: string
  subject: string
  msgs: Msg[]
  folder: Folder
  labels: LabelId[]
  unread: boolean
  starred: boolean
  important?: boolean
  snoozedUntil?: number
  invite?: { date: string; time: string; place: string; rsvp?: 'yes' | 'maybe' | 'no' }
  /** 下書き(作成中の本文) */
  draft?: { to: PersonId[]; subject: string; body: string }
}

/** デモ内の「現在」— 2026年11月9日(月) 10:24 */
export const NOW = new Date(2026, 10, 9, 10, 24).getTime()
const at = (month: number, day: number, h: number, m: number) => new Date(2026, month - 1, day, h, m).getTime()

let mid = 0
const m = (from: PersonId, to: PersonId[], time: number, body: string[], extra: Partial<Msg> = {}): Msg => ({
  id: `m${++mid}`,
  from,
  to,
  at: time,
  body,
  ...extra,
})

export const INITIAL_THREADS: Thread[] = [
  {
    id: 't1',
    subject: '秋のリブランディング案 v3 へのフィードバック',
    folder: 'inbox',
    labels: ['work'],
    unread: true,
    starred: true,
    important: true,
    msgs: [
      m('me', ['morikawa', 'onodera'], at(11, 6, 17, 48), [
        '森川さん、小野寺さん',
        'お疲れさまです。宮下です。リブランディング案の v3 をお送りします。前回いただいたコメントを反映し、ロゴの字間とサブカラーを中心に調整しました。',
        '・ロゴタイプの字間を +20 → +12 に詰めました\n・サブカラーを「灯オレンジ」から少し彩度を落とした「夕凪オレンジ」に変更\n・名刺と封筒のモックアップを追加',
        '月曜の午前中までにご意見いただけると助かります。',
      ], { attachments: [{ name: 'brand_v3.pdf', size: '8.2 MB', kind: 'pdf' }] }),
      m('morikawa', ['me', 'onodera'], at(11, 6, 19, 5), [
        '宮下さん',
        '早速ありがとうございます！ ざっと見ました。夕凪オレンジ、すごくいいですね。紙に刷ったときの落ち着きが全然違います。',
        '細かいところは週末に見て、月曜の朝に戻します。',
      ]),
      m('onodera', ['me', 'morikawa'], at(11, 7, 11, 20), [
        '横から失礼します、小野寺です。',
        '封筒のモックアップ、窓付きの長3も一案あるといいかもしれません。経理から「窓付きじゃないと困る」と言われそうなので…。',
      ]),
      m('morikawa', ['me', 'onodera'], at(11, 9, 9, 41), [
        '宮下さん、小野寺さん',
        'お待たせしました。v3 へのフィードバックを PDF にまとめました（p.3〜p.7 に赤入れしています）。大きな方向性はこのまま進めましょう。気になったのは次の3点です。',
        '1. ロゴマークを 16px 以下で使うと、灯の切れ込みが潰れる\n2. 夕凪オレンジと背景ベージュのコントラストが、本文用には少し弱い\n3. 封筒は小野寺さん案の「窓付き長3」も追加でお願いします',
        '木曜のデザイン定例で最終確認できればと思っています。よろしくお願いします！',
      ], {
        attachments: [
          { name: 'brand_v3_feedback.pdf', size: '2.4 MB', kind: 'pdf' },
          { name: 'logo_small_test.png', size: '640 KB', kind: 'logo' },
        ],
      }),
    ],
  },
  {
    id: 't2',
    subject: '来週の撮影スケジュールについて',
    folder: 'inbox',
    labels: ['work'],
    unread: true,
    starred: false,
    msgs: [
      m('me', ['hasebe'], at(11, 5, 13, 2), [
        '長谷部さん',
        '来週の商品撮影の件、スタジオの候補日をいくつか挙げていただけますか。小物はこちらで用意します。',
      ]),
      m('hasebe', ['me'], at(11, 9, 8, 15), [
        '宮下さん',
        'おはようございます、長谷部です。来週のスタジオ、以下の枠が押さえられそうです。',
        '・11月17日（火）10:00〜16:00\n・11月19日（木）13:00〜18:00',
        '自然光を使いたいので、個人的には17日の午前スタートがおすすめです。ライティングのラフを添付しますので、ご確認ください。',
      ], { attachments: [{ name: 'lighting_rough.jpg', size: '1.1 MB', kind: 'lighting' }] }),
    ],
  },
  {
    id: 't3',
    subject: '【予約確定】霧ヶ丘温泉 汐見荘 2泊3日のご予約',
    folder: 'inbox',
    labels: ['travel'],
    unread: true,
    starred: false,
    msgs: [
      m('tabi', ['me'], at(11, 9, 7, 2), [
        '宮下 遥 様',
        'このたびは「たびのそら」をご利用いただき、誠にありがとうございます。以下の内容でご予約が確定しました。',
        '予約番号：TS-7Q4K-2291\n宿泊施設：霧ヶ丘温泉 汐見荘\nチェックイン：2026年12月4日（金）15:00〜\nチェックアウト：2026年12月6日（日）〜10:00\nお部屋：海の見える和室（露天風呂付き）・大人2名',
        '当日はフロントで予約番号をお伝えください。キャンセルは3日前まで無料です。',
      ], { attachments: [{ name: 'eticket_TS-7Q4K-2291.pdf', size: '312 KB', kind: 'pdf' }] }),
    ],
  },
  {
    id: 't4',
    subject: '[tomoshibi/web] ヘッダーのナビゲーションを刷新 (#482)',
    folder: 'inbox',
    labels: ['dev'],
    unread: false,
    starred: false,
    msgs: [
      m('forge', ['me'], at(11, 9, 6, 30), [
        'haruka-m さんがプルリクエスト #482 をマージしました。',
        'ヘッダーのナビゲーションを刷新\n・メガメニューをやめ、2階層のシンプルなドロップダウンに変更\n・モバイルではボトムシートで展開\n・キーボード操作（矢印キー / Esc）に対応',
        '変更ファイル 14 件 · +612 −389',
        '— このメールは Forgeline の通知設定に基づいて送信されています。',
      ]),
    ],
  },
  {
    id: 't5',
    subject: '写真送ります',
    folder: 'inbox',
    labels: ['family'],
    unread: true,
    starred: true,
    msgs: [
      m('nakamura', ['me'], at(11, 8, 18, 40), [
        '遥さん',
        '先週のキャンプの写真、やっと整理できたので送ります！ 夕焼けの湖、我ながらいい感じに撮れました。',
        '残りはアルバムにまとめて共有しますね。また行きましょう〜',
      ], {
        attachments: [
          { name: 'yuyake_lake.jpg', size: '3.8 MB', kind: 'lake' },
          { name: 'tent_night.jpg', size: '2.9 MB', kind: 'tent' },
          { name: 'morning_coffee.jpg', size: '2.1 MB', kind: 'coffee' },
        ],
      }),
    ],
  },
  {
    id: 't6',
    subject: '招待: デザイン定例 @ 11月12日(木) 14:00〜15:00',
    folder: 'inbox',
    labels: ['work'],
    unread: false,
    starred: false,
    invite: { date: '11月12日(木)', time: '14:00〜15:00', place: '3F 会議室「みなと」/ Madoi Meet' },
    msgs: [
      m('morikawa', ['me', 'onodera', 'hasebe'], at(11, 8, 15, 3), [
        '森川 拓海さんから「デザイン定例」への招待が届いています。',
        '議題：リブランディング v3 の最終確認、封筒バリエーション、撮影の段取り',
      ]),
    ],
  },
  {
    id: 't7',
    subject: '週末のこと',
    folder: 'inbox',
    labels: ['family'],
    unread: false,
    starred: false,
    msgs: [
      m('mother', ['me'], at(11, 7, 10, 12), [
        '遥へ',
        '来週末、おばあちゃんの家に柿を取りに行くけど、一緒に行く？ 今年はたくさん実がなってるみたい。',
      ]),
      m('me', ['mother'], at(11, 7, 12, 30), ['行く行く！ 日曜の午後なら大丈夫。干し柿も作りたいな。']),
      m('mother', ['me'], at(11, 8, 21, 12), [
        'じゃあ来週の日曜、1時に駅で待ってるね。軍手と大きめの袋を持ってきてね。',
        'おばあちゃんが「遥ちゃんの好きな栗ごはんも炊いとく」って張り切ってます。',
      ]),
    ],
  },
  {
    id: 't8',
    subject: '11月分 電気料金のお知らせ（確定）',
    folder: 'inbox',
    labels: ['bills'],
    unread: false,
    starred: false,
    msgs: [
      m('sorano', ['me'], at(11, 7, 9, 0), [
        '宮下 遥 様',
        'いつもソラノ電気をご利用いただきありがとうございます。11月分の電気料金が確定しましたのでお知らせします。',
        'ご請求金額：7,842円（税込）\nご使用量：236kWh（前年同月比 −8%）\nお支払い予定日：2026年11月26日',
        '詳しい内訳はマイページからご確認いただけます。',
      ]),
    ],
  },
  {
    id: 't9',
    subject: 'Vol.128 余白は語る — 2026年のタイポグラフィ動向',
    folder: 'inbox',
    labels: ['news'],
    unread: false,
    starred: false,
    msgs: [
      m('pixel', ['me'], at(11, 7, 7, 30), [
        'こんにちは、週刊ピクセル便り編集部です。',
        '今週の特集は「余白」。可変フォントが当たり前になり、文字そのものより“文字のまわり”をデザインする時代になってきました。',
        '・特集：行間 1.8 は本当に正解か\n・インタビュー：書体デザイナー 汐田ことはさん\n・今週のツール：余白を測る定規プラグイン 3 選',
        '配信停止はメール末尾のリンクからどうぞ。',
      ]),
    ],
  },
  {
    id: 't10',
    subject: 'ランチ会の候補日',
    folder: 'inbox',
    labels: ['work'],
    unread: false,
    starred: false,
    msgs: [
      m('onodera', ['me', 'morikawa'], at(11, 6, 12, 10), [
        'チームのみなさん',
        '来週のランチ会、候補日を出します！ 火曜か水曜で考えています。お店は新しくできた定食屋「こめと汁」が気になってます。',
      ]),
      m('me', ['onodera', 'morikawa'], at(11, 6, 12, 44), ['水曜だとうれしいです！ こめと汁、気になってました。']),
    ],
  },
  {
    id: 't11',
    subject: 'ご注文の商品を発送しました（注文番号 KM-20418）',
    folder: 'inbox',
    labels: [],
    unread: false,
    starred: false,
    msgs: [
      m('komichi', ['me'], at(11, 5, 16, 20), [
        '宮下 遥 様',
        '本の小径をご利用いただきありがとうございます。ご注文の商品を本日発送いたしました。',
        '・『灯台守の手帖』汐田ことは 著 × 1\n・『紙と余白のデザイン』× 1',
        'お届け予定：11月7日（土）午前中\n配送伝票番号：4821-0937-1156',
      ]),
    ],
  },
  {
    id: 't12',
    subject: '【要対応】10月分の勤怠締めのお願い',
    folder: 'inbox',
    labels: ['work'],
    unread: false,
    starred: false,
    important: true,
    msgs: [
      m('kintai', ['me'], at(11, 4, 9, 0), [
        '宮下 遥 さん',
        '10月分の勤怠の締め切りは 11月10日（火）です。未申請の打刻修正が 2 件あります。',
        '・10月15日（木）退勤打刻なし\n・10月28日（水）休憩時間の未入力',
        '勤怠ナビにログインし、期限までに申請してください。',
      ]),
    ],
  },
  {
    id: 't13',
    subject: 'ポスター展の搬入について',
    folder: 'inbox',
    labels: ['work'],
    unread: false,
    starred: false,
    msgs: [
      m('murakami', ['me'], at(11, 3, 18, 22), [
        '宮下さん',
        '村上です。来月のポスター展「街と灯り」の搬入スケジュールが決まりました。',
        '搬入日：12月1日（火）10:00〜13:00\n会場：ギャラリー白波 2F',
        'B1 サイズのパネル 2 点でお願いします。展示レイアウト図を添付します。',
      ], { attachments: [{ name: 'gallery_layout.pdf', size: '1.6 MB', kind: 'pdf' }] }),
    ],
  },
  {
    id: 't14',
    subject: '来期の予算メモ',
    folder: 'inbox',
    labels: ['work'],
    unread: false,
    starred: false,
    snoozedUntil: at(11, 12, 8, 0),
    msgs: [
      m('onodera', ['me'], at(11, 2, 17, 5), [
        '宮下さん',
        '来期の制作予算のたたき台です。木曜の定例のあとにでも、ざっくり目を通してもらえると助かります。',
      ], { attachments: [{ name: 'budget_2027_draft.xlsx', size: '88 KB', kind: 'doc' }] }),
    ],
  },
  {
    id: 't15',
    subject: '年末の大掃除リスト',
    folder: 'archive',
    labels: ['family'],
    unread: false,
    starred: false,
    msgs: [
      m('mother', ['me'], at(10, 28, 20, 2), [
        '遥へ',
        '今年の大掃除の分担を考えました。遥は換気扇と窓をお願いね（去年もやってくれたので、慣れてるでしょう）。',
      ]),
    ],
  },
  {
    id: 't16',
    subject: 'Re: 見積書の件',
    folder: 'archive',
    labels: ['work'],
    unread: false,
    starred: false,
    msgs: [
      m('me', ['onodera'], at(10, 20, 15, 30), ['小野寺さん', '見積書、修正版を共有フォルダに置きました。ご確認お願いします。']),
      m('onodera', ['me'], at(10, 20, 16, 2), ['確認しました、ありがとうございます！ これで先方に出します。']),
    ],
  },
  {
    id: 't17',
    subject: 'Re: ポスター展の搬入について',
    folder: 'drafts',
    labels: [],
    unread: false,
    starred: false,
    msgs: [],
    draft: {
      to: ['murakami'],
      subject: 'Re: ポスター展の搬入について',
      body: '村上さん\n\n搬入の件、承知しました。当日は 10 時に',
    },
  },
]

/** デモ開始数秒後に届く新着 */
export const INCOMING: Thread = {
  id: 't-new',
  subject: '搬入日の変更について（急ぎ）',
  folder: 'inbox',
  labels: ['work'],
  unread: true,
  starred: false,
  important: true,
  msgs: [
    {
      id: 'm-new',
      from: 'murakami',
      to: ['me'],
      at: NOW,
      body: [
        '宮下さん',
        'たびたびすみません、村上です。会場側の都合で、搬入日が 12月2日（水）に1日後ろ倒しになりました。',
        '時間帯は同じく 10:00〜13:00 です。ご都合いかがでしょうか？',
      ],
    },
  ],
}

export const SMART_REPLIES: Record<string, string[]> = {
  t1: ['ありがとうございます、確認します！', '3点とも承知しました。木曜までに反映します。', 'p.5 の件、少しご相談させてください。'],
  t2: ['17日の午前でお願いします！', 'ありがとうございます。19日も含めて検討します。', 'ラフ拝見しました、すてきです。'],
  't-new': ['2日でも大丈夫です！', '承知しました。調整して折り返します。', 'ご連絡ありがとうございます。'],
  default: ['ありがとうございます！', '承知しました。', '確認して折り返します。'],
}
