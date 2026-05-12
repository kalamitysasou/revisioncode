import { get } from 'svelte/store'
import { screen, gameState, selTheme, selMode } from '../stores/game.js'
import { stats, ACHIEVEMENTS, getLevelFromXP } from '../stores/stats.js'
import { BANQUE } from '../data/questions.js'
import { ankiDue, ankiUpdate, shuffle } from './anki.js'
import { beep, playFanfare } from './sound.js'

// ─── Build question sets ───────────────────────────────────────────
function buildSet(mode, theme = 'all') {
  if (mode === 'exam')   return shuffle(BANQUE).slice(0, 40)
  if (mode === 'survie') return shuffle(BANQUE)
  if (mode === 'anki')   return shuffle(ankiDue(get(stats).anki)).slice(0, 20)
  if (mode === 'hard')   return shuffle(BANQUE.filter(q => get(stats).hardIds.includes(q._id)))
  if (mode === 'errors') return get(gameState).results.filter(r => !r.ok).map(r => r.q)
  const pool = theme === 'all' ? BANQUE : BANQUE.filter(q => q.c === theme)
  return shuffle(pool).slice(0, 15)
}

// ─── Launch ───────────────────────────────────────────────────────
export function launch(mode, theme = 'all') {
  const qs = buildSet(mode, theme)
  if (!qs.length) { alert('Aucune question disponible !'); return }
  beep('click')

  gameState.set({
    mode, questions: qs,
    idx: 0, score: 0, errors: 0,
    pts: 0, xpEarned: 0,
    streak: 0, maxStreak: 0, combo: 1,
    lives: 3, answered: false, hintUsed: false,
    selected: [], qStart: Date.now(),
    timerLeft: mode === 'exam' ? 40 * 60 : 0,
    results: [],
    isExam: mode === 'exam',
    isSurvie: mode === 'survie',
    isAnki: mode === 'anki',
    newAchievements: [],
  })
  screen.set('quiz')
}

// ─── Check answer ─────────────────────────────────────────────────
export function checkAnswer(chosen) {
  const gs = get(gameState)
  const q  = gs.questions[gs.idx]
  if (!q || gs.answered) return

  const isOk = chosen.length === q.r.length &&
    chosen.every(i => q.r.includes(i)) &&
    q.r.every(i => chosen.includes(i))
  const isPartial = !isOk && chosen.some(i => q.r.includes(i))
  const fast = (Date.now() - gs.qStart) < 8000

  const st = get(stats)
  let xpGain = 0, ptsGain = 0

  if (isOk) {
    const comboNew = Math.min(gs.combo + (gs.streak >= 2 ? 1 : 0), 3)
    const basePts  = q.m ? 15 : 10
    ptsGain = Math.round(basePts * comboNew) + (fast ? 5 : 0)
    xpGain  = q.d === 3 ? 20 : q.d === 2 ? 12 : 8
    if (fast) xpGain += 3
    const newStreak = gs.streak + 1
    const newMax    = Math.max(gs.maxStreak, newStreak)

    if (newStreak >= 3 && newStreak % 3 === 0) beep('streak')
    else beep('ok')

    gameState.update(g => ({
      ...g, answered: true,
      score: g.score + 1,
      pts: g.pts + ptsGain,
      xpEarned: g.xpEarned + xpGain,
      streak: newStreak, maxStreak: newMax,
      combo: Math.min(g.combo + (newStreak >= 3 ? 1 : 0), 3),
      results: [...g.results, { q, ok: true, chosen, pts: ptsGain, xp: xpGain }],
    }))

    // Update anki
    stats.update(s => {
      s.anki = ankiUpdate(s.anki, q._id, true)
      s.themeTotal[q.c] = (s.themeTotal[q.c] || 0) + 1
      s.themeOk[q.c]    = (s.themeOk[q.c]   || 0) + 1
      stats.save(s); return s
    })
  } else {
    xpGain = 2 // consolation
    beep('err')

    gameState.update(g => ({
      ...g, answered: true,
      errors: g.errors + 1,
      streak: 0, combo: 1,
      xpEarned: g.xpEarned + xpGain,
      results: [...g.results, { q, ok: false, chosen, pts: 0, xp: xpGain }],
    }))

    stats.update(s => {
      s.wrongCount[q._id] = (s.wrongCount[q._id] || 0) + 1
      if (s.wrongCount[q._id] >= 2 && !s.hardIds.includes(q._id)) s.hardIds.push(q._id)
      s.anki = ankiUpdate(s.anki, q._id, false)
      s.themeTotal[q.c] = (s.themeTotal[q.c] || 0) + 1
      stats.save(s); return s
    })

    if (gs.isSurvie) {
      gameState.update(g => ({ ...g, lives: g.lives - 1 }))
      if (get(gameState).lives <= 0) {
        setTimeout(() => { saveSession(); screen.set('results') }, 900)
        return
      }
    }
  }

  // Daily goal
  stats.update(s => {
    const today = new Date().toISOString().split('T')[0]
    if (s.daily.date !== today) s.daily = { date: today, count: 0 }
    s.daily.count++
    stats.save(s); return s
  })
}

