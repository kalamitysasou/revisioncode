<script>
  export let history = {}

  const DAYS = 70 // 10 semaines
  const DAY_LABELS = ['L', 'M', 'M', 'J', 'V', 'S', 'D']

  function buildGrid() {
    const cells = []
    const today = new Date()
    for (let i = DAYS - 1; i >= 0; i--) {
      const d = new Date(today)
      d.setDate(d.getDate() - i)
      const key = d.toISOString().split('T')[0]
      const count = history?.[key] || 0
      const level = count === 0 ? 0 : count < 5 ? 1 : count < 10 ? 2 : count < 20 ? 3 : 4
      cells.push({ key, count, level, dow: d.getDay() })
    }
    return cells
  }

  $: cells = buildGrid()
  $: totalDays = cells.filter(c => c.count > 0).length

  function fmt(key) {
    return new Date(key).toLocaleDateString('fr-FR', { day:'numeric', month:'short' })
  }
</script>

<div class="cal-wrap">
  <div class="cal-header">
    <span class="cal-title">Activité</span>
    <span class="cal-total">{totalDays} jour{totalDays !== 1 ? 's' : ''} actif{totalDays !== 1 ? 's' : ''}</span>
  </div>
  <div class="cal-grid">
    {#each cells as c}
      <div
        class="cal-cell lv{c.level}"
        title="{fmt(c.key)} — {c.count} question{c.count !== 1 ? 's' : ''}"
      ></div>
    {/each}
  </div>
  <div class="cal-legend">
    <span>Moins</span>
    <div class="cal-cell lv0"></div>
    <div class="cal-cell lv1"></div>
    <div class="cal-cell lv2"></div>
    <div class="cal-cell lv3"></div>
    <div class="cal-cell lv4"></div>
    <span>Plus</span>
  </div>
</div>

<style>
  .cal-wrap { background: var(--card); border: 1px solid var(--brd); border-radius: var(--r); padding: 12px 14px }

  .cal-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px }
  .cal-title  { font-size: .72rem; font-weight: 700; color: var(--txt) }
  .cal-total  { font-size: .68rem; color: var(--mut) }

  .cal-grid {
    display: grid;
    grid-template-columns: repeat(10, 1fr);
    grid-auto-rows: 1fr;
    gap: 3px;
  }

  .cal-cell {
    aspect-ratio: 1;
    border-radius: 3px;
    cursor: default;
    transition: transform .1s;
  }
  .cal-cell:hover { transform: scale(1.3) }

  .lv0 { background: var(--brd) }
  .lv1 { background: rgba(59,130,246,.3) }
  .lv2 { background: rgba(59,130,246,.55) }
  .lv3 { background: rgba(59,130,246,.8) }
  .lv4 { background: var(--acc) }

  .cal-legend {
    display: flex; align-items: center; gap: 4px;
    margin-top: 8px; font-size: .6rem; color: var(--mut);
  }
  .cal-legend .cal-cell { width: 11px; height: 11px; aspect-ratio: auto; flex-shrink: 0 }
</style>
