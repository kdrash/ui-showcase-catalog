import { Star } from 'lucide-react'

type T = { name: string; role: string; text: string; stars: number; hue: number }

const DATA: T[] = [
  { name: '佐藤 美咲', role: 'PM / Northwind', text: '会議の議事録からタスク化まで自動。週5時間は浮きました。もう戻れません。', stars: 5, hue: 260 },
  { name: 'Daniel K.', role: 'CTO / Orbitly', text: 'API が素直で、社内ツールとの連携が半日で終わった。ドキュメントも丁寧。', stars: 5, hue: 200 },
  { name: '高橋 健', role: 'デザイナー', text: 'UI が静かで、仕事に集中できる。ショートカットが手に馴染むのも良い。', stars: 5, hue: 330 },
  { name: '山本 彩', role: 'CS リード / kumo.', text: '問い合わせの一次回答を AI に任せたら、返信時間が平均 3 時間 → 18 分に。', stars: 5, hue: 20 },
  { name: '伊藤 翔太', role: '個人開発者', text: '無料プランでも十分。小さく始めて、チームが増えたらそのまま移行できた。', stars: 4, hue: 150 },
  { name: 'Mia L.', role: 'Head of Ops / Vertex', text: 'Approvals that used to take days now take minutes. Our finance team loves it.', stars: 5, hue: 280 },
  { name: '中村 優', role: 'エンジニア', text: 'Webhook とワークフローの組み合わせが強力。障害通知もここに集約しました。', stars: 5, hue: 190 },
  { name: '小林 真央', role: 'マーケター', text: 'キャンペーンの進行管理が一目でわかる。上司への報告資料も自動で作れる。', stars: 4, hue: 40 },
  { name: '加藤 大輔', role: '経営者 / Halcyon', text: '導入 3 か月で全社に浸透。ツール乱立が解消され、コストも 30% 削減。', stars: 5, hue: 120 },
  { name: '吉田 さくら', role: '人事', text: '入社手続きのチェックリストが自動で回るので、抜け漏れがゼロになりました。', stars: 5, hue: 350 },
  { name: 'Ryo T.', role: 'Founder / Arcadia', text: 'Feels like it was built by people who actually ship things. Fast, focused, delightful.', stars: 5, hue: 230 },
  { name: '松本 葵', role: 'デザインリード', text: 'コメントとレビューの流れが自然。デザイナーとエンジニアの会話が増えました。', stars: 5, hue: 300 },
]

function Card({ t }: { t: T }) {
  return (
    <figure className="rounded-2xl border border-zinc-200/80 bg-white p-4 shadow-[0_1px_2px_rgba(0,0,0,.04),0_8px_24px_-12px_rgba(0,0,0,.12)] transition hover:-translate-y-0.5 hover:shadow-lg">
      <div className="flex gap-0.5">
        {Array.from({ length: 5 }, (_, i) => (
          <Star key={i} size={12} className={i < t.stars ? 'fill-amber-400 text-amber-400' : 'text-zinc-300'} />
        ))}
      </div>
      <blockquote className="mt-2 text-[13px] leading-relaxed text-zinc-700">{t.text}</blockquote>
      <figcaption className="mt-3 flex items-center gap-2.5">
        <span
          className="grid h-8 w-8 place-items-center rounded-full text-xs font-bold text-white"
          style={{ background: `linear-gradient(135deg, hsl(${t.hue} 80% 62%), hsl(${t.hue + 40} 80% 50%))` }}
        >
          {t.name.slice(0, 1)}
        </span>
        <span>
          <span className="block text-[13px] font-semibold text-zinc-900">{t.name}</span>
          <span className="block text-[11px] text-zinc-500">{t.role}</span>
        </span>
      </figcaption>
    </figure>
  )
}

/** 縦に無限スクロールする1列。中身を2回並べて -50% まで動かすとループが繋がる */
function Column({ items, duration, reverse, className = '' }: { items: T[]; duration: number; reverse?: boolean; className?: string }) {
  return (
    <div className={`tw-col min-w-0 flex-1 overflow-hidden ${className}`}>
      <div
        className="tw-track flex flex-col gap-4 pb-4"
        style={{ animation: `tw-up ${duration}s linear infinite ${reverse ? 'reverse' : ''}` }}
      >
        {[...items, ...items].map((t, i) => (
          <Card key={i} t={t} />
        ))}
      </div>
    </div>
  )
}

export function TestimonialWall() {
  const cols = [0, 1, 2, 3].map((c) => DATA.filter((_, i) => i % 4 === c))
  return (
    <div className="@container relative flex h-full w-full flex-col overflow-hidden bg-gradient-to-b from-zinc-50 to-indigo-50/60 font-['Noto_Sans_JP',Inter,sans-serif]">
      <style>{`@keyframes tw-up{to{transform:translateY(-50%)}} .tw-col:hover .tw-track{animation-play-state:paused}`}</style>
      <div className="px-5 pt-7 pb-4 text-center">
        <p className="text-[11px] font-semibold tracking-[0.2em] text-indigo-600 uppercase">Testimonials</p>
        <h2 className="mt-2 text-[clamp(20px,4cqw,32px)] font-bold tracking-tight text-zinc-900">10,000以上のチームに愛されています</h2>
        <p className="mt-1.5 inline-flex items-center gap-1.5 text-xs text-zinc-500">
          <Star size={12} className="fill-amber-400 text-amber-400" /> 4.9 / 5 — 2,300件以上のレビュー
        </p>
      </div>
      <div className="relative flex min-h-0 flex-1 gap-4 px-5 [mask-image:linear-gradient(transparent,black_14%,black_86%,transparent)]">
        <Column items={cols[0]} duration={26} />
        <Column items={cols[1]} duration={32} reverse />
        <Column items={cols[2]} duration={22} className="hidden @2xl:block" />
        <Column items={cols[3]} duration={36} reverse className="hidden @4xl:block" />
      </div>
    </div>
  )
}
