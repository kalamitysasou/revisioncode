import { writable, derived } from 'svelte/store'

export const screen = writable('home') // home | quiz | results | dash | hard

export const gameState = writable({
  mode: 'practice',
  questions: [],
  idx: 0,
  score: 0,
  errors: 0,
  pts: 0,
  xpEarned: 0,
  streak: 0,
  maxStreak: 0,
  combo: 1,
  lives: 3,
  answered: false,
  hintUsed: false,
  selected: [],
  qStart: 0,
  timerLeft: 0,
  results: [],
  isExam: false,
  isSurvie: false,
  isAnki: false,
  newAchievements: [],
})

export const selTheme = writable('all')
export const selMode  = writable('practice')

export const currentQ = derived(gameState, $g => $g.questions[$g.idx] ?? null)
export const progress  = derived(gameState, $g => {
  const total = $g.questions.length
  return total ? Math.round(($g.idx / total) * 100) : 0
})
