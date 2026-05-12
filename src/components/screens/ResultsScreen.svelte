<script>
  import { gameState } from '../../stores/game.js'
  import { stats } from '../../stores/stats.js'
  import { resetApp, replayErrors } from '../../lib/engine.js'
  import { screen } from '../../stores/game.js'
  import { fly, scale } from 'svelte/transition'

  const LTRS = ['A','B','C','D','E','F']

  $: gs = $gameState
  $: ans = gs.results.length
  $: pct = ans ? Math.round(gs.score / ans * 100) : 0
  $: pass = gs.isExam ? gs.score >= 35 : pct >= 80
  $: med  = !pass && (gs.isExam ? gs.score >= 28 : pct >= 55)
  $: circleClass = pass ? 'pass' : med ? 'med' : 'fail'
  $: circleText  = gs.isExam ? `${gs.score}/40` : `${pct}%`
  $: title = gs.isSurvie ? `💀 Survie — ${gs.score} questions` : gs.isExam ? (pass?'✅ Reçu !':med?'⚠️ Presque !':'❌ Non reçu') : (pass?'🎉 Excellent !':med?'📚 Bien !':'💪 À retravailler')
  $: sub   = gs.isSurvie ? `Streak max : ${gs.maxStreak} 🔥 · ${3-gs.lives} vie(s) perdue(s)` :
             gs.isExam   ? (pass?`${gs.score}/40 — Félicitations !`:`${gs.score}/40 — Il manque ${35-gs.score} point(s)`) :
             pass ? `${pct}% — Super travail !` : med ? `${pct}% — Continuez à réviser !` : `${pct}% — Ne lâchez pas !`

  $: hasErrors = gs.results.some(r => !r.ok)
  $: wrongCategories = [...new Set(gs.results.filter(r=>!r.ok).map(r=>r.q.c))]

  let showReview = false
</script>

