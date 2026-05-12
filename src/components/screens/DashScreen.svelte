<script>
  import { screen } from '../../stores/game.js'
  import { stats, getLevelFromXP, getXPProgress, ACHIEVEMENTS, XP_PER_LEVEL } from '../../stores/stats.js'
  import { CATEGORIES } from '../../data/questions.js'
  import { fly } from 'svelte/transition'

  $: st = $stats
  $: sessions = st.sessions ?? []
  $: lv  = getLevelFromXP(st.xp ?? 0)
  $: xpPct = getXPProgress(st.xp ?? 0)
  $: nextXP = XP_PER_LEVEL[lv] ?? '∞'
  $: earned = st.achievements ?? []

  function pct(cat) {
    const tot = st.themeTotal?.[cat] || 0
    const ok  = st.themeOk?.[cat]   || 0
    return tot ? Math.round(ok/tot*100) : null
  }

  function modeIcon(m) { return {exam:'🎯',survie:'💀',anki:'🧠',hard:'⭐',errors:'🔁',practice:'📚'}[m]||'📚' }
  function modeName(m) { return {exam:'Examen blanc',survie:'Survie',anki:'Anki',hard:'Difficiles',errors:'Erreurs',practice:'Révision'}[m]||m }

  function confirmReset() {
    if (!confirm('Réinitialiser TOUTES vos statistiques ? Action irréversible.')) return
    stats.reset()
  }
</script>

