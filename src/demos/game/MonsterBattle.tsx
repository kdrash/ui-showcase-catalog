import { Canvas } from '@react-three/fiber'
import { animate, AnimatePresence, motion, useAnimate, useMotionValue, useReducedMotion, useTransform, type MotionValue } from 'motion/react'
import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from 'react'
import { BattleStage, makeWorld, resetWorld, SHOTS, type Fx3D, type ShotName } from './battle3d'
import { CaptureCapsule, MOVES, monsterByName, STAT_LABELS, TYPE_COLORS, TypeBadge, typeMultiplier, type MonsterData, type MonType, type Move, type Stats } from './monsters'

/**
 * 3D モンスターRPGのバトル画面(React Three Fiber + DOM の HUD)。
 * - 戦場は R3F のシーン:グラデーションの空・遠景の丘と木・2つの丸い草の足場・プリミティブとトゥーン材質で組んだオリジナルモンスター
 * - 進行は async/await の「台本」関数で書き、say()(1文字ずつ表示+▼待ち)・wait()・アニメーション完了を順に待つ
 *   リスタート時は runId を進めるだけで、古い台本の Promise は解決されずに破棄される
 * - カメラ姿勢・突進量・白フラッシュ・ディゾルブ・カプセルの位置は素の JS オブジェクトに持ち、motion の animate() で直接補間
 *   (useFrame がそれを three のオブジェクトとシェーダーの uniform に反映するので、React の再レンダーは発生しない)
 * - 登場時のカメラスイープ、攻撃ごとのカメラカット、タイプ色の弾と粒子・リング・点光源、ひんし時のブロック状ディゾルブ
 * - HP・EXP は MotionValue で「じわっと」減らし、バーの幅・色・数値は useTransform で導出
 * - ↑↓←→ でカーソル、Enter/Space/Z で決定、Esc/X でもどる(キー操作はデモのルート要素だけで受ける)
 * - 動きを減らす設定ではカメラ移動・突進・画面の揺れを省き、文字送りも即時表示
 */

const PLAYER = monsterByName('ヒダマル')
const PLAYER_MOVES: Move[] = PLAYER.moves.map((k) => MOVES[k])
const ENEMIES = ['ポムリーフ', 'ピリモグ', 'シズクラゲ', 'マユモス', 'コオリス', 'ツノドラコ'].map(monsterByName)
const EXP_PER_LEVEL = 100
const COMMANDS = [
  { label: 'たたかう', color: '#e5533d' },
  { label: 'バッグ', color: '#e8a51e' },
  { label: 'モンスター', color: '#3da55b' },
  { label: 'にげる', color: '#3b7fd9' },
] as const
const ITEMS = [
  { key: 'jelly', name: 'ハーブゼリー', desc: 'HPを 20 かいふくする やわらかい ゼリー。' },
  { key: 'capsule', name: 'キャプセル', desc: 'やせいの モンスターを つかまえる カプセル。よわらせるほど はいりやすい。' },
] as const

const rand = (a: number, b: number) => a + Math.floor(Math.random() * (b - a + 1))
const maxHpAt = (lv: number) => Math.floor((PLAYER.stats.hp * lv * 2) / 50) + lv + 10
const statsAt = (lv: number): Stats => ({
  hp: maxHpAt(lv),
  atk: Math.floor((PLAYER.stats.atk * lv * 2) / 50) + 5,
  def: Math.floor((PLAYER.stats.def * lv * 2) / 50) + 5,
  spa: Math.floor((PLAYER.stats.spa * lv * 2) / 50) + 5,
  spd: Math.floor((PLAYER.stats.spd * lv * 2) / 50) + 5,
  spe: Math.floor((PLAYER.stats.spe * lv * 2) / 50) + 5,
})
const stepEase = (t: number) => (t < 0.5 ? 0 : 1)

type Mode = 'text' | 'menu' | 'moves' | 'bag' | 'end'
type ItemKey = (typeof ITEMS)[number]['key']
type Side = 'enemy' | 'player'
interface Battle {
  round: number
  enemy: MonsterData
  enemyLv: number
  enemyMax: number
  enemyHp: number
  enemyAtkStage: number
  level: number
  exp: number
  playerMax: number
  playerHp: number
  pp: number[]
  items: Record<ItemKey, number>
}

function makeBattle(round: number, level: number, exp: number): Battle {
  const enemy = ENEMIES[round % ENEMIES.length]
  const enemyLv = rand(9, 11)
  const enemyMax = Math.round((enemy.stats.hp * enemyLv) / 20) + 10
  return {
    round, enemy, enemyLv, enemyMax, enemyHp: enemyMax, enemyAtkStage: 0,
    level, exp, playerMax: maxHpAt(level), playerHp: maxHpAt(level),
    pp: PLAYER_MOVES.map((m) => m.pp), items: { jelly: 2, capsule: 5 },
  }
}

function calcHit(move: Move, lv: number, attacker: MonsterData, defender: MonsterData, stage: number) {
  const mult = typeMultiplier(move.type, defender.types)
  const stab = attacker.types.includes(move.type) ? 1.5 : 1
  const crit = Math.random() < 0.1
  const stageF = stage >= 0 ? 1 : 1 / (1 + 0.35 * -stage)
  const atk = (attacker.stats.atk + attacker.stats.spa) / 2
  const raw = move.power * 0.16 * (lv / 10) * (atk / 55) * stageF + rand(0, 2)
  const dmg = mult === 0 ? 0 : Math.max(1, Math.round(raw * stab * mult * (crit ? 1.5 : 1)))
  return { dmg, mult, crit: crit && mult > 0 }
}

