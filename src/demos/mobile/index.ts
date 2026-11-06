import { lazy } from 'react'
import type { DemoEntry } from '../../catalog/types'

export const mobileDemos: DemoEntry[] = [
  {
    id: 'dynamic-island',
    title: 'ダイナミックアイランド風',
    description: '画面上部の黒いピルが、音楽・通話・タイマー・通知に合わせて伸び縮みし、タップで展開するモーフィングUI。',
    category: 'mobile',
    styles: ['ios', 'dark'],
    tech: ['react', 'motion', 'tailwind', 'lucide'],
    prompt:
      'スマホ画面上部の黒いピル(ダイナミックアイランド風)が状態に応じてモーフィングするUIを Motion で作って。状態は idle(小さなピル)/ 音楽・通話・タイマーのコンパクト表示(横長:左にアートワークや通話時間、右に動く波形やカウントダウン)/ 通知(大きめに広がってメッセージ表示、3秒で戻る)/ タップで展開(音楽はアートワーク・曲名・シークバー・再生ボタン、通話は相手と終話ボタン、タイマーは大きな残り時間)。motion.button に layout を付けてクラスで幅・高さを切り替え、borderRadius は style で指定してレイアウトアニメ中も歪まないようにする。中身は AnimatePresence mode="popLayout" で blur+scale しながら入れ替え、spring(stiffness 420, damping 32)。ロック画面の壁紙・大きな時刻・状態切り替えチップ付き。',
    file: 'mobile/DynamicIsland.tsx',
    component: lazy(() => import('./DynamicIsland').then((m) => ({ default: m.DynamicIsland }))),
    height: 520,
  },
  {
    id: 'ios-widgets',
    title: 'ホーム画面ウィジェット',
    description: '天気・カレンダー・ミュージック・アクティビティリング・バッテリーのすりガラスウィジェット。長押しでアイコンが揺れる編集モード。',
    category: 'mobile',
    styles: ['ios', 'glass'],
    tech: ['react', 'motion', 'svg', 'tailwind', 'lucide'],
    prompt:
      'iOS風のホーム画面を作って。4カラムのグリッドに、2×2の天気ウィジェット(青グラデのすりガラス・大きな気温)、白いカレンダーウィジェット(曜日・日付・予定2件の色付きライン)、4×2のミュージックウィジェット(アートワーク・曲名・再生ボタン)、黒背景に3重のアクティビティリング(SVG circle の strokeDashoffset を Motion でアニメーション)、端末ごとの円形バッテリー残量、角丸スクエアのグラデーションアプリアイコン、下部にすりガラスのドック。長押し(550ms)で編集モードに入り、全アイコン・ウィジェットが CSS keyframes で ±1.6° 小刻みに揺れ(要素ごとに animation-delay をずらす)、アイコン左上の「−」で削除すると Motion の layout で詰まる。右上の「完了」で終了。ウィジェットは bg-white/20 + backdrop-blur-xl + 白い細リング。',
    file: 'mobile/IosWidgets.tsx',
    component: lazy(() => import('./IosWidgets').then((m) => ({ default: m.IosWidgets }))),
    height: 520,
  },
  {
    id: 'swipe-actions-list',
    title: 'スワイプアクションのリスト',
    description: 'メールの行を左右にスワイプしてフラグ・削除・アーカイブ。大きくスワイプするとそのまま実行され、行が畳まれる。',
    category: 'mobile',
    styles: ['ios', 'minimal'],
    tech: ['react', 'reactspring', 'usegesture', 'tailwind', 'lucide'],
    prompt:
      '@use-gesture/react の useDrag と @react-spring/web の useSpring で、iOSメール風のスワイプアクション付きリストを作って。各行は x のスプリングを持ち、useDrag({ axis: "x", from: () => [x.get(), 0], filterTaps: true, rubberband }) でドラッグ中は immediate で追従。離した時、左に40px以上なら右側の「フラグ(オレンジ)」「削除(赤)」ボタンが見える位置にスナップ、右なら緑の「アーカイブ」を表示、幅の55%以上 or 速い速度でのフリックならそのまま画面外へ飛ばし、onRest で行の高さを0に畳んで配列から削除する。背景のボタン群は x の符号で表示を切り替え(x.to)、フルスワイプ時はフラグを隠して赤一色に。行は丸アバター・送信者・件名・プレビュー・時刻・未読の青い点。touch-action: pan-y で縦スクロールと両立。',
    file: 'mobile/SwipeActionsList.tsx',
    component: lazy(() => import('./SwipeActionsList').then((m) => ({ default: m.SwipeActionsList }))),
    height: 500,
  },
  {
    id: 'stories-viewer',
    title: 'ストーリービューア',
    description: '上部の分割プログレスバー、左右タップで前後、長押しで一時停止、横スワイプで次のユーザーへ立方体風に切り替わるストーリー。',
    category: 'mobile',
    styles: ['ios', 'dark'],
    tech: ['react', 'motion', 'tailwind', 'lucide'],
    prompt:
      'Instagram風のストーリービューアを作って。上部にスライド数ぶんの細いセグメントバーを並べ、現在のバーは requestAnimationFrame で transform: scaleX を直接更新(4.5秒で満ちたら次へ、再レンダーさせない)。画面の左1/3タップで前、それ以外で次、180ms以上の長押しで一時停止(一時停止アイコン表示)、横に45px以上スワイプで前後のユーザーへ。ユーザー切り替えは Motion の AnimatePresence + custom で方向を渡し、x と rotateY を組み合わせた立方体風トランジション(perspective 900)。スライド画像はクロスフェード+わずかなズーム、キャプションは白い付箋風ラベルが少し傾いて登場。ヘッダーにグラデ枠のアバター・名前・経過時間・×、下部に「メッセージを送信」欄・押すと縮むハート・送信アイコン。',
    file: 'mobile/StoriesViewer.tsx',
    component: lazy(() => import('./StoriesViewer').then((m) => ({ default: m.StoriesViewer }))),
    height: 520,
  },
  {
    id: 'pull-to-refresh',
    title: 'プル・トゥ・リフレッシュ',
    description: 'リストを引っ張ると抵抗感のある動きでリングが満ち、しきい値を超えて離すと更新。新着がスプリングで差し込まれる。',
    category: 'mobile',
    styles: ['ios', 'minimal'],
    tech: ['react', 'motion', 'usegesture', 'svg', 'tailwind', 'lucide'],
    prompt:
      'スマホのニュースフィードにプル・トゥ・リフレッシュを実装して。@use-gesture/react の useDrag で、スクロール位置が先頭のときだけ下方向のドラッグを拾い、引いた距離 d に対して y = d*0.55 − d²*0.0006 のように重くなる抵抗を付けて Motion の useMotionValue に反映。上部のインジケーターは SVG の円で、useTransform で引いた割合→strokeDashoffset に変換してリングが満ち、80%を超えると矢印が180°回転、ラベルが「引っ張って更新→指を離して更新→更新中…」と変わる。しきい値(70px)以上で離すと y を56pxで保持してスピナー回転、1.4秒後に新着2件を先頭に追加(NEWバッジ・枠線)し、y をスプリングで0に戻す。リスト項目は AnimatePresence + layout で上から差し込まれる。',
    file: 'mobile/PullToRefresh.tsx',
    component: lazy(() => import('./PullToRefresh').then((m) => ({ default: m.PullToRefresh }))),
    height: 500,
  },
  {
    id: 'spring-card-deck',
    title: 'スプリング・カードデッキ',
    description: '積み重なったカードをつかんで投げると、速度に応じて回転しながら飛んでいく。全部投げるとバネで積み直し。',
    category: 'mobile',
    styles: ['ios', 'minimal'],
    tech: ['react', 'reactspring', 'usegesture', 'tailwind', 'lucide'],
    prompt:
      '@react-spring/web の useSprings と @use-gesture/react の useDrag で、投げられるカードデッキ(旅先えらび)を作って。カードはわずかにランダムな角度で重ね、初回は上から降ってきて積まれる(from: y -900, scale 1.4、delay をずらす)。ドラッグ中は x=移動量、rotateZ=移動量/12、scale 1.05。離した時に velocity が 0.25 超か 110px 以上動いていれば、その方向の画面外へ回転しながら飛ばす(gone セットに追加)。全部なくなったら 650ms 後にバネで積み直す。transform は to([rot, scale]) で perspective+rotateX(8deg)+rotateY+rotateZ を合成。ドラッグ量に応じて「行きたい」「パス」のスタンプが不透明度で浮かび、下の ✕ / ♥ ボタンでも一番上のカードを投げられる。いいね/パスの件数表示付き。',
    file: 'mobile/SpringCardDeck.tsx',
    component: lazy(() => import('./SpringCardDeck').then((m) => ({ default: m.SpringCardDeck }))),
    height: 520,
  },
]
