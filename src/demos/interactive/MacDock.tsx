import { useEffect, useRef, useState } from 'react'
import {
  AnimatePresence,
  motion,
  useAnimate,
  useMotionValue,
  useSpring,
  useTransform,
  type MotionValue,
} from 'motion/react'
import {
  Calendar,
  Compass,
  Folder,
  Headphones,
  Image as ImageIcon,
  Mail,
  MessageCircle,
  Settings,
  Terminal,
  Trash,
  type LucideIcon,
} from 'lucide-react'

type App = { name: string; icon: LucideIcon; bg: string }

const apps: App[] = [
  { name: 'Finder', icon: Folder, bg: 'linear-gradient(180deg,#5ac8fa,#1e6ff1)' },
  { name: 'Safari', icon: Compass, bg: 'linear-gradient(180deg,#e0f2fe,#38bdf8)' },
  { name: 'Mail', icon: Mail, bg: 'linear-gradient(180deg,#60a5fa,#2563eb)' },
  { name: 'Messages', icon: MessageCircle, bg: 'linear-gradient(180deg,#86efac,#16a34a)' },
  { name: 'Music', icon: Headphones, bg: 'linear-gradient(180deg,#fb7185,#e11d48)' },
  { name: 'Photos', icon: ImageIcon, bg: 'conic-gradient(from 0deg,#f87171,#fbbf24,#4ade80,#60a5fa,#a78bfa,#f87171)' },
  { name: 'Calendar', icon: Calendar, bg: 'linear-gradient(180deg,#ffffff,#e5e7eb)' },
  { name: 'Terminal', icon: Terminal, bg: 'linear-gradient(180deg,#3f3f46,#09090b)' },
  { name: 'Settings', icon: Settings, bg: 'linear-gradient(180deg,#d4d4d8,#71717a)' },
]

function DockIcon({
  app,
  mouseX,
  running,
  onOpen,
}: {
  app: App
  mouseX: MotionValue<number>
  running: boolean
  onOpen: () => void
}) {
  const ref = useRef<HTMLButtonElement>(null)
  const [hover, setHover] = useState(false)
  const [scope, animate] = useAnimate()

  // カーソルからアイコン中心までの距離 → サイズ
  const distance = useTransform(mouseX, (x) => {
    const b = ref.current?.getBoundingClientRect() ?? { x: 0, width: 0 }
    return x - b.x - b.width / 2
  })
  const target = useTransform(distance, [-150, 0, 150], [44, 80, 44])
  const size = useSpring(target, { mass: 0.1, stiffness: 170, damping: 13 })

  const click = () => {
    animate(scope.current, { y: [0, -26, 0, -12, 0] }, { duration: 0.9, ease: 'easeOut' })
    onOpen()
  }
  const Icon = app.icon
  const dark = app.name === 'Calendar' || app.name === 'Safari'

  return (
    <motion.button
      ref={ref}
      style={{ width: size, height: size }}
      onHoverStart={() => setHover(true)}
      onHoverEnd={() => setHover(false)}
      onClick={click}
      className="relative flex shrink-0 flex-col items-center"
    >
      <AnimatePresence>
        {hover && (
          <motion.span
            initial={{ opacity: 0, y: 6, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: 4, x: '-50%' }}
            className="pointer-events-none absolute -top-9 left-1/2 whitespace-nowrap rounded-md border border-white/20 bg-zinc-800/80 px-2 py-0.5 text-[11px] text-white backdrop-blur"
          >
            {app.name}
          </motion.span>
        )}
      </AnimatePresence>
      <div
        ref={scope}
        className="grid size-full place-items-center rounded-[24%] shadow-[0_4px_12px_rgba(0,0,0,.25),inset_0_1px_0_rgba(255,255,255,.4)]"
        style={{ background: app.bg }}
      >
        <Icon className={`size-1/2 ${dark ? 'text-zinc-700' : 'text-white'}`} strokeWidth={2} />
      </div>
      <span
        className={`absolute -bottom-1.5 size-1 rounded-full bg-white/90 transition-opacity ${
          running ? 'opacity-100' : 'opacity-0'
        }`}
      />
    </motion.button>
  )
}

function Clock() {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000 * 15)
    return () => clearInterval(id)
  }, [])
  return <span>{now.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}</span>
}

/** macOS 風 Dock。マウスとの距離に応じて useTransform → useSpring でアイコンが拡大する */
export function MacDock() {
  const mouseX = useMotionValue(Infinity)
  const [running, setRunning] = useState<string[]>(['Finder'])

  return (
    <div className="relative flex h-full w-full flex-col justify-between overflow-hidden bg-[#1e1b4b] bg-[radial-gradient(at_15%_20%,#f472b6_0,transparent_45%),radial-gradient(at_85%_25%,#818cf8_0,transparent_45%),radial-gradient(at_50%_90%,#22d3ee_0,transparent_50%)]">
      <div className="flex h-7 items-center justify-between bg-white/15 px-4 text-[11px] font-medium text-white backdrop-blur-md">
        <span className="flex gap-4">
          <b>◉</b>
          <span>Finder</span>
          <span className="opacity-80">ファイル</span>
          <span className="opacity-80">編集</span>
          <span className="opacity-80">表示</span>
        </span>
        <Clock />
      </div>

      <div className="flex justify-center pb-3">
        <div
          onMouseMove={(e) => mouseX.set(e.clientX)}
          onMouseLeave={() => mouseX.set(Infinity)}
          className="flex h-[62px] items-end gap-2 rounded-2xl border border-white/25 bg-white/15 px-2.5 pb-2.5 backdrop-blur-xl"
        >
          {apps.map((app, i) => (
            <div key={app.name} className="flex items-end gap-2">
              {i === apps.length - 1 && <div className="mb-1 h-10 w-px bg-white/30" />}
              <DockIcon
                app={app}
                mouseX={mouseX}
                running={running.includes(app.name)}
                onOpen={() => setRunning((r) => (r.includes(app.name) ? r : [...r, app.name]))}
              />
            </div>
          ))}
          <div className="mb-1 h-10 w-px bg-white/30" />
          <DockIcon
            app={{ name: 'Trash', icon: Trash, bg: 'linear-gradient(180deg,rgba(255,255,255,.5),rgba(255,255,255,.2))' }}
            mouseX={mouseX}
            running={false}
            onOpen={() => setRunning(['Finder'])}
          />
        </div>
      </div>
    </div>
  )
}
