<script>
  import { selTheme, selMode, screen } from '../../stores/game.js'
  import { stats, getLevelFromXP, getXPProgress, ACHIEVEMENTS } from '../../stores/stats.js'
  import { BANQUE, CATEGORIES } from '../../data/questions.js'
  import { ankiDue } from '../../lib/anki.js'
  import { launch } from '../../lib/engine.js'
  import { fly } from 'svelte/transition'

  function replayLastErrors() { launch('last_errors') }

  const MODES = [
    { id:'practice', icon:'📚', label:'Révision libre',   desc:'15 questions · Indices · Explications · Sans pression', color:'var(--acc)' },
    { id:'exam',     icon:'🎯', label:'Examen blanc',     desc:'40 questions · 40 minutes · Seuil 35/40 (ANTS)', color:'var(--red)' },
    { id:'survie',   icon:'💀', label:'Mode Survie',      desc:'Infini · 3 vies · Bats ton record', color:'#ef4444' },
    { id:'anki',     icon:'🧠', label:'Révision Anki',    desc:'Répétition espacée · Questions dues uniquement', color:'var(--grn)' },
  ]

  const THEME_ICONS = { Signalisation:'🚦', Priorités:'⚡', Vitesse:'💨', Alcool:'🍺', Stationnement:'🅿️', Sécurité:'🔒', Conduite:'🛣️', Autoroute:'🏎️', Documents:'📋', Éclairages:'💡', Environnement:'🌿' }

  $: st     = $stats
  $: xp     = st.xp ?? 0
  $: lv     = getLevelFromXP(xp)
  $: xpPct  = getXPProgress(xp)
  $: ankiN  = ankiDue(st.anki).length
  $: earned = st.achievements ?? []

  $: today  = new Date().toISOString().split('T')[0]
  $: dailyN = (st.daily?.date === today ? st.daily.count : 0)
  $: dailyPct = Math.min(100, Math.round(dailyN / 10 * 100))

  function go() {
    if ($selMode === 'anki') {
      if (!ankiN) { alert('🧠 Toutes vos questions sont à jour ! Revenez demain.'); return }
    }
    launch($selMode, $selTheme)
  }

  function goSurvie() { launch('survie') }
  function goAnki()   {
    if (!ankiN) { alert('🧠 Toutes vos questions sont à jour ! Revenez demain.'); return }
    launch('anki')
  }

  function pickMode(id) {
    if (id === 'survie') { goSurvie(); return }
    if (id === 'anki')   { goAnki();   return }
    selMode.set(id)
  }

  function pickTheme(t) {
    if ($selMode === 'exam') return
    selTheme.set(t)
  }

  // Theme mastery %
  function themePct(cat) {
    const tot = st.themeTotal?.[cat] || 0
    const ok  = st.themeOk?.[cat]   || 0
    return tot ? Math.round(ok/tot*100) : null
  }
</script>

