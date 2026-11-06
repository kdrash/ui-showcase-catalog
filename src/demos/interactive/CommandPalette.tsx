import { useState, type ReactNode } from 'react'
import { Command } from 'cmdk'
import {
  Calculator,
  Calendar,
  CreditCard,
  FileText,
  Keyboard,
  LogOut,
  Moon,
  Plus,
  Rocket,
  Search,
  Settings,
  User,
  type LucideIcon,
} from 'lucide-react'

function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="grid h-5 min-w-5 place-items-center rounded border border-white/10 bg-white/5 px-1 font-sans text-[10px] text-zinc-400">
      {children}
    </kbd>
  )
}

function Item({
  icon: Icon,
  children,
  shortcut,
  keywords,
  onSelect,
}: {
  icon: LucideIcon
  children: string
  shortcut?: string[]
  keywords?: string[]
  onSelect: (v: string) => void
}) {
  return (
    <Command.Item
      value={children}
      keywords={keywords}
      onSelect={() => onSelect(children)}
      className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-sm text-zinc-400 transition-colors data-[selected=true]:bg-white/10 data-[selected=true]:text-white"
    >
      <Icon size={16} className="shrink-0" />
      <span className="flex-1 truncate">{children}</span>
      {shortcut && (
        <span className="flex gap-1">
          {shortcut.map((k) => (
            <Kbd key={k}>{k}</Kbd>
          ))}
        </span>
      )}
    </Command.Item>
  )
}

/**
 * cmdk を使った ⌘K コマンドパレット(インライン表示版)。
 * 実プロジェクトでは <Command.Dialog open onOpenChange> + ⌘K のキーリスナーでモーダル化する。
 */
export function CommandPalette() {
  const [search, setSearch] = useState('')
  const [last, setLast] = useState<string | null>(null)

  return (
    <div className="relative grid h-full w-full place-items-center overflow-hidden bg-[radial-gradient(circle_at_20%_10%,#4c1d95_0,transparent_45%),radial-gradient(circle_at_90%_90%,#0e7490_0,transparent_45%),#09090b] p-4">
      <Command
        label="Command Menu"
        loop
        onKeyDown={(e) => {
          if (e.key === 'Escape') setSearch('')
        }}
        className="w-full max-w-[520px] overflow-hidden rounded-xl border border-white/10 bg-zinc-900/70 text-zinc-200 shadow-[0_20px_70px_rgba(0,0,0,.6)] backdrop-blur-xl"
      >
        <div className="flex items-center gap-2 border-b border-white/10 px-3">
          <Search size={16} className="text-zinc-500" />
          <Command.Input
            value={search}
            onValueChange={setSearch}
            placeholder="コマンドを検索…  (例: theme, new)"
            className="h-11 w-full bg-transparent text-sm outline-none placeholder:text-zinc-500"
          />
          <Kbd>esc</Kbd>
        </div>

        <Command.List
          className="overflow-y-auto overscroll-contain p-2 transition-[height] duration-200 [&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:pb-1 [&_[cmdk-group-heading]]:pt-2 [&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-zinc-500"
          style={{ height: 'min(var(--cmdk-list-height), 210px)' }}
        >
          <Command.Empty className="py-8 text-center text-sm text-zinc-500">
            「{search}」に一致するコマンドはありません
          </Command.Empty>

          <Command.Group heading="Suggestions">
            <Item icon={Plus} shortcut={['⌘', 'N']} keywords={['create', 'new']} onSelect={setLast}>
              新規プロジェクト
            </Item>
            <Item icon={Rocket} shortcut={['⌘', 'D']} keywords={['deploy', 'ship']} onSelect={setLast}>
              本番へデプロイ
            </Item>
            <Item icon={Calendar} keywords={['schedule']} onSelect={setLast}>
              カレンダーを開く
            </Item>
            <Item icon={Calculator} keywords={['math']} onSelect={setLast}>
              電卓
            </Item>
          </Command.Group>

          <Command.Separator className="my-1 h-px bg-white/10" />

          <Command.Group heading="Settings">
            <Item icon={User} shortcut={['⌘', 'P']} keywords={['account', 'profile']} onSelect={setLast}>
              プロフィール
            </Item>
            <Item icon={CreditCard} shortcut={['⌘', 'B']} keywords={['billing', 'plan']} onSelect={setLast}>
              請求とプラン
            </Item>
            <Item icon={Moon} keywords={['theme', 'dark']} onSelect={setLast}>
              ダークテーマに切り替え
            </Item>
            <Item icon={Keyboard} keywords={['shortcut', 'keys']} onSelect={setLast}>
              キーボードショートカット
            </Item>
            <Item icon={Settings} shortcut={['⌘', ',']} keywords={['preferences']} onSelect={setLast}>
              環境設定
            </Item>
          </Command.Group>

          <Command.Group heading="Docs">
            <Item icon={FileText} keywords={['docs', 'help']} onSelect={setLast}>
              ドキュメントを検索
            </Item>
            <Item icon={LogOut} keywords={['logout', 'signout']} onSelect={setLast}>
              ログアウト
            </Item>
          </Command.Group>
        </Command.List>

        <div className="flex items-center justify-between border-t border-white/10 px-3 py-2 text-[11px] text-zinc-500">
          <span className="truncate">{last ? `✓ 実行: ${last}` : 'cmdk · ヘッドレス コマンドメニュー'}</span>
          <span className="flex shrink-0 items-center gap-1">
            <Kbd>↑</Kbd>
            <Kbd>↓</Kbd> 移動 <Kbd>↵</Kbd> 実行
          </span>
        </div>
      </Command>
    </div>
  )
}
