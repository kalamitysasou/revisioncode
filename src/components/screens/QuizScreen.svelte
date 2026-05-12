<script>
  import { gameState, currentQ, progress } from '../../stores/game.js'
  import { stats } from '../../stores/stats.js'
  import { SVG } from '../../data/svgs.js'
  import { checkAnswer, nextQ, saveSession, useHint, toggleStar } from '../../lib/engine.js'
  import { beep } from '../../lib/sound.js'
  import { fly, scale } from 'svelte/transition'
  import { tick } from 'svelte'

  const LTRS = ['A','B','C','D','E','F']
  const DIFF = ['','⭐','⭐⭐','⭐⭐⭐']

  $: gs = $gameState
  $: q  = $currentQ
  $: pct = $progress
  $: isStarred = ($stats.hardIds ?? []).includes(q?._id)

  // Option states after answer
  function optClass(i) {
    if (!gs.answered) {
      if (q?.m && gs.selected.includes(i)) return 'selected'
      return ''
    }
    const right = q.r.includes(i)
    const sel   = gs.selected.includes(i)
    if (right && sel)   return 'correct'
    if (right && !sel)  return 'missed'
    if (!right && sel)  return 'wrong'
    if (gs.hintEliminated === i) return 'hint-out'
    return 'revealed'
  }

  function pickOpt(i) {
    if (gs.answered) return
    if (gs.hintEliminated === i) return
    beep('click')
    if (!q.m) {
      gameState.update(g => ({ ...g, selected: [i] }))
      checkAnswer([i])
    } else {
      gameState.update(g => {
        const sel = g.selected.includes(i)
          ? g.selected.filter(x => x !== i)
          : [...g.selected, i]
        return { ...g, selected: sel }
      })
    }
  }

  function validate() {
    if (gs.answered || !gs.selected.length) return
    checkAnswer(gs.selected)
  }

  // Feedback content
  $: fbResult = gs.answered && q
    ? (() => {
        const chose = gs.selected
        const isOk = chose.length === q.r.length && chose.every(i=>q.r.includes(i)) && q.r.every(i=>chose.includes(i))
        const isPartial = !isOk && chose.some(i=>q.r.includes(i))
        const fast = gs.results.at(-1)?.xp > 10
        return { isOk, isPartial, fast }
      })()
    : null

  // Keyboard
  function onKey(e) {
    if (!q) return
    const map = {KeyA:0,KeyB:1,KeyC:2,KeyD:3,KeyE:4,Digit1:0,Digit2:1,Digit3:2,Digit4:3,Digit5:4}
    if (map[e.code] !== undefined && !gs.answered) pickOpt(map[e.code])
    if ((e.code==='Space'||e.code==='ArrowRight') && gs.answered) { e.preventDefault(); nextQ() }
    if (e.code==='Enter' && !gs.answered && q.m) validate()
    if (e.code==='KeyH') useHint()
  }

  // Swipe
  let tx = 0
  function onTouchStart(e) { tx = e.touches[0].clientX }
  function onTouchEnd(e)   { if (Math.abs(e.changedTouches[0].clientX - tx) > 60 && gs.answered) nextQ() }
</script>

