let ctx = null
function getCtx() {
  if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)()
  return ctx
}

export function beep(type) {
  try {
    const c = getCtx()
    const o = c.createOscillator()
    const g = c.createGain()
    o.connect(g); g.connect(c.destination)
    const t = c.currentTime
    const presets = {
      click:  { type: 'sine',     freq: 440,  vol: .04, dur: .08 },
      ok:     { type: 'sine',     freq: 880,  vol: .12, dur: .25 },
      ok2:    { type: 'sine',     freq: 1100, vol: .10, dur: .18 },
      err:    { type: 'sawtooth', freq: 180,  vol: .12, dur: .35 },
      streak: { type: 'sine',     freq: 1046, vol: .09, dur: .5  },
      level:  { type: 'triangle', freq: 660,  vol: .14, dur: .6  },
      fanfare:{ type: 'sine',     freq: 880,  vol: .10, dur: .4  },
    }
    const p = presets[type] || presets.click
    o.type = p.type
    o.frequency.value = p.freq
    g.gain.setValueAtTime(p.vol, t)
    g.gain.exponentialRampToValueAtTime(.001, t + p.dur)
    o.start(t); o.stop(t + p.dur + .05)
  } catch {}
}

export function playFanfare() {
  const notes = [523, 659, 784, 1047]
  notes.forEach((freq, i) => {
    try {
      const c = getCtx()
      const o = c.createOscillator()
      const g = c.createGain()
      o.connect(g); g.connect(c.destination)
      const t = c.currentTime + i * .12
      o.type = 'sine'; o.frequency.value = freq
      g.gain.setValueAtTime(.1, t)
      g.gain.exponentialRampToValueAtTime(.001, t + .35)
      o.start(t); o.stop(t + .4)
    } catch {}
  })
}
