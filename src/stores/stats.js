import { writable } from 'svelte/store'

const SK = 'cdr_svelte_v1'

function mkDefault() {
  return {
    sessions:   [],
    themeOk:    {},
    themeTotal: {},
    hardIds:    [],
    wrongCount: {},
    anki:       {},
    bestStreak: 0,
    totalPts:   0,
    daily:      { date: '', count: 0 },
    xp:         0,
    level:      1,
    achievements: [],
    sound:      true,
    dark:       true,
  }
}

function load() {
  try { return { ...mkDefault(), ...JSON.parse(localStorage.getItem(SK) || '{}') } }
  catch { return mkDefault() }
}

function createStats() {
  const { subscribe, set, update } = writable(load())

  return {
    subscribe,
    save(data) {
      localStorage.setItem(SK, JSON.stringify(data))
    },
    update,
    set,
    reset() { const d = mkDefault(); set(d); localStorage.setItem(SK, JSON.stringify(d)) },
  }
}

export const stats = createStats()

// XP thresholds per level
export const XP_PER_LEVEL = [0, 100, 250, 500, 900, 1500, 2500, 4000, 6000, 9000, 13000]
export function getLevelFromXP(xp) {
  let lv = 1
  for (let i = 1; i < XP_PER_LEVEL.length; i++) {
    if (xp >= XP_PER_LEVEL[i]) lv = i + 1
  }
  return Math.min(lv, XP_PER_LEVEL.length)
}
export function getXPProgress(xp) {
  const lv = getLevelFromXP(xp)
  if (lv >= XP_PER_LEVEL.length) return 100
  const start = XP_PER_LEVEL[lv - 1]
  const end   = XP_PER_LEVEL[lv]
  return Math.round(((xp - start) / (end - start)) * 100)
}

// Achievements definitions
export const ACHIEVEMENTS = [
  { id: 'first_session',    icon: '🎉', label: 'Première session',       desc: 'Terminer sa première révision' },
  { id: 'streak_5',         icon: '🔥', label: 'En feu',                 desc: '5 bonnes réponses de suite' },
  { id: 'streak_10',        icon: '🌋', label: 'Inarrêtable',            desc: '10 bonnes réponses de suite' },
  { id: 'exam_pass',        icon: '🏆', label: 'Reçu !',                 desc: 'Valider un examen blanc ≥ 35/40' },
  { id: 'survie_10',        icon: '💀', label: 'Survivant',              desc: 'Atteindre 10 réponses en mode Survie' },
  { id: 'perfect_session',  icon: '💯', label: 'Session parfaite',       desc: '100% sur une session de 15 q' },
  { id: 'all_themes',       icon: '🌍', label: 'Polyvalent',             desc: 'Répondre à toutes les catégories' },
  { id: 'anki_master',      icon: '🧠', label: 'Maître Anki',            desc: 'Faire 5 sessions Anki' },
  { id: 'level_5',          icon: '⭐', label: 'Niveau 5',               desc: 'Atteindre le niveau 5' },
  { id: 'pts_1000',         icon: '💰', label: 'Millionnaire',           desc: 'Cumuler 1 000 points' },
]
