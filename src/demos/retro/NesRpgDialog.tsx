import nesCss from 'nes.css/css/nes.min.css?inline'
import { AnimatePresence, motion, useAnimate } from 'motion/react'
import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { ShadowScope } from '../../catalog/helpers'

/**
 * NES.css によるファミコン風 RPG バトル画面。
 * - nes-container(is-dark / with-title)、nes-progress(HP/MP)、nes-btn、nes-icon を使用
 * - メッセージウィンドウは1文字ずつ表示するタイプライター
 * - 被弾時は Motion の useAnimate でスプライトを揺らし、ダメージ数値を AnimatePresence で浮かせる
 * - ↑↓ + Enter でもコマンド選択可能(クリックでフォーカス)
 * - NES.css はグローバルに要素を書き換えるため ShadowScope 内で使用、フォントは Press Start 2P
 */

const SLIME = [
  '......XXXX......',
  '....XXbbbbXX....',
  '...XbbbbbbbbX...',
  '..XbwwbbbbbbbX..',
  '..XbwbbbbbbbbX..',
  '.XbbbbbbbbbbbbX.',
  '.XbbkkbbbbkkbbX.',
  '.XbbkwbbbbkwbbX.',
  'XbbbkkbbbbkkbbbX',
  'XbbbbbbbbbbbbbbX',
  'XbbbbbkkkkbbbbbX',
  'XbbbbbbkkbbbbbbX',
  '.XbbbbbbbbbbbbX.',
  '..XXXXXXXXXXXX..',
]
const PALETTE: Record<string, string> = { X: '#1e4d1e', b: '#62d162', w: '#ffffff', k: '#111111' }