// ─── Next question ────────────────────────────────────────────────
export function nextQ() {
  beep('click')
  const gs = get(gameState)
  const next = gs.idx + 1
  if (next >= gs.questions.length) { saveSession(); return }
  gameState.update(g => ({
    ...g, idx: next,
    answered: false, hintUsed: false, selected: [],
    qStart: Date.now(),
  }))
}

// ─── Save session & show results ─────────────────────────────────
export function saveSession() {
  const gs  = get(gameState)
  const ans = gs.results.length
  const pct = ans ? Math.round(gs.score / ans * 100) : 0

  const newAch = []

  stats.update(s => {
    // XP + level
    const prevLv = getLevelFromXP(s.xp)
    s.xp      += gs.xpEarned
    s.totalPts += gs.pts
    const newLv = getLevelFromXP(s.xp)
    if (newLv > prevLv) { beep('level'); newAch.push({ id:'level_up', icon:'⭐', label:`Niveau ${newLv} !`, desc:`Tu as atteint le niveau ${newLv}` }) }

    // Sessions history
    s.bestStreak = Math.max(s.bestStreak, gs.maxStreak)
    s.sessions.unshift({ date: new Date().toLocaleDateString('fr-FR'), mode: gs.mode, score: gs.score, total: ans, pts: gs.pts, maxStreak: gs.maxStreak, pct })
    if (s.sessions.length > 60) s.sessions.pop()

    // Achievements checks
    if (s.sessions.length === 1) newAch.push(ACHIEVEMENTS.find(a => a.id === 'first_session'))
    if (gs.maxStreak >= 5  && !s.achievements.includes('streak_5'))   { s.achievements.push('streak_5');   newAch.push(ACHIEVEMENTS.find(a=>a.id==='streak_5')) }
    if (gs.maxStreak >= 10 && !s.achievements.includes('streak_10'))  { s.achievements.push('streak_10');  newAch.push(ACHIEVEMENTS.find(a=>a.id==='streak_10')) }
    if (gs.isExam && gs.score >= 35 && !s.achievements.includes('exam_pass')) { s.achievements.push('exam_pass'); newAch.push(ACHIEVEMENTS.find(a=>a.id==='exam_pass')); playFanfare() }
    if (gs.isSurvie && gs.score >= 10 && !s.achievements.includes('survie_10')) { s.achievements.push('survie_10'); newAch.push(ACHIEVEMENTS.find(a=>a.id==='survie_10')) }
    if (pct === 100 && ans >= 10 && !s.achievements.includes('perfect_session')) { s.achievements.push('perfect_session'); newAch.push(ACHIEVEMENTS.find(a=>a.id==='perfect_session')); playFanfare() }
    if (gs.isAnki && s.sessions.filter(x=>x.mode==='anki').length >= 5 && !s.achievements.includes('anki_master')) { s.achievements.push('anki_master'); newAch.push(ACHIEVEMENTS.find(a=>a.id==='anki_master')) }
    if (getLevelFromXP(s.xp) >= 5 && !s.achievements.includes('level_5')) { s.achievements.push('level_5'); newAch.push(ACHIEVEMENTS.find(a=>a.id==='level_5')) }
    if (s.totalPts >= 1000 && !s.achievements.includes('pts_1000')) { s.achievements.push('pts_1000'); newAch.push(ACHIEVEMENTS.find(a=>a.id==='pts_1000')) }

    stats.save(s); return s
  })

  if (newAch.filter(Boolean).length) {
    gameState.update(g => ({ ...g, newAchievements: newAch.filter(Boolean) }))
    setTimeout(() => gameState.update(g => ({ ...g, newAchievements: [] })), 5000)
  }

  screen.set('results')
}

// ─── Hint ─────────────────────────────────────────────────────────
export function useHint() {
  const gs = get(gameState)
  if (gs.answered || gs.hintUsed || gs.isExam) return
  const q = gs.questions[gs.idx]
  const wrongs = q.o.map((_,i)=>i).filter(i=>!q.r.includes(i))
  const pick = wrongs[Math.floor(Math.random() * wrongs.length)]
  gameState.update(g => ({ ...g, hintUsed: true, hintEliminated: pick }))
}

// ─── Star toggle ──────────────────────────────────────────────────
export function toggleStar() {
  const q = get(gameState).questions[get(gameState).idx]
  stats.update(s => {
    if (s.hardIds.includes(q._id)) s.hardIds = s.hardIds.filter(id => id !== q._id)
    else s.hardIds.push(q._id)
    stats.save(s); return s
  })
}

// ─── Reset ────────────────────────────────────────────────────────
export function resetApp() {
  beep('click')
  gameState.update(g => ({ ...g, newAchievements: [] }))
  screen.set('home')
}

export function replayErrors() {
  const errors = get(gameState).results.filter(r => !r.ok).map(r => r.q)
  if (!errors.length) return
  gameState.update(g => ({
    ...g, mode: 'errors', questions: shuffle(errors),
    idx: 0, score: 0, errors: 0, pts: 0, xpEarned: 0,
    streak: 0, maxStreak: 0, combo: 1,
    lives: 3, answered: false, hintUsed: false, selected: [],
    qStart: Date.now(), results: [],
    isExam: false, isSurvie: false, isAnki: false, newAchievements: [],
  }))
  screen.set('quiz')
}
