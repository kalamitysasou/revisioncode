<script>
  import { fly } from 'svelte/transition'
  import { screen, gameState } from '../../stores/game.js'
  import { stats } from '../../stores/stats.js'
  import { currentProfile } from '../../stores/profiles.js'
  import { EMC_CHAPITRES, EMC_BANQUE } from '../../data/emc.js'
  import { beep } from '../../lib/sound.js'
  import { shuffle } from '../../lib/anki.js'

  $: st = $stats
  $: profile = $currentProfile

  function chapterCount(id) {
    return EMC_BANQUE.filter(q => q.c === id).length
  }

  function chapterDone(id) {
    const total = chapterCount(id)
    if (!total) return 0
    const ok = st.themeOk?.[id] || 0
    return Math.min(100, Math.round(ok / total * 100))
  }

  $: doneChapters = EMC_CHAPITRES.filter(ch => chapterDone(ch.id) >= 80).length
  $: totalChapters = EMC_CHAPITRES.length
  $: globalPct = Math.round(doneChapters / totalChapters * 100)

  $: profileDesc = doneChapters === 0
    ? 'Tu découvres les fondements de la République.'
    : doneChapters < totalChapters
    ? `Tu progresses bien — encore ${totalChapters - doneChapters} chapitre(s) à maîtriser !`
    : 'Tu maîtrises tous les chapitres EMC. Félicitations !'

  function launchChapter(chapterId) {
    const qs = shuffle(EMC_BANQUE.filter(q => q.c === chapterId))
    if (!qs.length) return
    beep('click')
    gameState.set({
      mode: 'practice',
      questions: qs,
      idx: 0, score: 0, errors: 0,
      pts: 0, xpEarned: 0,
      streak: 0, maxStreak: 0, combo: 1,
      lives: 3, answered: false, hintUsed: false,
      selected: [], qStart: Date.now(),
      timerLeft: 0, results: [],
      isExam: false, isSurvie: false, isAnki: false,
      newAchievements: [],
    })
    screen.set('quiz')
  }
</script>

<div class="emc-home" in:fly={{ y: 16, duration: 300 }}>

  <!-- Profile progress card -->
  <div class="profile-card">
    <div class="pc-left">
      <div class="pc-avatar">🌱</div>
      <div class="pc-info">
        <div class="pc-name">{profile?.name ?? 'Mon profil'}</div>
        <div class="pc-desc">{profileDesc}</div>
      </div>
    </div>
    <div class="pc-progress">
      <span class="pc-fraction">{doneChapters}/{totalChapters} chapitres</span>
      <div class="pc-bar">
        <div class="pc-fill" style="width:{globalPct}%"></div>
      </div>
    </div>
  </div>

  <!-- Chapter list -->
  <p class="sect-lbl">{totalChapters} chapitres disponibles</p>

  <div class="chapters">
    {#each EMC_CHAPITRES as ch}
      {@const pct = chapterDone(ch.id)}
      <button class="chapter-card" onclick={() => launchChapter(ch.id)}>
        <div class="ch-icon">{ch.icon}</div>
        <div class="ch-info">
          <div class="ch-title syne">{ch.title}</div>
          <div class="ch-meta">{chapterCount(ch.id)} questions</div>
        </div>
        {#if pct > 0}
          <div class="ch-badge" class:done={pct >= 80}>{pct}%</div>
        {/if}
      </button>
    {/each}
  </div>

</div>

<style>
  .emc-home { display: flex; flex-direction: column; gap: 14px; padding-top: 8px }

  .profile-card {
    background: var(--card); border: 1.5px solid var(--brd);
    border-radius: var(--r); padding: 14px 16px;
    display: flex; flex-direction: column; gap: 12px;
  }
  .pc-left { display: flex; align-items: center; gap: 12px }
  .pc-avatar { font-size: 2rem; line-height: 1 }
  .pc-name {
    font-family: 'Syne', sans-serif; font-weight: 800;
    font-size: 1rem; color: var(--txt); margin-bottom: 3px;
  }
  .pc-desc { font-size: .75rem; color: var(--mut); line-height: 1.5 }

  .pc-fraction { font-size: .72rem; font-weight: 600; color: var(--acc); margin-bottom: 5px; display: block }
  .pc-bar { height: 5px; background: var(--brd); border-radius: 99px; overflow: hidden }
  .pc-fill { height: 100%; background: linear-gradient(90deg, var(--acc), var(--pur)); border-radius: 99px; transition: width .5s ease }

  .sect-lbl {
    font-size: .66rem; font-weight: 700; letter-spacing: .08em;
    text-transform: uppercase; color: var(--mut);
  }

  .chapters { display: flex; flex-direction: column; gap: 10px }

  .chapter-card {
    background: var(--card); border: 1.5px solid var(--brd);
    border-radius: var(--r); padding: 16px;
    display: flex; align-items: center; gap: 14px;
    cursor: pointer; transition: all .2s; text-align: left;
    color: var(--txt); width: 100%;
    position: relative;
  }
  .chapter-card:hover { border-color: var(--acc); transform: translateY(-2px) }

  .ch-icon { font-size: 1.8rem; line-height: 1; flex-shrink: 0 }
  .ch-title { font-weight: 700; font-size: .9rem; color: var(--acc); margin-bottom: 3px }
  .ch-meta  { font-size: .72rem; color: var(--mut) }

  .ch-badge {
    margin-left: auto; flex-shrink: 0;
    font-size: .65rem; font-weight: 700;
    padding: 3px 9px; border-radius: 99px;
    background: rgba(59,130,246,.12); color: var(--acc);
    border: 1px solid rgba(59,130,246,.25);
  }
  .ch-badge.done {
    background: rgba(34,197,94,.12); color: var(--grn);
    border-color: rgba(34,197,94,.3);
  }
</style>
