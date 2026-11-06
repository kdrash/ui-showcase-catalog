import { useState } from 'react'
import { ContextMenu } from 'radix-ui'
import { Check, ChevronRight, Copy, FileImage, FileText, FolderOpen, Folder, Link, Mail, Pencil, Share2, Star, X, Circle } from 'lucide-react'

type F = { name: string; kind: 'folder' | 'image' | 'doc'; size: number; date: string }
const FILES: F[] = [
  { name: 'デザイン', kind: 'folder', size: 0, date: '11/02' },
  { name: '請求書', kind: 'folder', size: 0, date: '10/28' },
  { name: 'hero.png', kind: 'image', size: 2400, date: '11/05' },
  { name: '企画書.pdf', kind: 'doc', size: 860, date: '11/01' },
  { name: 'logo.svg', kind: 'image', size: 12, date: '09/14' },
  { name: '議事録.md', kind: 'doc', size: 4, date: '11/06' },
  { name: '.env.local', kind: 'doc', size: 1, date: '08/30' },
  { name: 'banner.jpg', kind: 'image', size: 1800, date: '10/10' },
]
const ICON = { folder: Folder, image: FileImage, doc: FileText }
const TINT = { folder: 'text-amber-300', image: 'text-pink-300', doc: 'text-sky-300' }

const item =
  'relative flex h-7 cursor-default items-center gap-2 rounded-md px-2 pl-7 text-[13px] text-zinc-200 outline-none select-none data-[disabled]:opacity-40 data-[highlighted]:bg-indigo-500 data-[highlighted]:text-white'
const content =
  'min-w-[210px] rounded-lg border border-white/10 bg-zinc-900/95 p-1 shadow-2xl shadow-black/60 backdrop-blur origin-[var(--radix-context-menu-content-transform-origin)] data-[state=open]:animate-[cm-in_.12s_ease-out]'
const kbd = 'ml-auto pl-4 font-mono text-[10px] text-zinc-500 group-data-[highlighted]:text-indigo-100'

