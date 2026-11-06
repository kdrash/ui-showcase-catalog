import { lazy } from 'react'
import type { DemoEntry } from '../../catalog/types'

export const chartDemos: DemoEntry[] = [
  {
    id: 'd3-force-graph',
    title: 'D3 フォースグラフ',
    description: '技術スタックの関係を力学シミュレーションで配置したネットワーク図。ノードのドラッグ、ホイールでのズーム、ホバーで隣接ノードだけを強調。',
    category: 'chart',
    styles: ['dark'],
    tech: ['react', 'd3', 'svg', 'tailwind'],
    prompt:
      'D3.js でフォース指向のネットワーク図を作ってください。nodes(id, group)と links(source, target)を用意し、d3.forceSimulation に forceLink(distance 48)・forceManyBody(-170)・forceCollide(半径+6)・forceX/Y(弱い中心引力)を設定。ノードは接続数の平方根で半径を決めた円+薄い外側の光彩+ラベル(paint-order: stroke で縁取り)、グループごとに色分けします。d3.drag でドラッグ中は fx/fy を固定し alphaTarget(0.3) で再加熱、d3.zoom(0.4〜4倍)でパン・ズーム。ホバー時は隣接ノード以外を opacity 0.15 に、接続リンクをノードの色で強調し、ツールチップに名前・グループ・接続数を表示。ResizeObserver で viewBox を中心原点に更新します。濃紺(#0b1020)の背景、左上に凡例。',
    file: 'charts/D3ForceGraph.tsx',
    component: lazy(() => import('./D3ForceGraph').then((m) => ({ default: m.D3ForceGraph }))),
    height: 380,
  },
  {
    id: 'd3-zoomable-sunburst',
    title: 'ズームできるサンバースト',
    description: '年間予算の内訳を同心円の階層で表示。扇形をクリックするとその階層へアニメーションで拡大し、中央クリックやパンくずで戻れる。',
    category: 'chart',
    styles: ['dark'],
    tech: ['react', 'd3', 'svg', 'tailwind', 'lucide'],
    prompt:
      'D3.js の d3.hierarchy + d3.partition で「ズーム可能なサンバースト図」を作ってください。partition の size を [2π, 高さ+1] にし、d3.arc で startAngle=x0, endAngle=x1, innerRadius=y0*radius, outerRadius=y1*radius、padAngle と cornerRadius(3) で隙間と角丸を付けます。表示は2階層分だけにし、扇形をクリックすると各ノードの target 角度・半径を計算して 750ms の transition(attrTween + d3.interpolate)でズーム、中央の円クリックで親へ戻ります。色は第1階層ごとにパレットを割り当て、深い階層ほど brighter で明るく。ラベルは面積が十分な扇形だけ回転させて表示。中央にホバー中/フォーカス中の名前・金額・全体比を表示し、上部にパンくず(クリックでその階層へ)を置きます。ResizeObserver で半径を再計算。',
    file: 'charts/D3ZoomableSunburst.tsx',
    component: lazy(() => import('./D3ZoomableSunburst').then((m) => ({ default: m.D3ZoomableSunburst }))),
    height: 400,
  },
  {
    id: 'd3-world-globe',
    title: '回せる地球儀(コロプレス)',
    description: 'world-atlas の世界地図を正射図法で描いた地球儀。自動回転・ドラッグで回転、国別の値で色分けし、ホバーで国名とユーザー数を表示。東京からの航路が破線で流れる。',
    category: 'chart',
    styles: ['dark', 'saas'],
    tech: ['react', 'd3', 'topojson', 'canvas', 'tailwind'],
    prompt:
      'D3.js の d3.geoOrthographic と world-atlas(countries-110m.json)+ topojson-client の feature() で、Canvas に描く地球儀のコロプレス図を作ってください。geoPath(projection, ctx) で海(Sphere を放射グラデーション)・経緯線(geoGraticule10)・国(値に応じて d3.scaleSequential + interpolateRgbBasis の濃紺→青→シアン)を毎フレーム描画し、外側に大気のグロー。requestAnimationFrame で rotate の経度を少しずつ進めて自動回転、d3.drag で回転(緯度は ±80° に制限)、離して2秒後に自動回転を再開します。マウス位置を projection.invert で緯度経度に戻して d3.geoContains でホバー中の国を判定し、黄色で強調+ツールチップ(日本語名・ユーザー数)。東京から主要都市への大圏航路を d3.geoInterpolate で点列化し、setLineDash と lineDashOffset を時間で動かして流れる破線にします。都市はパルスする点、裏側の点は geoDistance で非表示。ResizeObserver + devicePixelRatio 対応。',
    file: 'charts/D3WorldGlobe.tsx',
    component: lazy(() => import('./D3WorldGlobe').then((m) => ({ default: m.D3WorldGlobe }))),
    height: 400,
  },
  {
    id: 'echarts-showcase',
    title: 'ECharts ギャラリー',
    description: 'Apache ECharts で、順位が入れ替わるバーレース・リアルタイムのゲージ・製品比較レーダー・1年分のカレンダーヒートマップをタブで切り替え。',
    category: 'chart',
    styles: ['dark'],
    tech: ['react', 'echarts', 'tailwind'],
    prompt:
      'Apache ECharts を echarts/core から必要なチャート(BarChart, GaugeChart, RadarChart, HeatmapChart)とコンポーネント(Grid, Tooltip, Radar, Calendar, VisualMap)、CanvasRenderer だけ echarts.use で登録して(ツリーシェイキング)、タブ切り替えのチャートギャラリーを作ってください。echarts.init(el, "dark") で1つのインスタンスを作り、ResizeObserver で chart.resize()、アンマウントで dispose。①バーレース: yAxis を inverse、series に realtimeSort: true と label.valueAnimation を設定し、1秒ごとに値を増やして setOption すると順位が入れ替わるアニメーションに(animationDurationUpdate 1000, easing linear)。②ゲージ: startAngle 210〜-30、グラデーションの progress と roundCap、detail.valueAnimation で数値が動く CPU 使用率。③レーダー: 6軸で自社と競合の2系列を半透明の面で比較。④カレンダー: calendar 座標系 + heatmap で2026年の日別コミット数、visualMap で色段階、曜日・月ラベルを日本語化。背景は透明、紺色のパネル。',
    file: 'charts/EChartsShowcase.tsx',
    component: lazy(() => import('./EChartsShowcase').then((m) => ({ default: m.EChartsShowcase }))),
    height: 380,
  },
  {
    id: 'chartjs-gallery',
    title: 'Chart.js ダッシュボード',
    description: 'Chart.js(react-chartjs-2)で作る明るいダッシュボード。グラデーション塗りの折れ線、中央に合計を描いたドーナツ、積み上げ棒グラフ。',
    category: 'chart',
    styles: ['minimal', 'shadcn'],
    tech: ['react', 'chartjs', 'canvas', 'tailwind'],
    prompt:
      'Chart.js と react-chartjs-2 で、白基調のミニダッシュボードを作ってください。ChartJS.register で CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Filler, Tooltip, Legend だけ登録します。上段は今年(実線・tension 0.4・ポイント非表示)と昨年(破線)の折れ線で、backgroundColor をスクリプタブル関数にして chart.chartArea から縦の linearGradient(インディゴ→透明)を作り fill: true。interaction は mode: "index", intersect: false で縦一列のツールチップ。右上に 6M/12M の期間切替。下段左は cutout 72% のドーナツで、afterDraw のインラインプラグインで中央に「¥8.4M 今月の売上」を描画、凡例は右に usePointStyle。下段右は曜日別の新規/既存の積み上げ棒(stacked: true, borderRadius 4)。maintainAspectRatio: false で親の高さに合わせ、グリッド線は薄く、軸の線は非表示。',
    file: 'charts/ChartJsGallery.tsx',
    component: lazy(() => import('./ChartJsGallery').then((m) => ({ default: m.ChartJsGallery }))),
    height: 420,
  },
  {
    id: 'contribution-heatmap',
    title: 'コントリビューション・カレンダー',
    description: 'GitHub 風の1年分の活動ヒートマップ。年の切り替え、マス目ホバーで日付と件数のツールチップ、最長連続日数などの統計付き。',
    category: 'chart',
    styles: ['dark'],
    tech: ['react', 'svg', 'motion', 'tailwind', 'lucide'],
    prompt:
      'GitHub のプロフィールにあるような年間コントリビューション・カレンダーを SVG で作ってください。1月1日の曜日をオフセットにして、各日を (週=列, 曜日=行) の小さな角丸の正方形で並べ(53列×7行)、件数を5段階(0, 1–2, 3–5, 6–8, 9+)の緑で塗り分けます。マス目のサイズは ResizeObserver で幅に合わせて計算し、上に「1月〜12月」、左に「月・水・金」のラベル。ホバーで白い枠+吹き出しツールチップ(「5 contributions 3月14日(土)」)、右下に「少 ■■■■■ 多」の凡例。右上の年ボタン(2024/2025/2026)で切り替えると Motion で列ごとに少しずつ遅らせてフェードイン。下に最長連続日数・現在の連続日数・最多の日の統計カード。ダーク(#0d1117)と細いボーダー(#30363d)。',
    file: 'charts/ContributionHeatmap.tsx',
    component: lazy(() => import('./ContributionHeatmap').then((m) => ({ default: m.ContributionHeatmap }))),
    height: 340,
  },
  {
    id: 'activity-rings',
    title: 'アクティビティリング',
    description: 'Apple Watch 風の3重リング(ムーブ・エクササイズ・スタンド)。曜日を選ぶとリングがバネのように伸び、数値は NumberFlow で桁ごとにアニメーション。目標超えは2周目を重ねて表示。',
    category: 'chart',
    styles: ['dark', 'ios'],
    tech: ['react', 'motion', 'numberflow', 'svg', 'tailwind'],
    prompt:
      'Apple Watch のアクティビティリング風のUIを作ってください。SVG で同心円を3本(ムーブ=赤ピンク、エクササイズ=黄緑、スタンド=シアン)描き、それぞれ背景に同色の20%の円、その上に strokeLinecap: round の linearGradient の円を重ね、-90°回転して12時から始めます。進捗は Motion の motion.circle の pathLength を 0 → 達成率(最大1)に spring(stiffness 40, damping 14)でアニメーションし、100%を超えた分は影付きの2周目の円を重ねます。右側に各リングの「現在値/目標 単位」と達成率を @number-flow/react の <NumberFlow> で表示(format={{ style: "percent" }})。下に月〜日の7つのミニリング付きボタンを並べ、選んだ日のデータに切り替えると大きいリングが再アニメーション。背景は純黒。',
    file: 'charts/ActivityRings.tsx',
    component: lazy(() => import('./ActivityRings').then((m) => ({ default: m.ActivityRings }))),
    height: 340,
  },
  {
    id: 'sankey-diagram',
    title: 'サンキー図(家計の流れ)',
    description: '収入から税・固定費・変動費・貯蓄へとお金が流れる様子を d3-sankey で可視化。ノードやリンクにホバーすると関係する流れだけが浮かび上がる。',
    category: 'chart',
    styles: ['dark'],
    tech: ['react', 'd3', 'svg', 'tailwind'],
    prompt:
      'd3-sankey で家計(または予算・エネルギー)の流れを示すサンキー図を作ってください。nodes(名前・色)と links(source/target のインデックス・value)を用意し、sankey().nodeWidth(10).nodePadding(高さに応じて).nodeAlign(sankeyJustify).extent([[8,8],[幅-118,高さ-8]]) でレイアウト(ResizeObserver の幅・高さで useMemo 再計算)。リンクは sankeyLinkHorizontal() のパスを、出発ノード色→到着ノード色の userSpaceOnUse な linearGradient の太い stroke で描き、通常は不透明度 0.42。リンクにホバーするとそのリンクだけ、ノードにホバーするとそのノードに出入りするリンクと隣接ノードだけを強調し、他は 0.07 / 0.3 に薄くします。ノード右に名前と金額(paint-order: stroke で縁取り)、ホバー中のリンクは右上に「給与 → 手取り: 34万円」と表示。ダーク背景にパステル調の色。',
    file: 'charts/SankeyDiagram.tsx',
    component: lazy(() => import('./SankeyDiagram').then((m) => ({ default: m.SankeyDiagram }))),
    height: 360,
  },
]