<div class="results" in:fly={{ y: 20, duration: 300 }}>
  <!-- Circle score -->
  <div class="res-top">
    <div class="res-circle {circleClass}" in:scale={{ duration: 400, delay: 100, start: 0.6 }}>
      <span class="res-score syne">{circleText}</span>
      <span class="res-lbl">score</span>
    </div>

    <h2 class="res-title syne" in:fly={{ y: 10, duration: 300, delay: 200 }}>{title}</h2>
    <p class="res-sub" in:fly={{ y: 8, duration: 300, delay: 280 }}>{sub}</p>

    <!-- XP earned -->
    <div class="xp-earned" in:fly={{ y: 8, duration: 300, delay: 320 }}>
      +{gs.xpEarned} XP gagné · {gs.pts} pts
    </div>

    <!-- Stats grid -->
    <div class="stats-grid" in:fly={{ y: 10, duration: 300, delay: 350 }}>
      <div class="sbox"><div class="sval green">{gs.score}</div><div class="slbl">✅ Bonnes</div></div>
      <div class="sbox"><div class="sval red">{gs.errors}</div><div class="slbl">❌ Erreurs</div></div>
      <div class="sbox"><div class="sval blue">{gs.pts}</div><div class="slbl">⭐ Points</div></div>
      <div class="sbox"><div class="sval org">{gs.maxStreak}</div><div class="slbl">🔥 Streak</div></div>
    </div>

    <!-- Weak categories -->
    {#if wrongCategories.length}
      <div class="weak-cats" in:fly={{ y: 8, duration: 300, delay: 400 }}>
        <div class="weak-lbl">📌 Points à retravailler :</div>
        <div class="weak-tags">
          {#each wrongCategories as cat}
            <span class="weak-tag">{cat}</span>
          {/each}
        </div>
      </div>
    {/if}

    <!-- Action buttons -->
    <div class="res-btns" in:fly={{ y: 8, duration: 300, delay: 440 }}>
      <button class="btn btn-acc btn-full" onclick={resetApp}>🔄 Nouvelle série</button>
      {#if hasErrors}
        <button class="btn btn-red" onclick={replayErrors}>❌ Revoir mes erreurs</button>
      {/if}
      <button class="btn btn-ghost" onclick={() => screen.set('dash')}>📊 Mes stats</button>
      <button class="btn btn-ghost" onclick={() => showReview = !showReview}>
        {showReview ? '▲ Masquer le détail' : '📋 Voir le détail'}
      </button>
    </div>
  </div>

  <!-- Review detail -->
  {#if showReview}
    <div class="review" in:fly={{ y: 12, duration: 250 }}>
      <h3 class="review-title syne">📋 Détail — {gs.results.length} questions</h3>
      {#each gs.results as res, n}
        <div class="review-item" class:ci={res.ok} class:wi={!res.ok}>
          <div class="review-cat">{res.q.e} {res.q.c}</div>
          <div class="review-q">{n+1}. {res.q.q}</div>
          <div class="review-answers">
            {#each res.q.o as opt, j}
              {#if res.q.r.includes(j) || res.chosen.includes(j)}
                <div class="review-ans" class:good={res.q.r.includes(j)} class:bad={!res.q.r.includes(j)&&res.chosen.includes(j)}>
                  {res.q.r.includes(j) ? '✅' : '❌'} {LTRS[j]}. {opt}
                </div>
              {/if}
            {/each}
          </div>
          {#if !gs.isExam}
            <div class="review-expl">💡 {res.q.x}</div>
            {#if res.q.tip}
              <div class="review-tip">🧠 {res.q.tip}</div>
            {/if}
          {/if}
        </div>
      {/each}
    </div>
  {/if}
</div>

<style>
  .results { display: flex; flex-direction: column; gap: 14px; padding-top: 8px }

  .res-top { text-align: center }

  .res-circle {
    width: 100px; height: 100px; border-radius: 50%;
    margin: 0 auto 14px; display: flex; flex-direction: column;
    align-items: center; justify-content: center;
    position: relative;
  }
  .res-circle::after {
    content: ''; position: absolute; inset: 0; border-radius: 50%;
    border: 3px solid transparent;
  }
  .res-circle.pass { color: var(--grn); background: rgba(34,197,94,.1) }
  .res-circle.pass::after { border-color: var(--grn) }
  .res-circle.fail { color: var(--red); background: rgba(239,68,68,.1) }
  .res-circle.fail::after { border-color: var(--red) }
  .res-circle.med  { color: var(--org); background: rgba(249,115,22,.1) }
  .res-circle.med::after  { border-color: var(--org) }
  .res-score { font-size: 1.5rem; font-weight: 800; line-height: 1 }
  .res-lbl   { font-size: .62rem; font-weight: 600; letter-spacing: .04em; margin-top: 2px; opacity: .8 }

  .res-title { font-size: 1.3rem; font-weight: 800; margin-bottom: 5px }
  .res-sub   { color: var(--mut); font-size: .82rem; margin-bottom: 10px; line-height: 1.6 }

  .xp-earned {
    display: inline-block; background: rgba(234,179,8,.12); border: 1px solid rgba(234,179,8,.25);
    color: var(--ylw); border-radius: 99px; padding: 4px 14px; font-size: .76rem;
    font-weight: 700; font-family: 'Syne', sans-serif; margin-bottom: 14px;
  }

  .stats-grid { display: grid; grid-template-columns: repeat(4,1fr); gap: 7px; margin-bottom: 12px }
  .sbox { background: var(--card); border: 1px solid var(--brd); border-radius: var(--r); padding: 11px 5px; text-align: center }
  .sval { font-family: 'Syne', sans-serif; font-weight: 800; font-size: 1.25rem; margin-bottom: 2px }
  .sval.green { color: var(--grn) }
  .sval.red   { color: var(--red) }
  .sval.blue  { color: var(--acc) }
  .sval.org   { color: var(--org) }
  .slbl { font-size: .62rem; color: var(--mut) }

  .weak-cats { background: rgba(239,68,68,.06); border: 1px solid rgba(239,68,68,.18); border-radius: 10px; padding: 10px 14px; margin-bottom: 12px; text-align: left }
  .weak-lbl  { font-size: .74rem; font-weight: 600; margin-bottom: 7px; color: var(--red) }
  .weak-tags { display: flex; flex-wrap: wrap; gap: 5px }
  .weak-tag  { font-size: .7rem; background: rgba(239,68,68,.1); border: 1px solid rgba(239,68,68,.2); color: var(--red); border-radius: 99px; padding: 3px 10px; font-weight: 600 }

  .res-btns { display: grid; grid-template-columns: 1fr 1fr; gap: 8px }
  .res-btns .btn-full { grid-column: 1 / -1 }
  .res-btns .btn { padding: 12px }

  /* Review */
  .review { display: flex; flex-direction: column; gap: 9px }
  .review-title { font-size: .92rem; font-weight: 700; margin-bottom: 4px }
  .review-item { background: var(--sur); border: 1px solid var(--brd); border-radius: var(--r); padding: 13px; border-left: 3px solid var(--brd) }
  .review-item.ci { border-left-color: var(--grn) }
  .review-item.wi { border-left-color: var(--red) }
  .review-cat { font-size: .63rem; font-weight: 700; letter-spacing: .07em; text-transform: uppercase; color: var(--mut); margin-bottom: 5px }
  .review-q   { font-size: .82rem; font-weight: 500; margin-bottom: 7px; line-height: 1.5 }
  .review-ans { font-size: .76rem; margin-bottom: 3px; padding: 4px 9px; border-radius: 6px }
  .review-ans.good { background: rgba(34,197,94,.1); color: #86efac }
  .review-ans.bad  { background: rgba(239,68,68,.08); color: #fca5a5 }
  .review-expl { font-size: .74rem; color: var(--mut); margin-top: 8px; line-height: 1.55; padding-top: 8px; border-top: 1px solid var(--brd) }
  .review-tip  { font-size: .71rem; color: var(--acc); margin-top: 5px; font-style: italic }
</style>
