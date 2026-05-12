<script>
  import { profiles, AVATARS } from '../../stores/profiles.js'
  import { setStatsProfile } from '../../stores/stats.js'
  import { fly, scale } from 'svelte/transition'

  let creating = false
  let name = ''
  let avatar = AVATARS[0]
  let error = ''

  function select(id) {
    setStatsProfile(id)
    profiles.select(id)
  }

  function create() {
    if (!name.trim()) { error = 'Entre un prénom'; return }
    if (name.trim().length > 20) { error = '20 caractères max'; return }
    const id = profiles.create(name.trim(), avatar)
    setStatsProfile(id)
  }

  function del(e, id) {
    e.stopPropagation()
    if (!confirm('Supprimer ce profil et toutes ses statistiques ?')) return
    profiles.remove(id)
  }

  function startCreate() { creating = true; name = ''; avatar = AVATARS[Math.floor(Math.random()*AVATARS.length)]; error = '' }
  function cancel() { creating = false; error = '' }
</script>

<div class="ps-wrap" in:fly={{ y: 20, duration: 300 }}>
  <div class="ps-hero">
    <div class="ps-icon">🚦</div>
    <h1 class="syne">Code de la Route</h1>
    <p class="ps-sub">Choisis ton profil pour commencer</p>
  </div>

  {#if !creating}
    <!-- Profile list -->
    <div class="profiles">
      {#each $profiles.list as p (p.id)}
        <div class="profile-card" role="button" tabindex="0"
          onclick={() => select(p.id)}
          onkeydown={(e) => e.key === 'Enter' && select(p.id)}
          in:scale={{ duration: 200 }}
        >
          <div class="p-avatar">{p.avatar}</div>
          <div class="p-name syne">{p.name}</div>
          <button class="p-del" onclick={(e) => del(e, p.id)} title="Supprimer">✕</button>
        </div>
      {/each}

      <button class="profile-card add-card" onclick={startCreate}>
        <div class="p-avatar add-icon">＋</div>
        <div class="p-name">Nouveau profil</div>
      </button>
    </div>

  {:else}
    <!-- Create form -->
    <div class="create-form" in:fly={{ y: 12, duration: 250 }}>
      <p class="sect-lbl">Choisis ton avatar</p>
      <div class="avatar-grid">
        {#each AVATARS as av}
          <button
            class="av-btn"
            class:active={avatar === av}
            onclick={() => avatar = av}
          >{av}</button>
        {/each}
      </div>

      <p class="sect-lbl" style="margin-top:14px">Ton prénom</p>
      <input
        class="name-input"
        type="text"
        placeholder="Ex : Sarah"
        bind:value={name}
        maxlength="20"
        onkeydown={(e) => e.key === 'Enter' && create()}
      />
      {#if error}<p class="err">{error}</p>{/if}

      <div class="form-btns">
        <button class="btn btn-acc" onclick={create}>✅ Créer le profil</button>
        <button class="btn btn-ghost" onclick={cancel}>Annuler</button>
      </div>
    </div>
  {/if}
</div>

<style>
  .ps-wrap {
    min-height: 100vh; display: flex; flex-direction: column;
    align-items: center; justify-content: center;
    padding: 24px 16px; gap: 24px;
  }

  .ps-hero { text-align: center }
  .ps-icon { font-size: 3rem; margin-bottom: 10px }
  h1 { font-size: 1.8rem; font-weight: 800; letter-spacing: -.03em; margin-bottom: 6px }
  .ps-sub { color: var(--mut); font-size: .84rem }

  .sect-lbl { font-size: .66rem; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; color: var(--mut); margin-bottom: 8px }

  .profiles {
    display: grid; grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
    gap: 10px; width: 100%; max-width: 480px;
  }

  .profile-card {
    background: var(--card); border: 2px solid var(--brd); border-radius: 16px;
    padding: 20px 10px; cursor: pointer; transition: all .2s;
    display: flex; flex-direction: column; align-items: center; gap: 8px;
    position: relative; color: var(--txt);
  }
  .profile-card:hover { border-color: var(--acc); transform: translateY(-3px); box-shadow: 0 8px 20px rgba(0,0,0,.2) }

  .add-card { border-style: dashed; color: var(--mut) }
  .add-card:hover { border-color: var(--acc); color: var(--acc) }

  .p-avatar { font-size: 2.4rem; line-height: 1 }
  .add-icon { font-size: 2rem; color: inherit }
  .p-name { font-family: 'Syne', sans-serif; font-weight: 700; font-size: .84rem; text-align: center }

  .p-del {
    position: absolute; top: 6px; right: 6px;
    background: none; border: none; color: var(--mut);
    font-size: .7rem; cursor: pointer; padding: 3px 5px;
    border-radius: 6px; line-height: 1; transition: all .15s;
  }
  .p-del:hover { background: rgba(239,68,68,.15); color: var(--red) }

  /* Create form */
  .create-form { width: 100%; max-width: 380px; display: flex; flex-direction: column }

  .avatar-grid { display: grid; grid-template-columns: repeat(10, 1fr); gap: 4px }
  .av-btn {
    font-size: 1.3rem; padding: 5px; border-radius: 8px;
    background: var(--card); border: 2px solid var(--brd);
    cursor: pointer; transition: all .15s; line-height: 1;
  }
  .av-btn:hover { border-color: var(--acc) }
  .av-btn.active { border-color: var(--acc); background: rgba(59,130,246,.12); transform: scale(1.1) }

  .name-input {
    width: 100%; padding: 12px 14px; background: var(--card);
    border: 1.5px solid var(--brd); border-radius: 10px;
    font-family: 'Syne', sans-serif; font-size: 1rem; font-weight: 600;
    color: var(--txt); outline: none; transition: border-color .2s;
    box-sizing: border-box;
  }
  .name-input:focus { border-color: var(--acc) }

  .err { color: var(--red); font-size: .74rem; margin-top: 4px }

  .form-btns { display: flex; flex-direction: column; gap: 8px; margin-top: 14px }
</style>
