<script>
  import { gameState } from '../../stores/game.js'
  import { fly, fade } from 'svelte/transition'

  $: achievements = $gameState.newAchievements ?? []
</script>

{#if achievements.length}
  <div class="toast-stack">
    {#each achievements as ach (ach.id)}
      <div class="toast" in:fly={{ y: -40, duration: 350 }} out:fade={{ duration: 250 }}>
        <div class="toast-icon">{ach.icon}</div>
        <div class="toast-body">
          <div class="toast-title">Badge débloqué !</div>
          <div class="toast-label">{ach.label}</div>
          <div class="toast-desc">{ach.desc}</div>
        </div>
      </div>
    {/each}
  </div>
{/if}

<style>
  .toast-stack {
    position: fixed; top: 16px; right: 16px;
    display: flex; flex-direction: column; gap: 8px;
    z-index: 999; pointer-events: none;
  }

  .toast {
    display: flex; align-items: center; gap: 12px;
    background: var(--sur); border: 1.5px solid var(--ylw);
    border-radius: 14px; padding: 12px 16px;
    box-shadow: 0 8px 28px rgba(0,0,0,.35);
    max-width: 280px; pointer-events: auto;
    animation: pop .35s cubic-bezier(.34,1.56,.64,1);
  }

  .toast-icon { font-size: 2rem; flex-shrink: 0 }

  .toast-title {
    font-size: .6rem; font-weight: 700; letter-spacing: .08em;
    text-transform: uppercase; color: var(--ylw); margin-bottom: 2px;
  }
  .toast-label {
    font-family: 'Syne', sans-serif; font-weight: 700;
    font-size: .88rem; margin-bottom: 2px;
  }
  .toast-desc { font-size: .7rem; color: var(--mut); line-height: 1.4 }

  @keyframes pop {
    from { transform: scale(.7) translateY(-10px); opacity: 0 }
    to   { transform: scale(1) translateY(0);      opacity: 1 }
  }
</style>
