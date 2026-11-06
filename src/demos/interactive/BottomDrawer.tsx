import { useState } from 'react'
import { Drawer } from 'vaul'
import { Copy, Download, Link, Mail, MessageCircle, Send, Share2, Star } from 'lucide-react'

const apps = [
  { name: 'メッセージ', icon: MessageCircle, bg: 'bg-green-500' },
  { name: 'メール', icon: Mail, bg: 'bg-sky-500' },
  { name: '送信', icon: Send, bg: 'bg-indigo-500' },
  { name: 'お気に入り', icon: Star, bg: 'bg-amber-400' },
]
const rows = [
  { label: 'リンクをコピー', icon: Link },
  { label: '複製', icon: Copy },
  { label: '保存', icon: Download },
]

/**
 * Vaul のボトムシート。container をプレビュー要素にして absolute 配置にすることで
 * 枠内に収めている(通常はそのまま fixed で画面下から出す)。
 */
export function BottomDrawer() {
  const [container, setContainer] = useState<HTMLDivElement | null>(null)

  return (
    <div
      ref={setContainer}
      className="relative h-full w-full overflow-hidden bg-gradient-to-b from-sky-100 via-indigo-50 to-rose-100"
    >
      <div className="mx-auto mt-6 w-[250px] overflow-hidden rounded-3xl bg-white shadow-xl">
        <div className="h-32 bg-[radial-gradient(circle_at_30%_30%,#fde68a,transparent_40%),radial-gradient(circle_at_70%_60%,#f472b6,transparent_45%),linear-gradient(135deg,#6366f1,#06b6d4)]" />
        <div className="flex items-center justify-between p-3">
          <div>
            <p className="text-sm font-semibold text-zinc-900">Sunset Trip</p>
            <p className="text-xs text-zinc-500">24枚の写真</p>
          </div>
          <Drawer.Root container={container} noBodyStyles>
            <Drawer.Trigger asChild>
              <button className="flex items-center gap-1.5 rounded-full bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white active:scale-95">
                <Share2 size={13} /> 共有
              </button>
            </Drawer.Trigger>
            <Drawer.Portal>
              <Drawer.Overlay className="absolute inset-0 z-10 bg-black/40" />
              <Drawer.Content className="absolute inset-x-0 bottom-0 z-20 flex flex-col rounded-t-[22px] bg-white px-4 pb-4 pt-3 outline-none">
                <Drawer.Handle />
                <Drawer.Title className="mt-3 text-center text-sm font-semibold text-zinc-900">共有</Drawer.Title>
                <Drawer.Description className="text-center text-xs text-zinc-500">
                  下にドラッグすると閉じます
                </Drawer.Description>
                <div className="mt-3 grid grid-cols-4 gap-2">
                  {apps.map(({ name, icon: Icon, bg }) => (
                    <button key={name} className="flex flex-col items-center gap-1">
                      <span className={`grid size-12 place-items-center rounded-2xl text-white ${bg}`}>
                        <Icon size={22} />
                      </span>
                      <span className="text-[10px] text-zinc-600">{name}</span>
                    </button>
                  ))}
                </div>
                <div className="mt-3 divide-y divide-zinc-100 rounded-2xl bg-zinc-50">
                  {rows.map(({ label, icon: Icon }) => (
                    <Drawer.Close key={label} asChild>
                      <button className="flex w-full items-center justify-between px-4 py-2.5 text-sm text-zinc-800">
                        {label} <Icon size={16} className="text-zinc-400" />
                      </button>
                    </Drawer.Close>
                  ))}
                </div>
              </Drawer.Content>
            </Drawer.Portal>
          </Drawer.Root>
        </div>
      </div>
      <p className="mt-3 text-center text-[11px] text-zinc-500">「共有」を押すとボトムシートが開きます</p>
    </div>
  )
}
