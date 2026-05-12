<script>
  import { screen, gameState } from '../../stores/game.js'
  import { stats } from '../../stores/stats.js'
  import { launch } from '../../lib/engine.js'
  import { BANQUE } from '../../data/questions.js'
  import { fly } from 'svelte/transition'
  import { get } from 'svelte/store'

  $: st = $stats
  $: hardIds = st.hardIds ?? []
  $: hardQs  = BANQUE.filter(q => hardIds.includes(q._id))

  const DIFF = ['', '★', '★★', '★★★']

  function startHard() {
    if (!hardQs.length) { alert('Aucune question marquée comme difficile.'); return }
    launch('hard')
  }

  function removeHard(id) {
    stats.update(s => {
      s.hardIds = s.hardIds.filter(x => x !== id)
      stats.save(s); return s
    })
  }
</script>

<div class="hard-screen" in:fly={{ y: 16, duration: 280 }}>
  <button class="back-btn" onclick={() => screen.set('home')}>← Retour</button>

  <div class="hard-hero">
    <div class="hard-hero-icon">⭐</div>
    <h2 class="syne">Questions difficiles</h2>
    <p class="hard-sub">
      {hardQs.length ? `${hardQs.length} question${hardQs.length>1?'s':''} marquée${hardQs.length>1?'s':''}` : 'Aucune question marquée pour l\'instant'}
    </p>
  </div>

  {#if hardQs.length}
    <button class="btn btn-acc btn-full start-hard" onclick={startHard}>
      ⭐ Réviser les {hardQs.length} questions difficiles
    </button>

    <div class="hard-list">
      {#each hardQs as q (q._id)}
        <div class="hard-item" in:fly={{ y: 8, duration: 220 }}>
          <div class="hi-top">
            <span class="hi-cat">{q.e} {q.c}</span>
            <span class="hi-diff d{q.d}">{DIFF[q.d]}</span>
          </div>
          <div class="hi-q">{q.q}</div>
          <div class="hi-ans">
            {#each q.o as opt, i}
              <div class="hi-opt" class:correct={q.r.includes(i)}>
                {q.r.includes(i) ? '✅' : '○'} {opt}
              </div>
            {/each}
          </div>
          {#if q.tip}
            <div class="hi-tip">🧠 {q.tip}</div>
          {/if}
          <button class="hi-remove" onclick={() => removeHard(q._id)} title="Retirer des difficiles">✕</button>
        </div>
      {/each}
    </div>
  {:else}
    <div class="empty-state">
      <div class="empty-icon">🌟</div>
      <p class="empty-title syne">Pas encore de questions difficiles</p>
      <p class="empty-sub">Pendant une session, appuie sur <strong>⭐</strong> pour marquer une question comme difficile. Elle apparaîtra ici pour une révision ciblée.</p>
      <p class="empty-sub">Les questions ratées deux fois ou plus sont également ajoutées automatiquement.</p>
      <button class="btn btn-acc" onclick={() => screen.set('home')}>🚀 Commencer une session</button>
    </div>
  {/if}
</div>

<style>
  .hard-screen { display: flex; flex-direction: column; gap: 14px; padding-top: 8px }

  .back-btn { background: none; border: none; color: var(--mut); font-size: .82rem; cursor: pointer; padding: 0; text-align: left; margin-bottom: 2px }
  .back-btn:hover { color: var(--acc) }

  .hard-hero { text-align: center; padding: 4px 0 }
  .hard-hero-icon { font-size: 2.2rem; margin-bottom: 8px }
  h2 { font-size: 1.5rem; font-weight: 800; letter-spacing: -.02em; margin-bottom: 5px }
  .hard-sub { color: var(--mut); font-size: .82rem }

  .start-hard { padding: 14px; font-size: .9rem; border-radius: 12px }

  .hard-list { display: flex; flex-direction: column; gap: 10px }

  .hard-item {
    background: var(--card); border: 1.5px solid rgba(234,179,8,.25);
    border-radius: 12px; padding: 14px; position: relative;
  }
  .hi-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px }
  .hi-cat { font-size: .63rem; font-weight: 700; letter-spacing: .07em; text-transform: uppercase; color: var(--mut) }
  .hi-diff { font-size: .7rem; font-weight: 700 }
  .hi-diff.d1 { color: var(--grn) }
  .hi-diff.d2 { color: var(--org) }
  .hi-diff.d3 { color: var(--red) }

  .hi-q { font-size: .84rem; font-weight: 600; line-height: 1.5; margin-bottom: 10px }

  .hi-ans { display: flex; flex-direction: column; gap: 3px; margin-bottom: 6px }
  .hi-opt { font-size: .74rem; color: var(--mut); padding: 3px 0 }
  .hi-opt.correct { color: var(--grn); font-weight: 600 }

  .hi-tip {
    font-size: .72rem; color: var(--acc); font-style: italic;
    padding-top: 8px; border-top: 1px solid var(--brd); margin-top: 4px;
  }

  .hi-remove {
    position: absolute; top: 10px; right: 10px;
    background: none; border: none; color: var(--mut);
    font-size: .75rem; cursor: pointer; padding: 2px 6px;
    border-radius: 6px; transition: all .2s;
  }
  .hi-remove:hover { background: rgba(239,68,68,.12); color: var(--red) }

  /* Empty state */
  .empty-state {
    display: flex; flex-direction: column; align-items: center;
    gap: 10px; padding: 32px 16px; text-align: center;
  }
  .empty-icon { font-size: 3rem }
  .empty-title { font-size: 1.1rem; font-weight: 700 }
  .empty-sub { font-size: .8rem; color: var(--mut); line-height: 1.6; max-width: 300px }
</style>
