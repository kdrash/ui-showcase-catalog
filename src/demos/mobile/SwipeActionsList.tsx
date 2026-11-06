import { useRef, useState } from 'react'
import { animated, useSpring } from '@react-spring/web'
import { useDrag } from '@use-gesture/react'
import { Archive, Flag, RotateCcw, Trash } from 'lucide-react'
import { PhoneFrame } from './PhoneFrame'

type Mail = { id: number; from: string; subject: string; preview: string; time: string; unread: boolean; flagged?: boolean; color: string }

const MAILS: Mail[] = [
  { id: 1, from: '山本 さくら', subject: '来週の打ち合わせについて', preview: '資料を共有しますので事前にご確認ください', time: '9:12', unread: true, color: '#f472b6' },
  { id: 2, from: 'Travel Desk', subject: '【予約確定】京都 2泊3日', preview: 'チェックインは15時からです。当日は…', time: '8:40', unread: true, color: '#38bdf8' },
  { id: 3, from: '佐々木 健', subject: 'Re: 見積もりの件', preview: 'ありがとうございます。修正版を添付します', time: '昨日', unread: false, color: '#a78bfa' },
  { id: 4, from: 'Cloud Billing', subject: '11月分のご請求', preview: 'ご利用金額は ¥4,280 です', time: '昨日', unread: false, color: '#34d399' },
  { id: 5, from: '高橋 ひかり', subject: 'ランチどうですか?🍛', preview: '駅前に新しいカレー屋さんができたみたい', time: '火', unread: true, color: '#fbbf24' },
  { id: 6, from: 'デザイン部', subject: '週次レポート', preview: '今週のハイライトと来週の予定をまとめました', time: '月', unread: false, color: '#fb7185' },
]

const ACTION_W = 64

function Row({ mail, onRemove, onToggleFlag }: { mail: Mail; onRemove: () => void; onToggleFlag: () => void }) {
  const ref = useRef<HTMLDivElement>(null)
  const [{ x }, api] = useSpring(() => ({ x: 0 }))
  const [{ h, o }, hApi] = useSpring(() => ({ h: 66, o: 1 }))
  const width = () => ref.current?.offsetWidth ?? 220

  const remove = (dir: 1 | -1) =>
    api.start({
      x: dir * width(),
      config: { tension: 320, friction: 32 },
      onRest: () => void hApi.start({ h: 0, o: 0, config: { tension: 300, friction: 30 }, onRest: onRemove }),
    })

  const bind = useDrag(
    ({ active, movement: [mx], velocity: [vx], direction: [dx], tap }) => {
      if (tap) return
      const w = width()
      if (active) return void api.start({ x: mx, immediate: true })
      // フル実行のしきい値は「ボタン2個分+余裕」以上にして、開いた状態から誤って実行されないように
      const full = Math.max(w * 0.6, ACTION_W * 2 + 48)
      if (mx < -full || (vx > 1.5 && dx < 0 && mx < -ACTION_W * 2 - 10)) return remove(-1)
      if (mx > Math.max(w * 0.5, ACTION_W + 48) || (vx > 1.5 && dx > 0 && mx > 90)) return remove(1)
      if (mx < -40) return void api.start({ x: -ACTION_W * 2 })
      if (mx > 40) return void api.start({ x: ACTION_W })
      api.start({ x: 0 })
    },
    { axis: 'x', from: () => [x.get(), 0], filterTaps: true, rubberband: 0.15 },
  )

  return (
    <animated.div ref={ref} style={{ height: h, opacity: o }} className="relative overflow-hidden">
      {/* left: archive */}
      <animated.div style={{ opacity: x.to((v) => (v > 0 ? 1 : 0)) }} className="absolute inset-0 flex items-center bg-emerald-500 pl-5 text-white">
        <button onClick={() => remove(1)} className="flex flex-col items-center text-[9px] font-medium">
          <Archive size={17} /> アーカイブ
        </button>
      </animated.div>
      {/* right: flag + delete */}
      <animated.div style={{ opacity: x.to((v) => (v < 0 ? 1 : 0)) }} className="absolute inset-0 flex justify-end bg-rose-500 text-white">
        <animated.button
          onClick={() => {
            onToggleFlag()
            api.start({ x: 0 })
          }}
          style={{ opacity: x.to((v) => (v < -(ACTION_W * 2 + 28) ? 0 : 1)) }}
          className="flex w-16 flex-col items-center justify-center gap-0.5 bg-orange-400 text-[9px] font-medium"
        >
          <Flag size={16} /> {mail.flagged ? '解除' : 'フラグ'}
        </animated.button>
        <button onClick={() => remove(-1)} className="flex w-16 flex-col items-center justify-center gap-0.5 text-[9px] font-medium">
          <Trash size={16} /> 削除
        </button>
      </animated.div>
      <animated.div
        {...bind()}
        style={{ x, touchAction: 'pan-y' }}
        className="relative flex h-full cursor-grab items-center gap-2.5 border-b border-zinc-100 bg-white px-3 active:cursor-grabbing"
      >
        <div className="relative">
          <div className="grid h-9 w-9 place-items-center rounded-full text-[13px] font-bold text-white" style={{ background: mail.color }}>
            {mail.from[0]}
          </div>
          {mail.unread && <span className="absolute -left-1.5 top-3.5 h-2 w-2 rounded-full bg-blue-500" />}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-2">
            <span className={`truncate text-[12px] ${mail.unread ? 'font-bold' : 'font-semibold'} text-zinc-900`}>{mail.from}</span>
            <span className="flex shrink-0 items-center gap-1 text-[10px] text-zinc-400">
              {mail.flagged && <Flag size={9} className="fill-orange-400 text-orange-400" />}
              {mail.time}
            </span>
          </div>
          <div className="truncate text-[11px] text-zinc-800">{mail.subject}</div>
          <div className="truncate text-[10px] text-zinc-400">{mail.preview}</div>
        </div>
      </animated.div>
    </animated.div>
  )
}

export function SwipeActionsList() {
  const [mails, setMails] = useState(MAILS)
  return (
    <PhoneFrame
      side={
        <div className="space-y-2">
          <div className="text-base font-bold text-zinc-900">スワイプアクション</div>
          <p>← 左にスワイプでフラグ / 削除、→ 右にスワイプでアーカイブ。</p>
          <p>大きく(または勢いよく)スワイプすると、そのまま実行されて行が畳まれます。</p>
        </div>
      }
    >
      <div className="absolute inset-0 flex flex-col pt-11">
        <div className="flex items-end justify-between px-4 pb-2">
          <div className="text-[24px] font-bold tracking-tight text-zinc-900">受信</div>
          <span className="pb-1 text-[11px] text-blue-500">編集</span>
        </div>
        <div className="flex-1 overflow-y-auto pb-6 select-none">
          {mails.map((m) => (
            <Row
              key={m.id}
              mail={m}
              onRemove={() => setMails((xs) => xs.filter((x) => x.id !== m.id))}
              onToggleFlag={() => setMails((xs) => xs.map((x) => (x.id === m.id ? { ...x, flagged: !x.flagged } : x)))}
            />
          ))}
          {!mails.length && (
            <div className="mt-16 text-center text-xs text-zinc-400">
              すべて処理しました 🎉
              <button onClick={() => setMails(MAILS)} className="mx-auto mt-3 flex items-center gap-1 rounded-full bg-zinc-900 px-3 py-1.5 text-[11px] text-white">
                <RotateCcw size={11} /> 元に戻す
              </button>
            </div>
          )}
        </div>
      </div>
    </PhoneFrame>
  )
}