<svelte:window onkeydown={onKey} />

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="quiz" ontouchstart={onTouchStart} ontouchend={onTouchEnd}>
  <!-- Survie lives -->
  {#if gs.isSurvie}
    <div class="lives">
      <span class="lives-lbl">VIES</span>
      <span class="hearts">
        {#each Array(3) as _, i}
          <span class:dead={i >= gs.lives}>{'❤️'}</span>
        {/each}
      </span>
    </div>
  {/if}

  <!-- Exam banner -->
  {#if gs.isExam}
    <div class="exam-banner">🎯 EXAMEN BLANC — 40 questions · 40 minutes · Seuil 35/40</div>
  {/if}

  <!-- Progress -->
  <div class="prog-wrap">
    <div class="prog-meta">
      <span>Q {gs.idx+1}/{gs.questions.length}</span>
      <div class="combo-wrap">
        {#if gs.combo > 1}
          <span class="combo">×{gs.combo} combo</span>
        {/if}
        <span>{pct}%</span>
      </div>
    </div>
    <div class="prog-bar">
      <div class="prog-fill" class:exam={gs.isExam} style="width:{pct}%"></div>
    </div>
  </div>

  {#if q}
    <!-- Tags -->
    <div class="tags">
      <span class="tag-cat">{q.e} {q.c}</span>
      {#if q.m}<span class="tag-multi">☑ Plusieurs réponses</span>{/if}
      <span class="tag-diff" title="Difficulté">{DIFF[q.d??1]}</span>
      <span class="tag-pts">+{gs.combo > 1 ? Math.round((q.m?15:10)*gs.combo) : (q.m?15:10)} pts</span>
    </div>

    <!-- Question card -->
    {#key gs.idx}
      <div class="q-card" in:fly={{ y: 20, duration: 280 }}
        class:correct-anim={gs.answered && fbResult?.isOk}
        class:wrong-anim={gs.answered && fbResult && !fbResult.isOk}
        class:exam-mode={gs.isExam}
      >
        <div class="q-num">Question {gs.idx+1}</div>
        <div class="q-text syne">{q.q}</div>

        {#if q.s && SVG[q.s]}
          <div class="q-visual">
            {@html SVG[q.s]}
          </div>
        {/if}
      </div>
    {/key}

    <!-- Options -->
    {#key gs.idx}
      <div class="opts">
        {#each q.o as opt, i}
          <button
            class="opt {optClass(i)}"
            disabled={gs.answered || gs.hintEliminated === i}
            onclick={() => pickOpt(i)}
            in:fly={{ y: 12, duration: 220, delay: i * 40 }}
          >
            {#if q.m}
              <span class="opt-cb" class:checked={gs.selected.includes(i) && !gs.answered}>
                {#if gs.answered && q.r.includes(i)}✓{:else if gs.answered && gs.selected.includes(i) && !q.r.includes(i)}✕{:else if gs.selected.includes(i) && !gs.answered}✓{/if}
              </span>
            {:else}
              <span class="opt-ltr">{LTRS[i]}</span>
            {/if}
            <span class="opt-txt">{opt}</span>
          </button>
        {/each}
      </div>
    {/key}

    <!-- Feedback box -->
    {#if gs.answered && fbResult && !gs.isExam}
      <div class="fb" class:fb-ok={fbResult.isOk} class:fb-err={!fbResult.isOk && !fbResult.isPartial} class:fb-partial={fbResult.isPartial}
        in:fly={{ y: 8, duration: 220 }}
      >
        <div class="fb-title syne">
          {fbResult.isOk ? '✅ Bonne réponse !' : fbResult.isPartial ? '⚠️ Partiellement correct' : '❌ Mauvaise réponse'}
          {#if fbResult.isOk && fbResult.fast}<span class="fb-bonus">🚀 +5 bonus rapidité</span>{/if}
        </div>
        <div class="fb-expl">{q.x}</div>
        {#if q.tip}
          <div class="fb-tip">💡 {q.tip}</div>
        {/if}
      </div>
    {/if}

    <!-- XP earned float -->
    {#if gs.answered}
      {@const lastR = gs.results.at(-1)}
      {#if lastR?.xp > 0}
        <div class="xp-float" in:scale={{ duration: 300, start: 0.5 }}>+{lastR.xp} XP</div>
      {/if}
    {/if}

    <!-- Controls -->
    <div class="ctrls">
      {#if !gs.isExam}
        <button class="ctrl-btn" onclick={useHint} disabled={gs.answered || gs.hintUsed} title="Indice (H)">💡</button>
      {/if}
      <button class="ctrl-btn" class:starred={isStarred} onclick={toggleStar} title="Marquer comme difficile">⭐</button>
      {#if q.m && !gs.answered}
        <button class="btn btn-acc ctrl-validate" onclick={validate} disabled={!gs.selected.length}>Valider ✓</button>
      {/if}
      {#if gs.answered}
        <button class="btn btn-acc ctrl-next" onclick={nextQ}>
          {gs.idx + 1 >= gs.questions.length ? 'Voir les résultats →' : 'Suivant → '}
          <span class="next-hint">[Espace]</span>
        </button>
      {/if}
    </div>

    <!-- Swipe hint -->
    {#if gs.answered}
      <div class="swipe-hint">← Glissez ou appuyez Espace pour continuer →</div>
    {/if}
  {/if}
</div>

<style>
  .quiz { display: flex; flex-direction: column; gap: 10px; padding-top: 8px }

  /* Survie lives */
  .lives { display: flex; align-items: center; justify-content: center; gap: 8px }
  .lives-lbl { font-size: .66rem; font-weight: 700; letter-spacing: .08em; color: var(--red); text-transform: uppercase }
  .hearts { font-size: 1.3rem; letter-spacing: 3px }
  .hearts .dead { filter: grayscale(1) opacity(.3) }

  /* Exam banner */
  .exam-banner {
    background: rgba(239,68,68,.08); border: 1px solid rgba(239,68,68,.25);
    border-radius: var(--r); padding: 9px 14px; text-align: center;
    font-family: 'Syne', sans-serif; font-weight: 700; font-size: .8rem; color: var(--red);
  }

  /* Progress */
  .prog-meta { display: flex; justify-content: space-between; font-size: .7rem; color: var(--mut); margin-bottom: 6px; font-weight: 500 }
  .combo-wrap { display: flex; align-items: center; gap: 8px }
  .combo { color: var(--pur); font-weight: 700; font-size: .72rem; background: rgba(168,85,247,.12); border: 1px solid rgba(168,85,247,.25); padding: 1px 8px; border-radius: 99px }
  .prog-bar { height: 4px; background: var(--brd); border-radius: 99px; overflow: hidden }
  .prog-fill { height: 100%; background: linear-gradient(90deg, var(--acc), #818cf8); border-radius: 99px; transition: width .5s cubic-bezier(.4,0,.2,1) }
  .prog-fill.exam { background: linear-gradient(90deg, var(--red), var(--org)) }

  /* Tags */
  .tags { display: flex; flex-wrap: wrap; gap: 5px; align-items: center }
  .tag-cat  { font-size: .67rem; font-weight: 700; letter-spacing: .06em; text-transform: uppercase; color: var(--acc); background: rgba(59,130,246,.1); border: 1px solid rgba(59,130,246,.2); padding: 3px 9px; border-radius: 99px }
  .tag-multi{ font-size: .67rem; font-weight: 700; color: var(--org); background: rgba(249,115,22,.1); border: 1px solid rgba(249,115,22,.25); padding: 3px 9px; border-radius: 99px }
  .tag-pts  { font-size: .67rem; font-weight: 600; color: var(--mut); background: var(--card); border: 1px solid var(--brd); padding: 3px 9px; border-radius: 99px }
  .tag-diff { font-size: .72rem; line-height: 1 }

  /* Question card */
  .q-card {
    background: var(--sur); border: 1px solid var(--brd); border-radius: var(--r);
    padding: 17px; position: relative; overflow: hidden;
  }
  .q-card::before {
    content: ''; position: absolute; top: 0; left: 0; right: 0; height: 2px;
    background: linear-gradient(90deg, var(--acc), transparent);
  }
  .q-card.exam-mode::before { background: linear-gradient(90deg, var(--red), transparent) }
  .q-num { font-size: .66rem; font-weight: 600; color: var(--mut); letter-spacing: .06em; text-transform: uppercase; margin-bottom: 8px }
  .q-text { font-size: .97rem; font-weight: 600; line-height: 1.55 }
  .q-visual { margin-top: 12px; display: flex; justify-content: center; align-items: center; min-height: 90px }
  .q-visual :global(svg) { max-height: 140px; max-width: 180px }

  /* Animations */
  .correct-anim { animation: pop .4s ease }
  .wrong-anim   { animation: shake .35s ease }
  @keyframes pop   { 0%{transform:scale(1)} 40%{transform:scale(1.025)} 100%{transform:scale(1)} }
  @keyframes shake { 0%,100%{transform:translateX(0)} 20%{transform:translateX(-6px)} 60%{transform:translateX(6px)} }

  /* Options */
  .opts { display: flex; flex-direction: column; gap: 7px }
  .opt {
    width: 100%; padding: 11px 13px; background: var(--card); border: 1.5px solid var(--brd);
    border-radius: 9px; color: var(--txt); font-family: 'DM Sans', sans-serif; font-size: .86rem;
    text-align: left; cursor: pointer; transition: all .15s;
    display: flex; align-items: center; gap: 9px; line-height: 1.4;
  }
  .opt:hover:not(:disabled):not(.revealed) { border-color: var(--acc); background: rgba(59,130,246,.07); transform: translateX(3px) }
  .opt.selected { border-color: var(--acc); background: rgba(59,130,246,.1) }
  .opt.correct  { background: rgba(34,197,94,.12);  border-color: var(--grn) !important; animation: pop .3s ease }
  .opt.wrong    { background: rgba(239,68,68,.09);  border-color: var(--red) !important; color: var(--mut) }
  .opt.missed   { background: rgba(234,179,8,.08);  border-color: var(--ylw) !important }
  .opt.revealed { opacity: .28 }
  .opt.hint-out { opacity: .18; cursor: not-allowed }
  .opt:disabled { cursor: default }
  .opt-ltr {
    width: 22px; height: 22px; min-width: 22px; border-radius: 6px;
    background: var(--brd); display: flex; align-items: center; justify-content: center;
    font-family: 'Syne', sans-serif; font-weight: 700; font-size: .67rem; color: var(--mut);
    transition: all .15s; flex-shrink: 0;
  }
  .opt.correct .opt-ltr, .opt.correct .opt-cb { background: var(--grn); color: #fff }
  .opt.wrong  .opt-ltr, .opt.wrong  .opt-cb { background: var(--red); color: #fff }
  .opt.missed .opt-cb { background: var(--ylw); color: #000 }
  .opt-cb {
    width: 17px; height: 17px; min-width: 17px; border-radius: 5px;
    border: 2px solid var(--brd); background: transparent;
    display: flex; align-items: center; justify-content: center;
    font-size: .65rem; transition: all .15s; flex-shrink: 0;
  }
  .opt-cb.checked { background: var(--acc); border-color: var(--acc); color: #fff }

  /* Feedback */
  .fb {
    border-radius: 10px; padding: 13px 15px; font-size: .83rem; line-height: 1.65;
    border: 1px solid;
  }
  .fb-ok      { background: rgba(34,197,94,.09);  border-color: rgba(34,197,94,.3);  color: #86efac }
  .fb-err     { background: rgba(239,68,68,.07);  border-color: rgba(239,68,68,.25); color: #fca5a5 }
  .fb-partial { background: rgba(234,179,8,.08);  border-color: rgba(234,179,8,.25); color: #fde047 }
  .fb-title   { font-family: 'Syne', sans-serif; font-weight: 700; font-size: .84rem; margin-bottom: 5px; display: flex; align-items: center; gap: 8px; flex-wrap: wrap }
  .fb-bonus   { font-size: .72rem; background: rgba(34,197,94,.2); border-radius: 99px; padding: 1px 8px }
  .fb-expl    { margin-bottom: 6px }
  .fb-tip     {
    margin-top: 8px; padding-top: 8px; border-top: 1px solid currentColor;
    font-size: .77rem; opacity: .8; font-style: italic;
  }

  /* XP float */
  .xp-float {
    text-align: center; font-family: 'Syne', sans-serif; font-weight: 800;
    font-size: .9rem; color: var(--ylw);
    text-shadow: 0 2px 8px rgba(234,179,8,.4);
  }

  /* Controls */
  .ctrls { display: flex; gap: 7px; align-items: center }
  .ctrl-btn {
    padding: 10px 12px; background: var(--card); border: 1.5px solid var(--brd);
    border-radius: 9px; color: var(--mut); font-size: .9rem; cursor: pointer; transition: all .18s;
  }
  .ctrl-btn:hover:not(:disabled) { border-color: var(--org); color: var(--org) }
  .ctrl-btn:disabled { opacity: .28; cursor: default }
  .ctrl-btn.starred  { border-color: var(--ylw); color: var(--ylw); background: rgba(234,179,8,.1) }
  .ctrl-validate, .ctrl-next { flex: 1; padding: 11px 16px; font-size: .86rem }
  .next-hint { font-size: .65rem; opacity: .6 }

  .swipe-hint { text-align: center; font-size: .67rem; color: var(--mut); opacity: .5 }
</style>