<div class="home" in:fly={{ y: 16, duration: 300 }}>
  <!-- Hero -->
  <div class="hero">
    <div class="hero-icon">🚦</div>
    <h1 class="syne">Révise le <span class="acc">Code de la Route</span></h1>
    <p class="sub">110 vraies questions · Examen blanc · Survie · Anki · Achievements</p>
  </div>

  <!-- Daily goal -->
  <div class="daily-card" class:done={dailyPct >= 100}>
    <div class="daily-top">
      <span class="daily-label">{dailyPct >= 100 ? '✅ Objectif du jour atteint !' : `🎯 Objectif du jour : ${dailyN}/10 questions`}</span>
      {#if dailyPct >= 100}<span class="daily-streak">🔥 Continue demain !</span>{/if}
    </div>
    <div class="daily-bar">
      <div class="daily-fill" style="width:{dailyPct}%"></div>
    </div>
  </div>

  <!-- Modes -->
  <p class="sect-lbl">Mode de révision</p>
  <div class="modes">
    {#each MODES as m}
      <button
        class="mode-btn"
        class:active={$selMode === m.id && m.id !== 'survie' && m.id !== 'anki'}
        style="--mc:{m.color}"
        onclick={() => pickMode(m.id)}
      >
        <div class="mode-icon">{m.icon}</div>
        <div class="mode-name syne">{m.label}</div>
        <div class="mode-desc">{m.desc}</div>
        {#if m.id === 'anki' && ankiN > 0}
          <div class="mode-badge">{ankiN} dues</div>
        {/if}
      </button>
    {/each}
  </div>

  <!-- Themes (only for practice) -->
  {#if $selMode === 'practice'}
    <p class="sect-lbl">Thème</p>
    <div class="themes">
      <button class="tc" class:active={$selTheme === 'all'} onclick={() => pickTheme('all')}>🎯 Tous</button>
      {#each CATEGORIES as cat}
        {@const pct = themePct(cat)}
        <button class="tc" class:active={$selTheme === cat} onclick={() => pickTheme(cat)}>
          {THEME_ICONS[cat] || '📌'} {cat}
          {#if pct !== null}
            <span class="tc-pct" class:good={pct>=80} class:bad={pct<55}>{pct}%</span>
          {/if}
        </button>
      {/each}
    </div>
  {/if}

  <!-- Achievements preview -->
  {#if earned.length}
    <p class="sect-lbl">Badges obtenus ({earned.length}/{ACHIEVEMENTS.length})</p>
    <div class="ach-row">
      {#each ACHIEVEMENTS as a}
        <div class="ach-badge" class:unlocked={earned.includes(a.id)} title={a.label + ' — ' + a.desc}>
          <span class="ach-icon">{a.icon}</span>
        </div>
      {/each}
    </div>
  {/if}

  <!-- Start button -->
  <button
    class="btn btn-full start-btn"
    class:btn-red={$selMode === 'exam'}
    class:btn-acc={$selMode !== 'exam'}
    onclick={go}
  >
    {$selMode === 'exam' ? '🎯 Démarrer l\'examen blanc' : '🚀 Commencer →'}
  </button>

  <!-- Stats quick view -->
  <div class="quick-stats">
    <div class="qs-box"><strong>{$stats.sessions?.length ?? 0}</strong><span>sessions</span></div>
    <div class="qs-box"><strong>{$stats.totalPts ?? 0}</strong><span>points</span></div>
    <div class="qs-box"><strong>{$stats.bestStreak ?? 0}</strong><span>🔥 record</span></div>
    <div class="qs-box"><strong>{lv}</strong><span>niveau</span></div>
  </div>

  <!-- Nav to other screens -->
  <div class="nav-btns">
    <button class="nav-btn" onclick={() => screen.set('dash')}>📊 Mes stats</button>
    <button class="nav-btn" onclick={() => screen.set('hard')}>⭐ Difficiles ({($stats.hardIds??[]).length})</button>
    {#if ($stats.lastErrors??[]).length}
      <button class="nav-btn nav-btn-err" onclick={replayLastErrors}>
        🔁 Dernières erreurs ({$stats.lastErrors.length})
      </button>
    {/if}
  </div>
</div>

<style>
  .home { display: flex; flex-direction: column; gap: 14px; padding-top: 8px }

  .hero { text-align: center; padding: 4px 0 }
  .hero-icon { font-size: 2.4rem; margin-bottom: 8px }
  h1 { font-size: 1.7rem; line-height: 1.2; letter-spacing: -.03em; margin-bottom: 6px }
  .acc { color: var(--acc) }
  .sub { color: var(--mut); font-size: .82rem; line-height: 1.7 }

  .sect-lbl {
    font-size: .66rem; font-weight: 700; letter-spacing: .08em;
    text-transform: uppercase; color: var(--mut);
  }

  /* Daily */
  .daily-card {
    background: var(--card); border: 1.5px solid var(--brd); border-radius: var(--r);
    padding: 11px 14px; transition: border-color .3s;
  }
  .daily-card.done { border-color: var(--grn) }
  .daily-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; font-size: .76rem; font-weight: 600 }
  .daily-streak { color: var(--org); font-size: .7rem }
  .daily-bar { height: 5px; background: var(--brd); border-radius: 99px; overflow: hidden }
  .daily-fill { height: 100%; background: linear-gradient(90deg, var(--grn), #4ade80); border-radius: 99px; transition: width .5s ease }

  /* Modes */
  .modes {
    display: grid; grid-template-columns: 1fr 1fr; gap: 9px;
  }
  .mode-btn {
    background: var(--card); border: 2px solid var(--brd); border-radius: var(--r);
    padding: 14px 12px; cursor: pointer; transition: all .2s; text-align: left;
    position: relative; color: var(--txt);
  }
  .mode-btn:hover { border-color: var(--mc, var(--acc)); transform: translateY(-2px) }
  .mode-btn.active { border-color: var(--mc, var(--acc)); background: color-mix(in srgb, var(--mc, var(--acc)) 8%, transparent) }
  .mode-icon { font-size: 1.5rem; margin-bottom: 5px }
  .mode-name { font-weight: 700; font-size: .84rem; margin-bottom: 3px }
  .mode-desc { font-size: .68rem; color: var(--mut); line-height: 1.5 }
  .mode-badge {
    position: absolute; top: 8px; right: 8px;
    background: var(--grn); color: #fff;
    font-size: .62rem; font-weight: 700; padding: 2px 7px; border-radius: 99px;
  }

  /* Themes */
  .themes { display: flex; flex-wrap: wrap; gap: 5px }
  .tc {
    padding: 5px 12px; border-radius: 99px; font-size: .72rem; font-weight: 600;
    border: 1.5px solid var(--brd); background: var(--card); color: var(--mut);
    cursor: pointer; transition: all .18s; display: flex; align-items: center; gap: 5px;
  }
  .tc:hover, .tc.active { border-color: var(--acc); color: var(--acc); background: rgba(59,130,246,.08) }
  .tc-pct { font-size: .62rem; opacity: .8 }
  .tc-pct.good { color: var(--grn) }
  .tc-pct.bad  { color: var(--red) }

  /* Achievements */
  .ach-row { display: flex; flex-wrap: wrap; gap: 6px }
  .ach-badge {
    width: 36px; height: 36px; border-radius: 10px;
    display: flex; align-items: center; justify-content: center;
    background: var(--card); border: 1.5px solid var(--brd);
    font-size: 1.2rem; transition: all .2s; cursor: default;
    filter: grayscale(1) opacity(.35);
  }
  .ach-badge.unlocked { filter: none; border-color: var(--ylw); background: rgba(234,179,8,.12) }
  .ach-icon { line-height: 1 }

  /* Start button */
  .start-btn { padding: 15px; font-size: .95rem; border-radius: 12px; margin-top: 2px }

  /* Quick stats */
  .quick-stats {
    display: grid; grid-template-columns: repeat(4,1fr); gap: 7px;
  }
  .qs-box {
    background: var(--card); border: 1px solid var(--brd); border-radius: 10px;
    padding: 10px 5px; text-align: center;
    display: flex; flex-direction: column; align-items: center; gap: 2px;
  }
  .qs-box strong { font-family: 'Syne', sans-serif; font-weight: 800; font-size: 1rem; color: var(--acc) }
  .qs-box span   { font-size: .62rem; color: var(--mut) }

  /* Nav */
  .nav-btns { display: grid; grid-template-columns: 1fr 1fr; gap: 8px }
  .nav-btn {
    padding: 10px; background: var(--card); border: 1.5px solid var(--brd); border-radius: 10px;
    font-family: 'Syne', sans-serif; font-weight: 600; font-size: .77rem;
    color: var(--mut); cursor: pointer; transition: all .2s; text-align: center;
  }
  .nav-btn:hover { border-color: var(--acc); color: var(--acc) }
  .nav-btn-err { border-color: rgba(239,68,68,.3); color: var(--red); grid-column: 1 / -1 }
  .nav-btn-err:hover { border-color: var(--red) }
</style>
