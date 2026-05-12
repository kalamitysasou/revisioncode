import { writable, derived } from 'svelte/store'

const PK = 'cdr_profiles_v1'
const CK = 'cdr_current_profile'

const AVATARS = ['🧑','👩','👨','🧒','👧','👦','🧑‍🎓','👩‍🎓','👨‍🎓','🧑‍💻','👩‍💻','👨‍💻','🦊','🐼','🐨','🦁','🐸','🦋','⭐','🚗']
export { AVATARS }

function loadProfiles() {
  try { return JSON.parse(localStorage.getItem(PK) || '[]') }
  catch { return [] }
}
function saveProfiles(list) {
  localStorage.setItem(PK, JSON.stringify(list))
}

function createProfileStore() {
  const { subscribe, set, update } = writable({
    list: loadProfiles(),
    currentId: localStorage.getItem(CK) || null,
  })

  return {
    subscribe,
    create(name, avatar) {
      const id = Date.now().toString(36)
      update(s => {
        const profile = { id, name, avatar, createdAt: new Date().toISOString() }
        const list = [...s.list, profile]
        saveProfiles(list)
        localStorage.setItem(CK, id)
        return { list, currentId: id }
      })
      return id
    },
    select(id) {
      localStorage.setItem(CK, id)
      update(s => ({ ...s, currentId: id }))
    },
    remove(id) {
      update(s => {
        const list = s.list.filter(p => p.id !== id)
        saveProfiles(list)
        localStorage.removeItem(`cdr_svelte_${id}`)
        const currentId = s.currentId === id ? (list[0]?.id || null) : s.currentId
        if (currentId) localStorage.setItem(CK, currentId)
        else localStorage.removeItem(CK)
        return { list, currentId }
      })
    },
    rename(id, name, avatar) {
      update(s => {
        const list = s.list.map(p => p.id === id ? { ...p, name, avatar } : p)
        saveProfiles(list)
        return { ...s, list }
      })
    },
  }
}

export const profiles = createProfileStore()

export const currentProfile = derived(profiles, $p =>
  $p.list.find(p => p.id === $p.currentId) || null
)

export function statsKey(profileId) {
  return `cdr_svelte_${profileId}`
}
