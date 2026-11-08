import type { Album } from './MusicStreaming.data'

/**
 * Tone.js による「それっぽい」自動演奏。曲ごとのシード(調・テンポ・進行・スタイル)からパッド/アルペジオ/ベース/ドラムを鳴らす。
 * - tone はユーザーが再生ボタンを押したときに初めて dynamic import し、Tone.start() で AudioContext を開始する
 * - 音量はかなり小さめ(-22dB 基準)。アンマウント時は自分のループとシンセをすべて dispose し、Transport を止める
 */

type ToneNS = typeof import('tone')
type Sound = Album['sound']

const PROGS_MAJOR = [
  [[5, 9, 12, 16], [7, 11, 14, 17], [4, 7, 11, 14], [9, 12, 16, 19]], // IV-V-iii-vi
  [[0, 4, 7, 11], [9, 12, 16, 19], [2, 5, 9, 12], [7, 11, 14, 17]], // I-vi-ii-V
  [[0, 4, 7, 11], [7, 11, 14, 18], [9, 12, 16, 19], [5, 9, 12, 16]], // I-V-vi-IV
]
const PROGS_MINOR = [
  [[0, 3, 7, 10], [8, 12, 15, 19], [3, 7, 10, 14], [10, 14, 17, 21]], // i-VI-III-VII
  [[0, 3, 7, 10], [5, 8, 12, 15], [8, 12, 15, 19], [7, 11, 14, 17]],
]
const ARP = [0, 2, 1, 3, 2, 1, 3, 2]

export class SynthEngine {
  private T: ToneNS | null = null
  private loading: Promise<ToneNS | null> | null = null
  private nodes: { dispose: () => unknown }[] = []
  private loop: { dispose: () => unknown; start: (t?: number) => unknown } | null = null
  private master: import('tone').Volume | null = null
  private pad: import('tone').PolySynth | null = null
  private pluck: import('tone').Synth | null = null
  private bass: import('tone').MonoSynth | null = null
  private kick: import('tone').MembraneSynth | null = null
  private hat: import('tone').NoiseSynth | null = null
  private sound: Sound | null = null
  private seed = 0
  private step = 0
  private dead = false
  playing = false

  /** クリックハンドラーの中から呼ぶ */
  async ensure() {
    if (this.T) return this.T
    if (!this.loading)
      this.loading = import('tone')
        .then(async (T) => {
          await T.start()
          if (this.dead) return null
          this.T = T
          this.build(T)
          return T
        })
        .catch(() => null)
    return this.loading
  }

  private build(T: ToneNS) {
    const master = new T.Volume(-22).toDestination()
    const filter = new T.Filter(2600, 'lowpass').connect(master)
    const verb = new T.Freeverb({ roomSize: 0.72, dampening: 2800, wet: 0.28 }).connect(filter)
    const pad = new T.PolySynth(T.Synth, {
      oscillator: { type: 'triangle' },
      envelope: { attack: 0.5, decay: 0.4, sustain: 0.55, release: 1.8 },
      volume: -16,
    }).connect(verb)
    const pluck = new T.Synth({ oscillator: { type: 'sine' }, envelope: { attack: 0.004, decay: 0.28, sustain: 0.05, release: 0.6 }, volume: -13 }).connect(verb)
    const bass = new T.MonoSynth({
      oscillator: { type: 'sine' },
      envelope: { attack: 0.02, decay: 0.3, sustain: 0.5, release: 0.4 },
      filterEnvelope: { attack: 0.01, decay: 0.2, sustain: 0.4, release: 0.4, baseFrequency: 180, octaves: 2 },
      volume: -11,
    }).connect(filter)
    const kick = new T.MembraneSynth({ volume: -15, octaves: 4, pitchDecay: 0.04 }).connect(filter)
    const hat = new T.NoiseSynth({ noise: { type: 'white' }, envelope: { attack: 0.001, decay: 0.045, sustain: 0 }, volume: -32 }).connect(filter)
    this.master = master
    this.pad = pad
    this.pluck = pluck
    this.bass = bass
    this.kick = kick
    this.hat = hat
    this.nodes = [hat, kick, bass, pluck, pad, verb, filter, master]
    const loop = new T.Loop((time) => this.tick(time), '8n')
    loop.start(0)
    this.loop = loop
  }

  private tick(time: number) {
    const T = this.T
    const s = this.sound
    if (!T || !s || !this.pad) return
    const st = this.step++
    const bar = Math.floor(st / 8) % 4
    const progs = s.minor ? PROGS_MINOR : PROGS_MAJOR
    const prog = progs[this.seed % progs.length]
    const chord = prog[bar]
    const root = 57 + s.key - (s.key > 6 ? 12 : 0)
    const f = (n: number) => T.Frequency(n, 'midi').toFrequency()
    const b8 = st % 8
    if (b8 === 0) {
      this.pad.triggerAttackRelease(
        chord.map((n) => f(root + n)),
        s.style === 'ambient' ? '1m' : '2n',
        time,
        s.style === 'ambient' ? 0.5 : 0.35,
      )
    }
    if (s.style !== 'ambient' && (b8 === 0 || (b8 === 5 && s.style !== 'folk'))) this.bass?.triggerAttackRelease(f(root + chord[0] - 24), '8n', time, 0.7)
    const arpOn = s.style === 'ambient' ? b8 % 4 === 2 && (this.seed + st) % 3 !== 0 : s.style === 'lofi' ? b8 % 2 === 0 : true
    if (arpOn) {
      const n = chord[ARP[(b8 + this.seed) % 8] % chord.length] + 12 + (s.style === 'ambient' ? 12 : 0)
      this.pluck?.triggerAttackRelease(f(root + n), '16n', time + (s.style === 'lofi' && b8 % 2 ? 0.03 : 0), s.style === 'ambient' ? 0.35 : 0.5)
    }
    if (s.style === 'pop' || s.style === 'synth' || s.style === 'lofi') {
      if (b8 % 4 === 0) this.kick?.triggerAttackRelease('C1', '8n', time, 0.8)
      if (b8 % 2 === 1) this.hat?.triggerAttackRelease('16n', time, s.style === 'lofi' ? 0.4 : 0.7)
    }
  }

  setTrack(sound: Sound, seed: number) {
    this.sound = sound
    this.seed = seed
    this.step = 0
    if (!this.T) return
    const tr = this.T.getTransport()
    tr.bpm.value = sound.bpm
    this.pad?.releaseAll()
  }

  play() {
    this.playing = true
    if (!this.T) return
    const tr = this.T.getTransport()
    if (tr.state !== 'started') tr.start('+0.05')
  }

  pause() {
    this.playing = false
    if (!this.T) return
    this.T.getTransport().pause()
    this.pad?.releaseAll()
  }

  setVolume(v: number, muted: boolean) {
    if (!this.master) return
    const db = muted || v <= 0.001 ? -Infinity : -34 + v * 16
    if (db === -Infinity) this.master.mute = true
    else {
      this.master.mute = false
      this.master.volume.rampTo(db, 0.1)
    }
  }

  dispose() {
    this.dead = true
    if (!this.T) return
    try {
      const tr = this.T.getTransport()
      tr.stop()
      this.loop?.dispose()
      this.pad?.releaseAll()
      this.nodes.forEach((n) => n.dispose())
    } catch {
      /* noop */
    }
    this.nodes = []
    this.loop = null
    this.T = null
  }
}
