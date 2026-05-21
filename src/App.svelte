<script>
  import { screen, gameState } from './stores/game.js'
  import { stats, setStatsProfile } from './stores/stats.js'
  import { profiles, currentProfile } from './stores/profiles.js'
  import { fade } from 'svelte/transition'
  import Header from './components/Header.svelte'
  import ProfileScreen from './components/screens/ProfileScreen.svelte'
  import HomeScreen from './components/screens/HomeScreen.svelte'
  import QuizScreen from './components/screens/QuizScreen.svelte'
  import ResultsScreen from './components/screens/ResultsScreen.svelte'
  import DashScreen from './components/screens/DashScreen.svelte'
  import HardScreen from './components/screens/HardScreen.svelte'
  import AchievementToast from './components/ui/AchievementToast.svelte'

  // When profile changes, reload stats for that profile
  $: if ($profiles.currentId) {
    setStatsProfile($profiles.currentId)
  }

  $: if ($stats) {
    document.body.classList.toggle('light', !$stats.dark)
  }

  $: hasProfile = !!$profiles.currentId && !!$currentProfile
</script>

{#if !hasProfile}
  <div transition:fade={{ duration: 200 }}>
    <ProfileScreen />
  </div>
{:else}
  <Header />

  <main class="layout">
    {#if $screen === 'home'}
      <div transition:fade={{ duration: 200 }}>
        <HomeScreen />
      </div>
    {:else if $screen === 'quiz'}
      <div transition:fade={{ duration: 150 }}>
        <QuizScreen />
      </div>
    {:else if $screen === 'results'}
      <div transition:fade={{ duration: 200 }}>
        <ResultsScreen />
      </div>
    {:else if $screen === 'dash'}
      <div transition:fade={{ duration: 200 }}>
        <DashScreen />
      </div>
    {:else if $screen === 'hard'}
      <div transition:fade={{ duration: 200 }}>
        <HardScreen />
      </div>
    {/if}
  </main>

  {#if $gameState.newAchievements.length}
    <AchievementToast />
  {/if}
{/if}

<style>
  main {
    padding: 12px 16px 80px;
    flex: 1;
    width: 100%;
    max-width: 740px;
    margin: 0 auto;
  }
</style>
