import { BANQUE } from '../data/questions.js'

export function ankiDue(ankiStore) {
  const today = new Date().toISOString().split('T')[0]
  return BANQUE.filter(q => {
    const a = ankiStore[q._id]
    return !a || a.next <= today
  })
}

export function ankiUpdate(ankiStore, id, correct) {
  const a = ankiStore[id] ?? { interval: 1, ease: 2.5 }
  if (correct) {
    a.interval = Math.round(a.interval * a.ease)
    a.ease = Math.min(3, a.ease + .1)
  } else {
    a.interval = 1
    a.ease = Math.max(1.3, a.ease - .2)
  }
  const d = new Date(); d.setDate(d.getDate() + a.interval)
  a.next = d.toISOString().split('T')[0]
  return { ...ankiStore, [id]: a }
}

export function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}
