<script>
  import { screen, gameState, selMode } from '../stores/game.js'
  import { stats, getLevelFromXP, getXPProgress } from '../stores/stats.js'
  import { profiles, currentProfile } from '../stores/profiles.js'
  import { beep } from '../lib/sound.js'

  function toggleTheme() {
    stats.update(s => { s.dark = !s.dark; stats.save(s); return s })
  }
  function toggleSound() {
    stats.update(s => { s.sound = !s.sound; stats.save(s); return s })
    beep('click')
  }
  function switchProfile() {
    profiles.select(null)
    localStorage.removeItem('cdr_current_profile')
    location.reload()
  }

  $: dark  = $stats.dark
  $: sound = $stats.sound
  $: xp    = $stats.xp ?? 0
  $: lv    = getLevelFromXP(xp)
  $: xpPct = getXPProgress(xp)
  $: inQuiz = $screen === 'quiz'
  $: gs    = $gameState
  $: profile = $currentProfile
</script>

<header>
  <div class="logo">
    <div class="logo-i">🚗</div>
    <span class="syne">Code de la Route</span>
  </div>

  <div class="hdr-r">
    <!-- Profile pill -->
    {#if profile}
      <button class="profile-pill" onclick={switchProfile} title="Changer de profil">
        <span class="pp-avatar">{profile.avatar}</span>
        <span class="pp-name">{profile.name}</span>
      </button>
    {/if}

    <!-- Theme & sound -->
    <button class="icon-btn" onclick={toggleSound} title="Son">{sound ? '🔔' : '🔕'}</button>
    <button class="icon-btn" onclick={toggleTheme} title="Thème">{dark ? '☀️' : '🌙'}</button>

    {#if inQuiz}
      <!-- Timer -->
      {#if gs.isExam}
        {@const m = Math.floor(gs.timerLeft/60)}
        {@const s = String(gs.timerLeft % 60).padStart(2,'0')}
        <div class="pill pill-red" class:warn={gs.timerLeft <= 120}>⏱ {m}:{s}</div>
      {/if}
      <!-- Streak -->
      {#if gs.streak >= 3}
        <div class="pill pill-org">🔥 {gs.streak}</div>
      {/if}
      <!-- Combo -->
      {#if gs.combo > 1}
        <div class="pill pill-pur">×{gs.combo} combo</div>
      {/if}
      <!-- Score -->
      <div class="pill pill-card">Score <strong>{gs.score}/{gs.idx}</strong></div>
      <div class="pill pill-acc">{gs.pts} pts</div>
    {:else}
      <!-- Level + XP bar -->
      <div class="lv-wrap">
        <div class="lv-badge syne">Niv. {lv}</div>
        <div class="xp-track">
          <div class="xp-fill" style="width:{xpPct}%"></div>
        </div>
        <div class="xp-lbl">{xp} XP</div>
      </div>
    {/if}
  </div>
</header>

<style>
  header {
    width: 100%; max-width: 740px;
    padding: 14px 16px 0;
    display: flex; justify-content: space-between; align-items: center;
    gap: 8px;
  }
  .logo {
    font-family: 'Syne', sans-serif; font-weight: 800; font-size: .9rem;
    color: var(--txt); display: flex; align-items: center; gap: 7px;
    flex-shrink: 0;
  }
  .logo-i {
    width: 28px; height: 28px; background: var(--acc); border-radius: 7px;
    display: flex; align-items: center; justify-content: center; font-size: 14px;
  }
  .hdr-r { display: flex; gap: 5px; align-items: center; flex-wrap: wrap; justify-content: flex-end }
  .icon-btn {
    background: var(--card); border: 1px solid var(--brd); border-radius: 100px;
    padding: 4px 9px; font-size: .75rem; cursor: pointer; color: var(--mut);
    transition: all .2s;
  }
  .icon-btn:hover { border-color: var(--acc); color: var(--acc) }
  .pill {
    font-family: 'Syne', sans-serif; font-weight: 700; font-size: .7rem;
    padding: 4px 10px; border-radius: 100px; white-space: nowrap;
  }
  .pill-card { background: var(--card); border: 1px solid var(--brd); color: var(--mut) }
  .pill-card strong { color: var(--txt) }
  .pill-acc  { background: rgba(59,130,246,.15); border: 1px solid rgba(59,130,246,.3); color: var(--acc) }
  .pill-org  { background: rgba(249,115,22,.15); border: 1px solid rgba(249,115,22,.3); color: var(--org) }
  .pill-pur  { background: rgba(168,85,247,.15);  border: 1px solid rgba(168,85,247,.3);  color: var(--pur) }
  .pill-red  { background: rgba(239,68,68,.15);  border: 1px solid rgba(239,68,68,.3);  color: var(--red); font-variant-numeric: tabular-nums }
  .pill-red.warn { background: rgba(239,68,68,.35); animation: blink .6s infinite alternate }
  @keyframes blink { from{opacity:1} to{opacity:.45} }

  .lv-wrap { display: flex; align-items: center; gap: 5px }
  .lv-badge {
    font-size: .7rem; font-weight: 700; padding: 3px 8px; border-radius: 100px;
    background: linear-gradient(135deg, var(--acc), var(--pur));
    color: #fff;
  }
  .xp-track {
    width: 52px; height: 4px; background: var(--brd); border-radius: 99px; overflow: hidden;
  }
  .xp-fill {
    height: 100%; background: linear-gradient(90deg, var(--acc), var(--pur));
    border-radius: 99px; transition: width .6s cubic-bezier(.4,0,.2,1);
  }
  .xp-lbl { font-size: .64rem; color: var(--mut); font-weight: 600 }

  .profile-pill {
    display: flex; align-items: center; gap: 5px;
    background: var(--card); border: 1.5px solid var(--brd);
    border-radius: 100px; padding: 3px 10px 3px 4px;
    cursor: pointer; transition: all .2s; color: var(--txt);
    font-family: 'Syne', sans-serif; font-weight: 700; font-size: .72rem;
  }
  .profile-pill:hover { border-color: var(--acc); color: var(--acc) }
  .pp-avatar { font-size: 1.1rem; line-height: 1 }
  .pp-name { max-width: 70px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap }
</style>