function SlimeSprite() {
  return (
    <svg width="112" height="98" viewBox="0 0 16 14" shapeRendering="crispEdges">
      {SLIME.flatMap((row, y) =>
        [...row].map((ch, x) => (ch === '.' ? null : <rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" fill={PALETTE[ch]} />)),
      )}
    </svg>
  )
}

const COMMANDS = ['FIGHT', 'MAGIC', 'ITEM', 'RUN'] as const
type Command = (typeof COMMANDS)[number]
type Phase = 'player' | 'busy' | 'won' | 'lost'

const ENEMY_MAX = 30
const HERO_MAX = 50
const MP_MAX = 20
const rand = (a: number, b: number) => a + Math.floor(Math.random() * (b - a + 1))

const EXTRA_CSS = `
.nes { position: relative; height: 100%; width: 100%; box-sizing: border-box; overflow: hidden; background: #212529; color: #fff;
  font-family: "Press Start 2P", monospace; font-size: 9px; line-height: 1.6; padding: 10px; display: flex; flex-direction: column; gap: 8px; outline: none; }
.nes *, .nes *:before, .nes *:after { box-sizing: border-box; }
.top { display: flex; justify-content: space-between; gap: 8px; }
.nes-container { padding: 10px 12px !important; margin: 0 !important; }
.nes-container.with-title > .title { font-size: 9px; margin: -18px 0 6px !important; padding: 0 4px; }
.stat { width: 46%; }
.nes-progress { height: 14px !important; margin: 4px 0 0 !important; width: 100%; }
.nes-progress + .label { margin-top: 4px; }
.label { display: flex; justify-content: space-between; }
.arena { position: relative; flex: 1; min-height: 0; display: grid; place-items: center;
  background: linear-gradient(#212529 55%, #2b3a2b 56%, #22301f); border: 4px solid #fff; border-radius: 4px; }
.dmg { position: absolute; top: 30%; color: #ffd23f; font-size: 14px; text-shadow: 2px 2px #000; pointer-events: none; }
.flash { position: absolute; inset: 0; background: #fff; pointer-events: none; }
.bottom { display: flex; gap: 8px; height: 92px; }
.msg { flex: 1; overflow: hidden; }
.cmds { width: 120px; list-style: none; padding-left: 0; }
.cmds li { cursor: pointer; padding: 1px 0 1px 14px; position: relative; }
.cmds li.on:before { content: "▶"; position: absolute; left: 0; animation: blink 0.8s steps(2) infinite; }
.cmds.off li { opacity: .5; cursor: default; }
@keyframes blink { 50% { opacity: 0; } }
.caret { display: inline-block; animation: blink 0.8s steps(2) infinite; }
.end { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.nes-btn { font-size: 9px; padding: 4px 10px !important; }
`

export function NesRpgDialog() {
  const [enemyHp, setEnemyHp] = useState(ENEMY_MAX)
  const [heroHp, setHeroHp] = useState(HERO_MAX)
  const [mp, setMp] = useState(MP_MAX)
  const [potions, setPotions] = useState(2)
  const [phase, setPhase] = useState<Phase>('player')
  const [cursor, setCursor] = useState(0)
  const [message, setMessage] = useState('A wild SLIME appears! Command?')
  const [typed, setTyped] = useState(0)
  const [popups, setPopups] = useState<{ id: number; text: string }[]>([])
  const [flash, setFlash] = useState(0)
  const timers = useRef<number[]>([])
  const popupId = useRef(0)
  const [spriteRef, animateSprite] = useAnimate<HTMLDivElement>()
  const [screenRef, animateScreen] = useAnimate<HTMLDivElement>()

  useEffect(() => () => timers.current.forEach(clearTimeout), [])
  const later = (fn: () => void, ms: number) => {
    timers.current.push(window.setTimeout(fn, ms))
  }

  // typewriter
  useEffect(() => {
    setTyped(0)
    const t = setInterval(() => {
      setTyped((n) => {
        if (n >= message.length) {
          clearInterval(t)
          return n
        }
        return n + 1
      })
    }, 28)
    return () => clearInterval(t)
  }, [message])

  const popup = (text: string) => {
    const id = ++popupId.current
    setPopups((p) => [...p, { id, text }])
    later(() => setPopups((p) => p.filter((x) => x.id !== id)), 900)
  }

  const enemyTurn = (hp: number) => {
      later(() => {
        const dmg = rand(3, 8)
        const next = Math.max(0, hp - dmg)
        setHeroHp(next)
        setMessage(`SLIME attacks! HERO takes ${dmg} damage.`)
        animateScreen(screenRef.current, { x: [0, -6, 6, -4, 4, 0] }, { duration: 0.35 })
        later(() => {
          if (next <= 0) {
            setPhase('lost')
            setMessage('HERO was defeated... GAME OVER')
          } else {
            setPhase('player')
            setMessage('Command?')
          }
        }, 1100)
      }, 1200)
  }

  const hitEnemy = (dmg: number, verb: string) => {
    const next = Math.max(0, enemyHp - dmg)
    setEnemyHp(next)
    setMessage(`${verb} SLIME takes ${dmg} damage!`)
    popup(`-${dmg}`)
    animateSprite(
      spriteRef.current,
      { x: [0, -10, 10, -6, 6, 0], filter: ['brightness(1)', 'brightness(3)', 'brightness(1)'] },
      { duration: 0.4 },
    )
    if (next <= 0) {
      later(() => {
        setPhase('won')
        setMessage('SLIME was defeated! HERO gained 12 EXP and 8 GOLD.')
      }, 1000)
    } else {
      enemyTurn(heroHp)
    }
  }

  const run = (cmd: Command) => {
    if (phase !== 'player') return
    setPhase('busy')
    if (cmd === 'FIGHT') hitEnemy(rand(5, 9), 'HERO attacks!')
    if (cmd === 'MAGIC') {
      if (mp < 5) {
        setMessage('Not enough MP!')
        later(() => setPhase('player'), 900)
        return
      }
      setMp((m) => m - 5)
      setFlash((f) => f + 1)
      hitEnemy(rand(10, 14), 'HERO casts FIRE!')
    }
    if (cmd === 'ITEM') {
      if (potions <= 0) {
        setMessage('No POTIONS left!')
        later(() => setPhase('player'), 900)
        return
      }
      const healed = Math.min(15, HERO_MAX - heroHp)
      setPotions((p) => p - 1)
      setHeroHp(heroHp + healed)
      setMessage(`HERO drinks a POTION. Recovered ${healed} HP!`)
      enemyTurn(heroHp + healed)
    }
    if (cmd === 'RUN') {
      setMessage("HERO tries to run... Couldn't escape!")
      enemyTurn(heroHp)
    }
  }

  const reset = () => {
    timers.current.forEach(clearTimeout)
    timers.current = []
    setEnemyHp(ENEMY_MAX)
    setHeroHp(HERO_MAX)
    setMp(MP_MAX)
    setPotions(2)
    setPhase('player')
    setCursor(0)
    setMessage('Another SLIME appears! Command?')
  }

  const onKey = (e: KeyboardEvent) => {
    if (phase !== 'player') return
    if (e.key === 'ArrowDown') setCursor((c) => (c + 1) % COMMANDS.length)
    else if (e.key === 'ArrowUp') setCursor((c) => (c + COMMANDS.length - 1) % COMMANDS.length)
    else if (e.key === 'Enter' || e.key === ' ') run(COMMANDS[cursor])
    else return
    e.preventDefault()
  }

  const done = typed >= message.length
  const over = phase === 'won' || phase === 'lost'

  return (
    <div className="relative h-full w-full overflow-hidden">
      <ShadowScope css={[nesCss, EXTRA_CSS]} className="h-full w-full">
        <div className="nes" ref={screenRef} tabIndex={0} onKeyDown={onKey}>
          <div className="top">
            <div className="nes-container is-dark with-title stat">
              <p className="title">SLIME Lv.3</p>
              <div className="label">
                <span>HP</span>
                <span>
                  {enemyHp}/{ENEMY_MAX}
                </span>
              </div>
              <progress className="nes-progress is-error" value={enemyHp} max={ENEMY_MAX} />
            </div>
            <div className="nes-container is-dark with-title stat">
              <p className="title">HERO</p>
              <div className="label">
                <span>HP</span>
                <span>
                  {heroHp}/{HERO_MAX}
                </span>
              </div>
              <progress className={`nes-progress ${heroHp < 15 ? 'is-warning' : 'is-success'}`} value={heroHp} max={HERO_MAX} />
              <div className="label" style={{ marginTop: 4 }}>
                <span>MP</span>
                <span>
                  {mp}/{MP_MAX}
                </span>
              </div>
              <progress className="nes-progress is-primary" value={mp} max={MP_MAX} />
            </div>
          </div>

          <div className="arena">
            <AnimatePresence>
              {enemyHp > 0 && (
                <motion.div
                  key="slime"
                  ref={spriteRef}
                  initial={{ opacity: 0, scale: 0.6 }}
                  animate={{ opacity: 1, scale: 1, y: [0, -4, 0] }}
                  exit={{ opacity: 0, scale: 0.4, filter: 'brightness(4)' }}
                  transition={{ y: { duration: 1.2, repeat: Infinity, ease: 'easeInOut' }, default: { duration: 0.4 } }}
                >
                  <SlimeSprite />
                </motion.div>
              )}
            </AnimatePresence>
            {phase === 'won' && <i className="nes-icon trophy is-large" />}
            <AnimatePresence>
              {popups.map((p) => (
                <motion.span
                  key={p.id}
                  className="dmg"
                  initial={{ y: 0, opacity: 1, scale: 0.6 }}
                  animate={{ y: -34, opacity: [1, 1, 0], scale: 1.2 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.9, ease: 'easeOut' }}
                >
                  {p.text}
                </motion.span>
              ))}
            </AnimatePresence>
            <AnimatePresence>
              {flash > 0 && (
                <motion.div
                  key={flash}
                  className="flash"
                  initial={{ opacity: 0.9 }}
                  animate={{ opacity: 0 }}
                  transition={{ duration: 0.5 }}
                />
              )}
            </AnimatePresence>
          </div>

          <div className="bottom">
            <div className="nes-container is-dark is-rounded msg" onClick={() => setTyped(message.length)}>
              <p style={{ margin: 0 }}>
                {message.slice(0, typed)}
                {done && phase === 'player' && <span className="caret"> ▼</span>}
              </p>
              {over && done && (
                <div className="end" style={{ marginTop: 6 }}>
                  <button type="button" className={`nes-btn ${phase === 'won' ? 'is-success' : 'is-error'}`} onClick={reset}>
                    {phase === 'won' ? 'PLAY AGAIN' : 'RETRY'}
                  </button>
                  {phase === 'won' && (
                    <span>
                      <i className="nes-icon coin is-small" /> +8
                    </span>
                  )}
                </div>
              )}
            </div>
            <ul className={`nes-container is-dark cmds${phase === 'player' ? '' : ' off'}`}>
              {COMMANDS.map((c, i) => (
                <li
                  key={c}
                  className={cursor === i ? 'on' : ''}
                  onMouseEnter={() => phase === 'player' && setCursor(i)}
                  onClick={() => run(c)}
                >
                  {c === 'ITEM' ? `ITEM x${potions}` : c}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </ShadowScope>
    </div>
  )
}
