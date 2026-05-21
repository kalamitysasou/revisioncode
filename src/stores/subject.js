import { writable } from 'svelte/store'

const SK = 'app_subject'

export const subject = writable(localStorage.getItem(SK) || 'cdr')

subject.subscribe(v => localStorage.setItem(SK, v))