/** motion は素のオブジェクトの値を内部にキャッシュするため、直接書き換えた値から始まるよう常に [現在値, 目標] で渡す */
function fromCurrent(obj: object, values: Record<string, number | number[] | undefined>) {
  const out: Record<string, number[]> = {}
  for (const [k, v] of Object.entries(values)) {
    if (v === undefined) continue
    out[k] = Array.isArray(v) ? v : [(obj as Record<string, number>)[k], v]
  }
  return out
}

const KEYFRAMES = `
@keyframes mb-caret { 0%,100% { transform: translateY(0) } 50% { transform: translateY(3px) } }
@keyframes mb-blink { 50% { opacity: 0 } }
`

export function MonsterBattle() {
  const reduced = !!useReducedMotion()
  const [scope, animateEl] = useAnimate<HTMLDivElement>()
  const world = useRef(makeWorld()).current

  const B = useRef<Battle>(makeBattle(0, 12, 55))
  const [view, setView] = useState<Battle>(B.current)
  const commit = (patch: Partial<Battle>) => {
    B.current = { ...B.current, ...patch }
    setView(B.current)
  }

  const enemyHp = useMotionValue(B.current.enemyHp)
  const enemyMax = useMotionValue(B.current.enemyMax)
  const playerHp = useMotionValue(B.current.playerHp)
  const playerMax = useMotionValue(B.current.playerMax)
  const exp = useMotionValue(B.current.exp)

  const [mode, setMode] = useState<Mode>('text')
  const [cursor, setCursor] = useState(0)
  const [moveCursor, setMoveCursor] = useState(0)
  const [bagCursor, setBagCursor] = useState(0)
  const [fx, setFx] = useState<Fx3D[]>([])
  const [levelUp, setLevelUp] = useState<{ from: Stats; to: Stats; lv: number } | null>(null)
  const [outcome, setOutcome] = useState<'win' | 'lose' | 'run' | 'caught' | null>(null)

  // ---- メッセージ窓(タイプライター) ----
  const [msg, setMsg] = useState({ text: '', key: 0 })
  const [typed, setTyped] = useState({ key: 0, n: 0 })
  const [waiting, setWaiting] = useState(false)
  const msgKey = useRef(0)
  const pending = useRef<{ key: number; wait: boolean; done: boolean; resolve: () => void } | null>(null)

  const runId = useRef(0)
  const timers = useRef(new Set<number>())
  const anims = useRef(new Set<{ stop: () => void }>())
  const fxId = useRef(0)

  useEffect(() => {
    if (reduced) {
      setTyped({ key: msg.key, n: msg.text.length })
      return
    }
    setTyped({ key: msg.key, n: 0 })
    let n = 0
    const id = window.setInterval(() => {
      n += 1
      setTyped((t) => (t.key === msg.key ? { key: msg.key, n: Math.max(t.n, n) } : t))
      if (n >= msg.text.length) window.clearInterval(id)
    }, 34)
    return () => window.clearInterval(id)
  }, [msg, reduced])

  useEffect(() => {
    const p = pending.current
    if (!p || p.key !== msg.key || typed.key !== msg.key || p.done || typed.n < msg.text.length) return
    p.done = true
    if (p.wait) {
      setWaiting(true)
    } else {
      const t = window.setTimeout(() => {
        timers.current.delete(t)
        if (pending.current === p) {
          pending.current = null
          p.resolve()
        }
      }, reduced ? 280 : 560)
      timers.current.add(t)
    }
  }, [typed, msg, reduced])

  const say = (text: string, waitInput = true) =>
    new Promise<void>((resolve) => {
      const key = ++msgKey.current
      pending.current = { key, wait: waitInput, done: false, resolve }
      setWaiting(false)
      setMsg({ text, key })
    })
  const show = (text: string) => {
    pending.current = null
    setWaiting(false)
    setMsg({ text, key: ++msgKey.current })
  }
  const advance = () => {
    const p = pending.current
    if (!p || p.key !== msg.key) return
    if (!p.done) {
      setTyped({ key: msg.key, n: msg.text.length })
    } else if (p.wait) {
      pending.current = null
      setWaiting(false)
      p.resolve()
    }
  }

  // ---- 台本用ヘルパー(runId が変わったら解決しない) ----
  const wait = (ms: number) =>
    new Promise<void>((resolve) => {
      const id = runId.current
      const t = window.setTimeout(() => {
        timers.current.delete(t)
        if (id === runId.current) resolve()
      }, reduced ? Math.min(ms, 220) : ms)
      timers.current.add(t)
    })
  const play = (c: { stop: () => void; then: (r: () => void) => unknown }) =>
    new Promise<void>((resolve) => {
      const id = runId.current
      anims.current.add(c)
      c.then(() => {
        anims.current.delete(c)
        if (id === runId.current) resolve()
      })
    })
  const el = (name: string) => `[data-el="${name}"]`
  const set = (name: string, values: Record<string, string | number>) => {
    const node = scope.current?.querySelector(el(name))
    if (node) animateEl(node, values, { duration: 0 })
  }
  /** 3D ワールドの値を補間 */
  const tw = <T extends object>(obj: T, values: { [K in keyof T]?: number | number[] }, opts: Parameters<typeof animate>[2] = {}) =>
    play(animate(obj, fromCurrent(obj, values) as never, opts) as unknown as { stop: () => void; then: (r: () => void) => unknown })
  const cut = (shot: ShotName, duration = 0) => {
    if (reduced) return Promise.resolve()
    return tw(world.cam, { ...SHOTS[shot] }, { duration, ease: [0.3, 0, 0.2, 1] })
  }
  const shake = (amount = 1) => (reduced ? Promise.resolve() : tw(world.cam, { shake: [amount, 0] }, { duration: 0.45 }))
  const shakePanel = (name: string, amp = 6) =>
    reduced ? Promise.resolve() : play(animateEl(el(name), { x: [0, -amp, amp, -amp / 2, amp / 2, 0] }, { duration: 0.35 }))
  const tween = (mv: MotionValue<number>, to: number, msPerUnit = 45) => {
    const dur = reduced ? 0.25 : Math.min(1.8, Math.max(0.35, (Math.abs(to - mv.get()) * msPerUnit) / 1000))
    return play(animate(mv, to, { duration: dur, ease: 'linear' }))
  }
  const addFx = (kind: Fx3D['kind'], to: Side, opts: { type?: MonType; color?: string } = {}) => {
    const id = ++fxId.current
    setFx((f) => [...f, { id, kind, to, ...opts }])
    const t = window.setTimeout(() => {
      timers.current.delete(t)
      setFx((f) => f.filter((x) => x.id !== id))
    }, 1400)
    timers.current.add(t)
  }

  const run = (script: () => Promise<void>) => {
    void script()
  }

  // ---- 台本 ----
  async function intro() {
    const b = B.current
    setMode('text')
    show('')
    resetWorld(world)
    world.player.scale = 0
    world.enemy.scale = 0
    if (!reduced) Object.assign(world.cam, SHOTS.intro)
    const off = reduced ? 0 : 1
    set('enemy-panel', { x: `${-130 * off}%`, opacity: reduced ? 0 : 1 })
    set('player-panel', { x: `${130 * off}%`, opacity: reduced ? 0 : 1 })
    await wait(350)
    addFx('appear', 'enemy', { color: b.enemy.color })
    await tw(world.enemy, { scale: reduced ? 1 : [0, 1.18, 1], hop: reduced ? 0 : [1.2, 0, 0] }, { duration: reduced ? 0.2 : 0.55, ease: 'easeOut' })
    if (!reduced) {
      await tw(world.enemy, { hop: [0, 0.35, 0, 0.2, 0] }, { duration: 0.6 })
      void shake(0.6)
    }
    void cut('default', 1.7)
    void play(animateEl(el('enemy-panel'), { x: '0%', opacity: 1 }, { duration: reduced ? 0.2 : 0.35, ease: 'easeOut', delay: reduced ? 0 : 1 }))
    await say(`くさむらから やせいの ${b.enemy.name}が あらわれた！`)
    void say(`いけっ！ ${PLAYER.name}！`, false)
    await wait(300)
    addFx('appear', 'player', { color: '#ffd34a' })
    world.player.flash = reduced ? 0 : 1
    await Promise.all([
      tw(world.player, { scale: reduced ? 1 : [0, 1.15, 1] }, { duration: reduced ? 0.2 : 0.5, ease: 'easeOut' }),
      tw(world.player, { flash: 0 }, { duration: 0.6 }),
    ])
    await play(animateEl(el('player-panel'), { x: '0%', opacity: 1 }, { duration: reduced ? 0.2 : 0.35, ease: 'easeOut' }))
    await wait(250)
    openMenu()
  }

  function openMenu() {
    setMode('menu')
    show(`${PLAYER.name}は どうする？`)
  }

  async function strike(self: Side, move: Move) {
    const other: Side = self === 'player' ? 'enemy' : 'player'
    if (!reduced) {
      await cut(self === 'player' ? 'playerShoulder' : 'enemyFront', 0)
      await tw(world[self], { lunge: [0, -0.25, 1.5, 0], hop: [0, 0.1, 0.4, 0] }, { duration: 0.52, ease: 'easeInOut' })
    }
    if (move.power === 0) {
      addFx('debuff', move.effect ? other : self, { color: '#5d8de8' })
      await wait(800)
      await cut('default', 0.5)
      return
    }
    addFx('shot', other, { type: move.type })
    await wait(320)
    void cut(other === 'enemy' ? 'enemyClose' : 'playerClose', 0)
    addFx('hit', other, { type: move.type })
    void shake(0.8)
    void tw(world[other], { lunge: [0, -0.5, 0] }, { duration: 0.55, ease: 'easeOut' })
    await tw(world[other], { flash: [0, 1, 0, 1, 0, 1, 0] }, { duration: reduced ? 0.3 : 0.62, ease: stepEase })
    await cut('default', 0.45)
  }

  async function playerMove(i: number) {
    const move = PLAYER_MOVES[i]
    const b = B.current
    if (b.pp[i] <= 0) {
      setMode('text')
      await say('その わざは もう つかえない！')
      setMode('moves')
      show('わざを えらんでください')
      return
    }
    commit({ pp: b.pp.map((p, j) => (j === i ? p - 1 : p)) })
    setMode('text')
    await say(`${PLAYER.name}の ${move.name}！`, false)
    await strike('player', move)
    if (move.effect === 'lowerAtk') {
      const stage = B.current.enemyAtkStage
      if (stage <= -3) {
        await say(`やせいの ${b.enemy.name}の こうげきは もう さがらない！`)
      } else {
        commit({ enemyAtkStage: stage - 1 })
        await say(`やせいの ${b.enemy.name}の こうげきが さがった！`)
      }
    } else if (move.power > 0) {
      const r = calcHit(move, B.current.level, PLAYER, b.enemy, 0)
      const hp = Math.max(0, B.current.enemyHp - r.dmg)
      commit({ enemyHp: hp })
      if (r.mult > 1) void shake(1.4)
      await tween(enemyHp, hp)
      if (r.crit) await say('クリティカル ヒット！')
      if (r.mult === 0) await say(`やせいの ${b.enemy.name}には きかないようだ…`)
      else if (r.mult > 1) await say('ばつぐんに きいている！')
      else if (r.mult < 1) await say('あまり きいていない…')
      if (hp <= 0) return enemyFainted()
    }
    if (await enemyTurn()) openMenu()
  }

  /** 相手の行動。自分が倒れたら false */
  async function enemyTurn() {
    const b = B.current
    const move = MOVES[b.enemy.moves[rand(0, b.enemy.moves.length - 1)]]
    await wait(200)
    await say(`やせいの ${b.enemy.name}の ${move.name}！`, false)
    await strike('enemy', move)
    if (move.power === 0) {
      await say('しかし なにも おこらなかった！')
      return true
    }
    const r = calcHit(move, b.enemyLv, b.enemy, PLAYER, b.enemyAtkStage)
    const hp = Math.max(0, B.current.playerHp - r.dmg)
    commit({ playerHp: hp })
    void shakePanel('player-panel', 5)
    if (r.mult > 1) void shake(1.4)
    await tween(playerHp, hp)
    if (r.crit) await say('クリティカル ヒット！')
    if (r.mult > 1) await say('ばつぐんに きいている！')
    else if (r.mult < 1 && r.mult > 0) await say('あまり きいていない…')
    if (hp > 0) return true
    await cut('playerClose', 0.5)
    await tw(world.player, { dissolve: [0, 1], hop: [0, -0.15] }, { duration: reduced ? 0.3 : 1.1, ease: 'easeIn' })
    void play(animateEl(el('player-panel'), { x: reduced ? '0%' : '130%', opacity: 0 }, { duration: 0.3 }))
    await cut('default', 0.6)
    await say(`${PLAYER.name}は たおれた！`)
    await say(`${PLAYER.name}を かかえて いそいで ひきかえした…`)
    finish('lose', 'まけて しまった… つぎは きっと かてる！')
    return false
  }

  async function enemyFainted() {
    const b = B.current
    await wait(150)
    await cut('enemyFront', 0.5)
    await tw(world.enemy, { dissolve: [0, 1], hop: [0, -0.15] }, { duration: reduced ? 0.3 : 1.1, ease: 'easeIn' })
    void play(animateEl(el('enemy-panel'), { x: reduced ? '0%' : '-130%', opacity: 0 }, { duration: 0.3 }))
    await cut('default', 0.7)
    await say(`やせいの ${b.enemy.name}は たおれた！`)
    await gainExp(b.enemyLv * 8 + rand(0, 6))
    finish('win', 'しょうぶに かった！ つぎの あいてを さがしに いこう。')
  }

  async function gainExp(amount: number) {
    void say(`${PLAYER.name}は ${amount} けいけんちを えた！`, false)
    await wait(reduced ? 100 : 500)
    let remaining = amount
    let leveled = false
    while (remaining > 0) {
      const b = B.current
      const add = Math.min(EXP_PER_LEVEL - b.exp, remaining)
      remaining -= add
      await tween(exp, b.exp + add, 16)
      if (b.exp + add < EXP_PER_LEVEL) {
        commit({ exp: b.exp + add })
        continue
      }
      leveled = true
      const lv = b.level + 1
      const max = maxHpAt(lv)
      const hp = b.playerHp + (max - b.playerMax)
      commit({ level: lv, exp: 0, playerMax: max, playerHp: hp })
      exp.set(0)
      playerMax.set(max)
      playerHp.set(hp)
      setLevelUp({ from: statsAt(lv - 1), to: statsAt(lv), lv })
      addFx('stars', 'player', { color: '#ffd34a' })
      void cut('playerClose', 0.6)
      if (!reduced) {
        void tw(world.player, { hop: [0, 0.5, 0], spin: [0, Math.PI * 2] }, { duration: 0.7, ease: 'easeInOut' })
        void play(animateEl(el('player-panel'), { scale: [1, 1.06, 1] }, { duration: 0.4 }))
      }
      await say(`${PLAYER.name}は レベル ${lv}に あがった！`)
      world.player.spin = 0
      setLevelUp(null)
      await cut('default', 0.5)
    }
    if (!leveled) await wait(650)
  }

  async function applyItem(key: ItemKey) {
    const b = B.current
    if (b.items[key] <= 0) {
      setMode('text')
      await say('その どうぐは もう もっていない！')
      openMenu()
      return
    }
    if (key === 'jelly') {
      if (b.playerHp >= b.playerMax) {
        setMode('text')
        await say(`${PLAYER.name}の HPは まんたんだ！`)
        openMenu()
        return
      }
      commit({ items: { ...b.items, jelly: b.items.jelly - 1 } })
      setMode('text')
      await say(`${PLAYER.name}に ハーブゼリーを あげた！`, false)
      const hp = Math.min(b.playerMax, b.playerHp + 20)
      addFx('heal', 'player', { color: '#57d68d' })
      commit({ playerHp: hp })
      await tween(playerHp, hp, 35)
      await say(`${PLAYER.name}の HPが ${hp - b.playerHp} かいふくした！`)
      if (await enemyTurn()) openMenu()
      return
    }
    commit({ items: { ...b.items, capsule: b.items.capsule - 1 } })
    setMode('text')
    void say('キャプセルを なげた！', false)
    await capture()
  }

  async function capture() {
    const b = B.current
    const cap = world.cap
    Object.assign(cap, { show: 1, p: 0, h: 1.3, wobble: 0, dim: 0 })
    void cut('capture', reduced ? 0 : 0.8)
    await tw(cap, { p: 1 }, { duration: reduced ? 0.01 : 0.8, ease: 'linear' })
    addFx('hit', 'enemy', { color: '#ffffff' })
    await tw(world.enemy, { flash: 1 }, { duration: 0.12 })
    await tw(world.enemy, { scale: 0 }, { duration: reduced ? 0.1 : 0.35, ease: 'easeIn' })
    world.enemy.flash = 0
    await tw(cap, { h: reduced ? 0.3 : [1.3, 0.3, 0.6, 0.3] }, { duration: reduced ? 0.1 : 0.65, ease: 'easeIn' })
    const ratio = B.current.enemyHp / b.enemyMax
    const chance = Math.min(0.95, Math.max(0.2, 1 - ratio * 0.82))
    const success = Math.random() < chance
    const wobbles = success ? 3 : rand(0, 2)
    for (let i = 0; i < wobbles; i++) {
      await wait(450)
      if (reduced) await say(`${'・'.repeat(i + 1)}`, false)
      else await tw(cap, { wobble: [0, -0.55, 0.42, -0.18, 0] }, { duration: 0.6, ease: 'easeInOut' })
    }
    await wait(450)
    if (success) {
      addFx('stars', 'enemy', { color: '#ffd34a' })
      void tw(cap, { dim: 1 }, { duration: 0.4 })
      await say(`やった！ ${b.enemy.name}を つかまえた！`)
      await say(`${b.enemy.name}の データが ずかんに とうろくされた！`)
      await cut('default', 0.6)
      finish('caught', `${b.enemy.name}が なかまに くわわった！`)
      return
    }
    addFx('hit', 'enemy', { color: '#ffffff' })
    cap.show = 0
    world.enemy.flash = 1
    await Promise.all([
      tw(world.enemy, { scale: reduced ? 1 : [0, 1.15, 1] }, { duration: reduced ? 0.15 : 0.45 }),
      tw(world.enemy, { flash: 0 }, { duration: 0.5 }),
    ])
    await say(wobbles === 0 ? 'だめだ！ すぐに とびだして しまった！' : 'ざんねん！ あと すこし だったのに！')
    await cut('default', 0.5)
    if (await enemyTurn()) openMenu()
  }

  async function switchMon() {
    setMode('text')
    await say(`いま たたかえる なかまは ${PLAYER.name}だけだ！`)
    openMenu()
  }

  async function escape() {
    setMode('text')
    await say('うまく にげきれた！')
    if (!reduced) await tw(world.cam, { ...SHOTS.wide }, { duration: 0.9, ease: 'easeIn' })
    finish('run', 'くさむらを ぬけて ひと やすみ。')
  }

  function finish(result: 'win' | 'lose' | 'run' | 'caught', text: string) {
    setOutcome(result)
    setMode('end')
    show(text)
  }

  const cancelAll = () => {
    runId.current += 1
    timers.current.forEach((t) => window.clearTimeout(t))
    timers.current.clear()
    anims.current.forEach((a) => a.stop())
    anims.current.clear()
    pending.current = null
  }

  function restart() {
    cancelAll()
    const prev = B.current
    const next = makeBattle(prev.round + 1, prev.level, prev.exp)
    B.current = next
    setView(next)
    enemyHp.set(next.enemyHp)
    enemyMax.set(next.enemyMax)
    playerHp.set(next.playerHp)
    playerMax.set(next.playerMax)
    exp.set(next.exp)
    setFx([])
    setLevelUp(null)
    setOutcome(null)
    setCursor(0)
    setMoveCursor(0)
    setBagCursor(0)
    run(intro)
  }

  useEffect(() => {
    run(intro)
    return cancelAll
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ---- 入力 ----
  const choose = (i: number) => {
    setCursor(i)
    if (i === 0) {
      setMode('moves')
      show('わざを えらんでください')
    } else if (i === 1) {
      setMode('bag')
      show('どうぐを えらんでください')
    } else if (i === 2) run(switchMon)
    else run(escape)
  }
  const back = () => {
    if (mode === 'moves' || mode === 'bag') openMenu()
  }

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const k = e.key
    const arrow = k.startsWith('Arrow')
    const ok = k === 'Enter' || k === ' ' || k === 'z' || k === 'Z'
    const cancel = k === 'Escape' || k === 'x' || k === 'X' || k === 'Backspace'
    if (!arrow && !ok && !cancel) return
    // フォーカス中のボタンでの決定はネイティブのクリックに任せる
    if (ok && e.target !== e.currentTarget) return
    e.preventDefault()
    if (arrow && e.target !== e.currentTarget) scope.current?.focus()
    const grid = (c: number) => (k === 'ArrowLeft' || k === 'ArrowRight' ? c ^ 1 : c ^ 2)
    if (mode === 'text') {
      if (ok || cancel) advance()
    } else if (mode === 'menu') {
      if (arrow) setCursor(grid)
      else if (ok) choose(cursor)
    } else if (mode === 'moves') {
      if (arrow) setMoveCursor(grid)
      else if (ok) run(() => playerMove(moveCursor))
      else back()
    } else if (mode === 'bag') {
      if (k === 'ArrowUp' || k === 'ArrowDown') setBagCursor((c) => (c + 1) % ITEMS.length)
      else if (ok) run(() => applyItem(ITEMS[bagCursor].key))
      else if (cancel) back()
    } else if (mode === 'end' && ok) restart()
  }
  const keepFocus = (e: { preventDefault: () => void }) => e.preventDefault()

  const shown = typed.key === msg.key ? msg.text.slice(0, typed.n) : ''
  const enemy = view.enemy
  const sel = PLAYER_MOVES[moveCursor]

  return (
    <div
      ref={scope}
      tabIndex={0}
      onKeyDown={onKeyDown}
      aria-label="モンスターバトル。矢印キーで選択、Enterで決定、Escでもどる"
      className="@container relative h-full w-full overflow-hidden bg-[radial-gradient(120%_90%_at_50%_0%,#2b3247,#151821)] font-['Noto_Sans_JP',Inter,sans-serif] text-[#2b2f3a] outline-none select-none focus-visible:ring-2 focus-visible:ring-[#7fd0ff] focus-visible:ring-inset"
    >
      <style>{KEYFRAMES}</style>
      <div className="mx-auto flex h-full max-w-[1100px] flex-col justify-center p-2 pb-[var(--solo-footer-clearance,0.5rem)] @min-[40rem]:p-3 @min-[40rem]:pb-[var(--solo-footer-clearance,0.75rem)]">
        <div className="relative flex max-h-[780px] min-h-0 flex-1 flex-col overflow-hidden rounded-[12px] border-[3px] border-[#0b0d12] bg-[#2d3446] shadow-[0_0_0_2px_#3b4358,0_18px_40px_rgba(0,0,0,.45)]">
          {/* ---- フィールド(3D) ---- */}
          <div data-el="field" className="relative min-h-0 flex-1 overflow-hidden bg-[#bfe3f6]">
            <Canvas dpr={[1, 1.75]} camera={{ fov: 36, near: 0.1, far: 200, position: [SHOTS.default.px, SHOTS.default.py, SHOTS.default.pz] }} gl={{ antialias: true }} aria-hidden>
              <BattleStage world={world} enemy={enemy.name} player={PLAYER.name} fx={fx} still={reduced} />
            </Canvas>
            <div aria-hidden className="pointer-events-none absolute inset-0 shadow-[inset_0_0_60px_rgba(20,30,40,.25)]" />

            {/* 相手パネル */}
            <div data-el="enemy-panel" className="absolute top-[5%] left-[3%] z-10 w-[47%] max-w-[300px]" style={{ opacity: 0 }}>
              <Panel>
                <NameRow name={enemy.name} level={view.enemyLv} />
                <HpBar hp={enemyHp} max={enemyMax} />
                <div className="mt-1 flex gap-1">
                  {enemy.types.map((t) => (
                    <TypeBadge key={t} type={t} className="!text-[9px]" />
                  ))}
                  {view.enemyAtkStage < 0 && (
                    <span className="rounded-[4px] bg-[#5d8de8] px-1 text-[9px] font-black text-white">こうげき↓{-view.enemyAtkStage}</span>
                  )}
                </div>
              </Panel>
            </div>

            {/* 自分パネル */}
            <div data-el="player-panel" className="absolute right-[3%] bottom-[6%] z-10 w-[50%] max-w-[320px]" style={{ opacity: 0 }}>
              <Panel tail="left">
                <NameRow name={PLAYER.name} level={view.level} />
                <HpBar hp={playerHp} max={playerMax} />
                <HpNumbers hp={playerHp} max={view.playerMax} />
                <ExpBar exp={exp} />
              </Panel>
            </div>

            <AnimatePresence>
              {levelUp && (
                <motion.div
                  key="lv"
                  initial={reduced ? { opacity: 0 } : { opacity: 0, y: -12, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute top-[5%] right-[3%] z-20 w-[min(46%,210px)] rounded-[10px] border-[3px] border-[#30384a] bg-[#fbfaf0] px-2.5 py-1.5 text-[11px] font-bold shadow-[4px_4px_0_rgba(48,56,74,.25)]"
                >
                  <p className="mb-0.5 text-center font-['Press_Start_2P'] text-[8px] tracking-wider text-[#e5533d]">LEVEL UP! Lv{levelUp.lv}</p>
                  {STAT_LABELS.map(([key, label]) => (
                    <div key={key} className="flex items-center justify-between gap-2 leading-[1.55]">
                      <span>{label === 'HP' ? 'さいだいHP' : label}</span>
                      <span className="font-['VT323'] text-[15px] leading-none">
                        {levelUp.to[key]}
                        <span className="ml-1 inline-block w-6 text-[#3da55b]">+{levelUp.to[key] - levelUp.from[key]}</span>
                      </span>
                    </div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* ---- 下部:メッセージとコマンド ---- */}
          <div className="relative flex h-[112px] shrink-0 gap-1.5 border-t-[3px] border-[#0b0d12] p-1.5 @min-[40rem]:h-[124px]">
            <button
              type="button"
              tabIndex={mode === 'text' ? 0 : -1}
              onMouseDown={keepFocus}
              onClick={advance}
              aria-label={waiting ? 'つぎへ' : 'メッセージ'}
              className={`relative min-w-0 flex-1 cursor-default rounded-[10px] border-[3px] border-[#30384a] bg-[#fcfcf6] px-3.5 py-2 text-left shadow-[inset_0_0_0_3px_#fcfcf6,inset_0_0_0_5px_#8fbdd1] @min-[40rem]:px-5 ${
                mode === 'menu' || mode === 'moves' || mode === 'bag' ? 'hidden @min-[34rem]:block' : ''
              } ${mode === 'text' ? 'cursor-pointer' : ''}`}
            >
              <span aria-hidden className="block text-[14px] leading-[1.9] font-bold tracking-[0.06em] whitespace-pre-wrap @min-[40rem]:text-[16px]">
                {mode === 'bag' ? ITEMS[bagCursor].desc : shown}
              </span>
              <span className="sr-only" aria-live="polite">
                {msg.text}
              </span>
              {waiting && (
                <span aria-hidden className="absolute right-3 bottom-1.5 text-[13px] text-[#e5533d] motion-safe:animate-[mb-caret_.7s_ease-in-out_infinite]">
                  ▼
                </span>
              )}
            </button>

            {mode === 'menu' && (
              <Box className="grid w-full grid-cols-2 gap-1.5 @min-[34rem]:w-[46%]">
                {COMMANDS.map((c, i) => (
                  <button
                    key={c.label}
                    type="button"
                    onMouseDown={keepFocus}
                    onMouseEnter={() => setCursor(i)}
                    onClick={() => choose(i)}
                    className={`relative flex items-center gap-1.5 overflow-hidden rounded-[7px] border-2 pr-1 pl-5 text-left text-[13px] font-black transition-colors @min-[40rem]:text-[15px] ${
                      cursor === i ? 'border-[#30384a] text-white' : 'border-transparent bg-[#efeee4] text-[#2b2f3a]'
                    }`}
                    style={cursor === i ? { background: c.color } : undefined}
                  >
                    <span aria-hidden className="absolute inset-y-0 left-0 w-1.5" style={{ background: c.color }} />
                    {cursor === i && (
                      <span aria-hidden className="absolute left-2 text-[10px] motion-safe:animate-[mb-blink_.9s_steps(1)_infinite]">
                        ▶
                      </span>
                    )}
                    <span className="truncate">{c.label}</span>
                  </button>
                ))}
              </Box>
            )}

            {mode === 'moves' && (
              <>
                <Box className="grid flex-1 grid-cols-2 gap-1.5 @min-[34rem]:flex-[1.6]">
                  {PLAYER_MOVES.map((m, i) => (
                    <button
                      key={m.name}
                      type="button"
                      onMouseDown={keepFocus}
                      onMouseEnter={() => setMoveCursor(i)}
                      onClick={() => run(() => playerMove(i))}
                      aria-label={`${m.name} ${m.type} PP ${view.pp[i]}/${m.pp}`}
                      className={`relative flex min-w-0 items-center justify-between gap-1 overflow-hidden rounded-[7px] border-2 pr-1.5 pl-3 text-left text-[13px] font-black @min-[40rem]:text-[14px] ${
                        moveCursor === i ? 'border-[#30384a] bg-[#fff6d8]' : 'border-transparent bg-[#efeee4]'
                      } ${view.pp[i] === 0 ? 'opacity-50' : ''}`}
                    >
                      <span aria-hidden className="absolute inset-y-0 left-0 w-1.5" style={{ background: TYPE_COLORS[m.type] }} />
                      <span className="truncate">{m.name}</span>
                      <span className="shrink-0 font-['VT323'] text-[14px] text-[#6a6f7c] @min-[34rem]:hidden">
                        {view.pp[i]}/{m.pp}
                      </span>
                      <span className="hidden shrink-0 @min-[34rem]:inline-flex">
                        <TypeBadge type={m.type} className="!px-1 !text-[9px]" />
                      </span>
                    </button>
                  ))}
                </Box>
                <Box className="hidden w-[30%] flex-col justify-center gap-1 px-3 @min-[34rem]:flex">
                  <div className="flex items-baseline justify-between">
                    <span className="font-['Press_Start_2P'] text-[9px]">PP</span>
                    <span className="font-['VT323'] text-[22px] leading-none">
                      {view.pp[moveCursor]}/{sel.pp}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-1 text-[12px] font-bold">
                    <span>タイプ</span>
                    <TypeBadge type={sel.type} />
                  </div>
                  <button type="button" onMouseDown={keepFocus} onClick={back} className="mt-0.5 rounded-md bg-[#30384a] py-0.5 text-[11px] font-bold text-white hover:bg-[#46506a]">
                    もどる (Esc)
                  </button>
                </Box>
              </>
            )}

            {mode === 'bag' && (
              <Box className="flex w-full flex-col justify-center gap-1 @min-[34rem]:w-[46%]">
                {ITEMS.map((it, i) => (
                  <button
                    key={it.key}
                    type="button"
                    onMouseDown={keepFocus}
                    onMouseEnter={() => setBagCursor(i)}
                    onClick={() => run(() => applyItem(it.key))}
                    className={`relative flex items-center justify-between rounded-[7px] border-2 pr-2 pl-5 text-[13px] font-black @min-[40rem]:text-[14px] ${
                      bagCursor === i ? 'border-[#30384a] bg-[#fff6d8]' : 'border-transparent bg-[#efeee4]'
                    }`}
                  >
                    {bagCursor === i && <span aria-hidden className="absolute left-1.5 text-[10px]">▶</span>}
                    <span className="flex items-center gap-1.5">
                      {it.key === 'capsule' ? <CaptureCapsule className="size-4" /> : <span aria-hidden className="size-3.5 rounded-full border-2 border-[#30384a] bg-[#7bd88f]" />}
                      {it.name}
                    </span>
                    <span className="font-['VT323'] text-[17px]">×{view.items[it.key]}</span>
                  </button>
                ))}
                <button type="button" onMouseDown={keepFocus} onClick={back} className="rounded-md bg-[#30384a] py-0.5 text-[11px] font-bold text-white hover:bg-[#46506a]">
                  もどる (Esc)
                </button>
              </Box>
            )}

            {mode === 'end' && (
              <div className="flex w-[38%] min-w-[128px] flex-col justify-center gap-1.5">
                <span className="text-center font-['Press_Start_2P'] text-[9px] leading-relaxed text-[#ffe28a]">
                  {outcome === 'win' ? 'YOU WIN' : outcome === 'caught' ? 'GOTCHA!' : outcome === 'run' ? 'ESCAPED' : 'LOST…'}
                </span>
                <button
                  type="button"
                  onMouseDown={keepFocus}
                  onClick={restart}
                  className="rounded-[9px] border-[3px] border-[#0b0d12] bg-[#e5533d] px-2 py-2 text-[13px] font-black text-white shadow-[inset_0_-3px_0_rgba(0,0,0,.2)] hover:bg-[#f0664f] active:translate-y-px"
                >
                  つぎの バトルへ ▶
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function Box({ className = '', children }: { className?: string; children: ReactNode }) {
  return (
    <div className={`min-w-0 rounded-[10px] border-[3px] border-[#30384a] bg-[#fcfcf6] p-1.5 shadow-[inset_0_0_0_2px_#fcfcf6,inset_0_0_0_4px_#d8d6c8] ${className}`}>
      {children}
    </div>
  )
}

function Panel({ children, tail = 'right' }: { children: ReactNode; tail?: 'left' | 'right' }) {
  return (
    <div
      className={`relative rounded-[12px] border-[3px] border-[#30384a] bg-[#fbfaf0]/95 px-2.5 py-1.5 shadow-[4px_4px_0_rgba(48,56,74,.28)] backdrop-blur-sm @min-[40rem]:px-3.5 @min-[40rem]:py-2 ${
        tail === 'right' ? 'rounded-br-[3px]' : 'rounded-bl-[3px]'
      }`}
    >
      {children}
    </div>
  )
}

function NameRow({ name, level }: { name: string; level: number }) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <span className="truncate text-[13px] font-black tracking-wide @min-[40rem]:text-[15px]">{name}</span>
      <span className="shrink-0 font-['Press_Start_2P'] text-[8px] @min-[40rem]:text-[9px]">
        <span className="text-[7px]">Lv</span>
        {level}
      </span>
    </div>
  )
}

function HpBar({ hp, max }: { hp: MotionValue<number>; max: MotionValue<number> }) {
  const width = useTransform(() => `${Math.max(0, Math.min(1, hp.get() / max.get())) * 100}%`)
  const color = useTransform(() => {
    const r = hp.get() / max.get()
    return r > 0.5 ? '#4cd07a' : r > 0.2 ? '#f2c230' : '#ef4a3c'
  })
  return (
    <div className="mt-1 flex items-center gap-1.5">
      <span className="rounded-[3px] bg-[#e8a33a] px-1 font-['Press_Start_2P'] text-[7px] leading-[11px] text-[#fffbe8]">HP</span>
      <div className="relative h-[10px] flex-1 overflow-hidden rounded-full border-2 border-[#30384a] bg-[#505870]">
        <motion.div className="absolute inset-y-0 left-0 rounded-full" style={{ width, backgroundColor: color }}>
          <div className="absolute inset-x-0 top-0 h-[38%] rounded-full bg-white/45" />
        </motion.div>
      </div>
    </div>
  )
}

function HpNumbers({ hp, max }: { hp: MotionValue<number>; max: number }) {
  const text = useTransform(() => String(Math.ceil(hp.get())).padStart(3, ' '))
  return (
    <div className="mt-0.5 text-right font-['VT323'] text-[19px] leading-none tracking-wider whitespace-pre @min-[40rem]:text-[22px]">
      <motion.span>{text}</motion.span>/{String(max).padStart(3, ' ')}
    </div>
  )
}

function ExpBar({ exp }: { exp: MotionValue<number> }) {
  const width = useTransform(() => `${Math.min(100, exp.get())}%`)
  return (
    <div className="mt-1 flex items-center gap-1.5">
      <span className="font-['Press_Start_2P'] text-[6px] text-[#3b7fd9]">EXP</span>
      <div className="relative h-[5px] flex-1 overflow-hidden rounded-full bg-[#c9cbd3]">
        <motion.div className="absolute inset-y-0 left-0 bg-[#49a6f0]" style={{ width }} />
      </div>
    </div>
  )
}