export function ContextMenuDemo() {
  const [container, setContainer] = useState<HTMLDivElement | null>(null)
  const [target, setTarget] = useState<string | null>(null)
  const [hidden, setHidden] = useState(false)
  const [fav, setFav] = useState<string[]>(['hero.png'])
  const [sort, setSort] = useState('name')
  const [log, setLog] = useState('ファイルを右クリックしてください')

  const files = FILES.filter((f) => hidden || !f.name.startsWith('.')).sort((a, b) =>
    sort === 'name' ? a.name.localeCompare(b.name, 'ja') : sort === 'date' ? b.date.localeCompare(a.date) : b.size - a.size,
  )
  const act = (s: string) => setLog(`${target ?? 'フォルダ'}: ${s}`)

  return (
    <div ref={setContainer} className="relative flex h-full w-full flex-col overflow-hidden bg-zinc-950 font-sans text-zinc-100">
      <style>{'@keyframes cm-in{from{opacity:0;transform:scale(.96)}to{opacity:1;transform:none}}'}</style>
      <div className="flex items-center gap-2 border-b border-white/10 px-4 py-2 text-xs text-zinc-400">
        <FolderOpen size={14} /> ~/Projects/website <span className="ml-auto truncate text-zinc-300">{log}</span>
      </div>
      <ContextMenu.Root onOpenChange={(o) => !o && setTarget(null)}>
        <ContextMenu.Trigger asChild>
          <div className="grid flex-1 grid-cols-4 content-start gap-2 p-4">
            {files.map((f) => {
              const I = ICON[f.kind]
              return (
                <div
                  key={f.name}
                  onContextMenu={() => setTarget(f.name)}
                  className={`relative flex flex-col items-center gap-1.5 rounded-lg p-2 text-center transition ${target === f.name ? 'bg-indigo-500/20 ring-1 ring-indigo-400/60' : 'hover:bg-white/5'}`}
                >
                  <I size={30} strokeWidth={1.5} className={TINT[f.kind]} />
                  <span className="w-full truncate text-[11px]">{f.name}</span>
                  {fav.includes(f.name) && <Star size={10} className="absolute top-1.5 right-2 fill-amber-300 text-amber-300" />}
                </div>
              )
            })}
          </div>
        </ContextMenu.Trigger>
        {container && (
          <ContextMenu.Portal container={container}>
            <ContextMenu.Content className={content} collisionPadding={8}>
              <ContextMenu.Label className="px-2 py-1 text-[11px] text-zinc-500">{target ?? 'このフォルダ'}</ContextMenu.Label>
              <ContextMenu.Item className={`group ${item}`} onSelect={() => act('開く')}>
                <FolderOpen size={14} className="absolute left-2" /> 開く <span className={kbd}>⌘O</span>
              </ContextMenu.Item>
              <ContextMenu.Item className={`group ${item}`} onSelect={() => act('名前を変更')} disabled={!target}>
                <Pencil size={14} className="absolute left-2" /> 名前を変更 <span className={kbd}>F2</span>
              </ContextMenu.Item>
              <ContextMenu.Item className={`group ${item}`} onSelect={() => act('複製')}>
                <Copy size={14} className="absolute left-2" /> 複製 <span className={kbd}>⌘D</span>
              </ContextMenu.Item>
              <ContextMenu.Sub>
                <ContextMenu.SubTrigger className={`group ${item} data-[state=open]:bg-white/10`}>
                  <Share2 size={14} className="absolute left-2" /> 共有
                  <ChevronRight size={14} className="ml-auto" />
                </ContextMenu.SubTrigger>
                <ContextMenu.Portal container={container}>
                  <ContextMenu.SubContent className={content} sideOffset={4} alignOffset={-4} collisionPadding={8}>
                    <ContextMenu.Item className={item} onSelect={() => act('リンクをコピー')}>
                      <Link size={14} className="absolute left-2" /> リンクをコピー
                    </ContextMenu.Item>
                    <ContextMenu.Item className={item} onSelect={() => act('メールで送信')}>
                      <Mail size={14} className="absolute left-2" /> メールで送信
                    </ContextMenu.Item>
                  </ContextMenu.SubContent>
                </ContextMenu.Portal>
              </ContextMenu.Sub>
              <ContextMenu.Separator className="my-1 h-px bg-white/10" />
              <ContextMenu.CheckboxItem
                className={item}
                disabled={!target}
                checked={!!target && fav.includes(target)}
                onCheckedChange={(c) => target && setFav((f) => (c ? [...f, target] : f.filter((x) => x !== target)))}
              >
                <ContextMenu.ItemIndicator className="absolute left-2">
                  <Check size={14} />
                </ContextMenu.ItemIndicator>
                お気に入り
              </ContextMenu.CheckboxItem>
              <ContextMenu.CheckboxItem className={`group ${item}`} checked={hidden} onCheckedChange={setHidden}>
                <ContextMenu.ItemIndicator className="absolute left-2">
                  <Check size={14} />
                </ContextMenu.ItemIndicator>
                隠しファイルを表示 <span className={kbd}>⇧⌘.</span>
              </ContextMenu.CheckboxItem>
              <ContextMenu.Separator className="my-1 h-px bg-white/10" />
              <ContextMenu.Label className="px-2 py-1 text-[11px] text-zinc-500">並び順</ContextMenu.Label>
              <ContextMenu.RadioGroup value={sort} onValueChange={setSort}>
                {[
                  ['name', '名前'],
                  ['date', '更新日'],
                  ['size', 'サイズ'],
                ].map(([v, l]) => (
                  <ContextMenu.RadioItem key={v} value={v} className={item}>
                    <ContextMenu.ItemIndicator className="absolute left-2.5">
                      <Circle size={7} className="fill-current" />
                    </ContextMenu.ItemIndicator>
                    {l}
                  </ContextMenu.RadioItem>
                ))}
              </ContextMenu.RadioGroup>
              <ContextMenu.Separator className="my-1 h-px bg-white/10" />
              <ContextMenu.Item
                className={`group ${item} text-rose-300 data-[highlighted]:bg-rose-500`}
                disabled={!target}
                onSelect={() => act('ゴミ箱に移動')}
              >
                <X size={14} className="absolute left-2" /> ゴミ箱に移動 <span className={kbd}>⌘⌫</span>
              </ContextMenu.Item>
            </ContextMenu.Content>
          </ContextMenu.Portal>
        )}
      </ContextMenu.Root>
    </div>
  )
}