<div class="dash" in:fly={{ y: 16, duration: 280 }}>
  <button class="back-btn" onclick={() => screen.set('home')}>← Retour</button>

  <!-- Level card -->
  <div class="lv-card">
    <div class="lv-left">
      <div class="lv-badge syne">Niveau {lv}</div>
      <div class="lv-xp">{st.xp ?? 0} XP · Prochain : {nextXP} XP</div>
    </div>
    <div class="lv-bar-wrap">
      <div class="lv-bar"><div class="lv-fill" style="width:{xpPct}%"></div></div>
      <div class="lv-pct">{xpPct}%</div>
    </div>
  </div>

  <!-- Global stats -->
  <div class="global-stats">
    <div class="gs-box"><div class="gs-val acc">{sessions.length}</div><div class="gs-lbl">Sessions</div></div>
    <div class="gs-box"><div class="gs-val grn">{sessions.length ? Math.round(sessions.reduce((a,s)=>a+s.pct,0)/sessions.length) : '—'}%</div><div class="gs-lbl">Moy. score</div></div>
    <div class="gs-box"><div class="gs-val org">{st.bestStreak ?? 0}</div><div class="gs-lbl">🔥 Best streak</div></div>
    <div class="gs-box"><div class="gs-val pur">{st.totalPts ?? 0}</div><div class="gs-lbl">⭐ Total pts</div></div>
  </div>

  <!-- Theme bars -->
  <p class="sect-lbl">Maîtrise par thème</p>
  <div class="theme-bars">
    {#each CATEGORIES as cat}
      {@const p = pct(cat)}
      {@const tot = st.themeTotal?.[cat] || 0}
      <div class="tbar">
        <div class="tbar-top">
          <span class="tbar-name">{cat}</span>
          <span class="tbar-pct" class:good={p>=80} class:bad={p!==null&&p<55}>{p !== null ? p+'%' : '—'}</span>
        </div>
        <div class="tbar-track">
          <div class="tbar-fill" class:good={p>=80} class:bad={p!==null&&p<55} style="width:{p??0}%"></div>
        </div>
        <div class="tbar-count">{st.themeOk?.[cat]??0}/{tot} correctes</div>
      </div>
    {/each}
  </div>

  <!-- Achievements -->
  <p class="sect-lbl">Badges</p>
  <div class="ach-grid">
    {#each ACHIEVEMENTS as a}
      <div class="ach" class:unlocked={earned.includes(a.id)} title={a.desc}>
        <div class="ach-icon">{a.icon}</div>
        <div class="ach-label">{a.label}</div>
        {#if !earned.includes(a.id)}<div class="ach-locked">🔒</div>{/if}
      </div>
    {/each}
  </div>

  <!-- Recent sessions -->
  <p class="sect-lbl">Dernières sessions</p>
  {#if sessions.length}
    <div class="sessions">
      {#each sessions.slice(0,8) as s}
        <div class="sess">
          <div>
            <div class="sess-name">{modeIcon(s.mode)} {modeName(s.mode)}</div>
            <div class="sess-meta">{s.date} · {s.pts} pts{s.maxStreak ? ` · 🔥${s.maxStreak}`:''}</div>
          </div>
          <div class="sess-score" class:pass={s.pct>=80} class:med={s.pct>=55&&s.pct<80} class:fail={s.pct<55}>
            {s.mode==='exam' ? `${s.score}/40` : `${s.pct}%`}
          </div>
        </div>
      {/each}
    </div>
  {:else}
    <div class="no-data">📊 Aucune session pour l'instant</div>
  {/if}

  <button class="btn-reset" onclick={confirmReset}>🗑 Réinitialiser mes statistiques</button>
</div>

<style>
  .dash { display: flex; flex-direction: column; gap: 14px; padding-top: 8px }
  .back-btn { background: none; border: none; color: var(--mut); font-size: .82rem; cursor: pointer; padding: 0; text-align: left; margin-bottom: 2px }
  .back-btn:hover { color: var(--acc) }
  .sect-lbl { font-size: .66rem; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; color: var(--mut) }

  /* Level */
  .lv-card {
    background: linear-gradient(135deg, rgba(59,130,246,.12), rgba(168,85,247,.08));
    border: 1px solid rgba(59,130,246,.25); border-radius: var(--r); padding: 14px 16px;
    display: flex; align-items: center; gap: 12px; flex-wrap: wrap;
  }
  .lv-left { flex-shrink: 0 }
  .lv-badge {
    display: inline-block; background: linear-gradient(135deg, var(--acc), var(--pur));
    color: #fff; border-radius: 99px; padding: 4px 14px; font-size: .84rem; font-weight: 700; margin-bottom: 4px;
  }
  .lv-xp { font-size: .7rem; color: var(--mut) }
  .lv-bar-wrap { flex: 1; min-width: 120px }
  .lv-bar { height: 7px; background: var(--brd); border-radius: 99px; overflow: hidden; margin-bottom: 4px }
  .lv-fill { height: 100%; background: linear-gradient(90deg, var(--acc), var(--pur)); border-radius: 99px; transition: width .8s cubic-bezier(.4,0,.2,1) }
  .lv-pct { font-size: .68rem; color: var(--acc); font-weight: 600; text-align: right }

  /* Global stats */
  .global-stats { display: grid; grid-template-columns: repeat(4,1fr); gap: 7px }
  .gs-box { background: var(--card); border: 1px solid var(--brd); border-radius: var(--r); padding: 11px 5px; text-align: center }
  .gs-val { font-family: 'Syne', sans-serif; font-weight: 800; font-size: 1.3rem; margin-bottom: 2px }
  .gs-val.acc { color: var(--acc) } .gs-val.grn { color: var(--grn) } .gs-val.org { color: var(--org) } .gs-val.pur { color: var(--pur) }
  .gs-lbl { font-size: .63rem; color: var(--mut) }

  /* Theme bars */
  .theme-bars { display: flex; flex-direction: column; gap: 7px }
  .tbar { background: var(--card); border: 1px solid var(--brd); border-radius: 9px; padding: 10px 12px }
  .tbar-top { display: flex; justify-content: space-between; margin-bottom: 6px }
  .tbar-name { font-size: .8rem; font-weight: 600 }
  .tbar-pct  { font-family: 'Syne', sans-serif; font-weight: 700; font-size: .78rem; color: var(--acc) }
  .tbar-pct.good { color: var(--grn) } .tbar-pct.bad { color: var(--red) }
  .tbar-track { height: 5px; background: var(--brd); border-radius: 99px; overflow: hidden }
  .tbar-fill { height: 100%; border-radius: 99px; background: linear-gradient(90deg, var(--acc), #818cf8); transition: width .8s cubic-bezier(.4,0,.2,1) }
  .tbar-fill.good { background: linear-gradient(90deg, var(--grn), #4ade80) }
  .tbar-fill.bad  { background: linear-gradient(90deg, var(--red), var(--org)) }
  .tbar-count { font-size: .65rem; color: var(--mut); margin-top: 4px }

  /* Achievements */
  .ach-grid { display: grid; grid-template-columns: repeat(5,1fr); gap: 7px }
  .ach {
    background: var(--card); border: 1.5px solid var(--brd); border-radius: 10px;
    padding: 8px 4px; text-align: center; position: relative;
    filter: grayscale(1) opacity(.35); transition: all .2s; cursor: default;
  }
  .ach.unlocked { filter: none; border-color: var(--ylw); background: rgba(234,179,8,.1) }
  .ach-icon  { font-size: 1.4rem; line-height: 1; margin-bottom: 3px }
  .ach-label { font-size: .6rem; color: var(--mut); line-height: 1.3 }
  .ach-locked { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; font-size: .7rem; background: rgba(0,0,0,.3); border-radius: 8px }

  /* Sessions */
  .sessions { display: flex; flex-direction: column; gap: 6px }
  .sess {
    background: var(--card); border: 1px solid var(--brd); border-radius: 9px;
    padding: 10px 12px; display: flex; justify-content: space-between; align-items: center;
  }
  .sess-name { font-size: .79rem; font-weight: 600; margin-bottom: 2px }
  .sess-meta { font-size: .68rem; color: var(--mut) }
  .sess-score { font-family: 'Syne', sans-serif; font-weight: 700; font-size: .88rem }
  .sess-score.pass { color: var(--grn) } .sess-score.fail { color: var(--red) } .sess-score.med { color: var(--org) }

  .no-data { text-align: center; padding: 24px; color: var(--mut); font-size: .85rem }

  .btn-reset {
    width: 100%; padding: 11px; background: var(--card); border: 1.5px solid var(--brd);
    border-radius: 9px; font-family: 'Syne', sans-serif; font-weight: 600; font-size: .8rem;
    color: var(--mut); cursor: pointer; transition: all .2s;
  }
  .btn-reset:hover { border-color: var(--red); color: var(--red) }
</style>
