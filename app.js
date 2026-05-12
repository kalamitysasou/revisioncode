// ===== PERSISTENCE =====
const SK = 'cdr_v5';
let stats = (() => {
  try {
    const r = JSON.parse(localStorage.getItem(SK) || '{}');
    return {
      sessions:     r.sessions     || [],
      themeOk:      r.themeOk      || {},
      themeTotal:   r.themeTotal   || {},
      hardIds:      new Set(r.hardIds || []),
      wrongCount:   r.wrongCount   || {},
      anki:         r.anki         || {},
      bestStreak:   r.bestStreak   || 0,
      totalPts:     r.totalPts     || 0,
      daily:        r.daily        || { date: '', count: 0 },
      sound:        r.sound        !== false,
      dark:         r.dark         !== false,
    };
  } catch { return mkStats(); }
})();

function mkStats() {
  return { sessions:[], themeOk:{}, themeTotal:{}, hardIds:new Set(),
           wrongCount:{}, anki:{}, bestStreak:0, totalPts:0,
           daily:{date:'',count:0}, sound:true, dark:true };
}
function save() {
  localStorage.setItem(SK, JSON.stringify({ ...stats, hardIds:[...stats.hardIds] }));
}

// ===== SOUND =====
let ctx = null;
function beep(type) {
  if (!stats.sound) return;
  try {
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.connect(g); g.connect(ctx.destination);
    const t = ctx.currentTime;
    if (type === 'ok')     { o.type='sine';     o.frequency.value=880; g.gain.setValueAtTime(.12,t); g.gain.exponentialRampToValueAtTime(.001,t+.3); }
    if (type === 'err')    { o.type='sawtooth'; o.frequency.value=200; g.gain.setValueAtTime(.12,t); g.gain.exponentialRampToValueAtTime(.001,t+.35); }
    if (type === 'streak') { o.type='sine';     o.frequency.value=1046;g.gain.setValueAtTime(.09,t); g.gain.exponentialRampToValueAtTime(.001,t+.5); }
    if (type === 'click')  { o.type='sine';     o.frequency.value=440; g.gain.setValueAtTime(.04,t); g.gain.exponentialRampToValueAtTime(.001,t+.08); }
    o.start(t); o.stop(t + .6);
  } catch {}
}

// ===== STATE =====
let st = {
  mode: 'practice', selTheme: 'all',
  questions: [], idx: 0,
  score: 0, errors: 0, pts: 0,
  streak: 0, maxStreak: 0,
  lives: 3, answered: false, hintUsed: false,
  selected: new Set(), qStart: 0,
  timerLeft: 0, timerInterval: null,
  results: [],
  isExam: false, isSurvie: false, isAnki: false,
};

// ===== THEME TOGGLE =====
function toggleTheme() {
  stats.dark = !stats.dark;
  applyTheme(); save();
}
function applyTheme() {
  document.body.classList.toggle('light', !stats.dark);
  document.getElementById('themeToggle').textContent = stats.dark ? '☀️' : '🌙';
}

// ===== SOUND TOGGLE =====
function toggleSound() {
  stats.sound = !stats.sound;
  document.getElementById('soundBtn').textContent = stats.sound ? '🔔' : '🔕';
  save();
}

// ===== TABS =====
function switchTab(tab) {
  document.querySelectorAll('.tab').forEach((b, i) =>
    b.classList.toggle('active', ['home','dash','hard'][i] === tab));
  const s = document.getElementById('startScreen');
  const d = document.getElementById('dashScreen');
  const h = document.getElementById('hardScreen');
  s.style.display = tab==='home' ? '' : 'none';
  d.style.display = tab==='dash' ? '' : 'none';
  h.style.display = tab==='hard' ? '' : 'none';
  if (tab==='dash') renderDash();
  if (tab==='hard') renderHard();
}

// ===== MODE SELECTION =====
let currentMode = 'practice';
function selectMode(el, mode) {
  document.querySelectorAll('.mode-card[data-mode]').forEach(c => c.classList.remove('active'));
  el.classList.add('active');
  currentMode = mode;
  const isExam = mode === 'exam';
  document.getElementById('themeLbl').textContent = isExam
    ? 'Thème (examen blanc = tous les thèmes)' : 'Thème (révision libre)';
  const btn = document.getElementById('btnGo');
  btn.className = 'btn-go' + (isExam ? ' exam' : '');
  btn.textContent = isExam ? "Commencer l'examen blanc →" : 'Commencer →';
  document.querySelectorAll('.tc').forEach(tc => {
    tc.style.opacity = isExam ? '.3' : '1';
    tc.style.pointerEvents = isExam ? 'none' : '';
  });
}

// Theme chips
document.querySelectorAll('.tc').forEach(tc => {
  tc.addEventListener('click', () => {
    if (currentMode === 'exam') return;
    document.querySelectorAll('.tc').forEach(x => x.classList.remove('active'));
    tc.classList.add('active');
    st.selTheme = tc.dataset.t;
  });
});

// ===== ANKI (SM-2 simplifié) =====
function ankiDue() {
  const today = new Date().toISOString().split('T')[0];
  return BANQUE.filter(q => {
    const a = stats.anki[q._id];
    return !a || a.next <= today;
  });
}
function ankiUpdate(id, correct) {
  const a = stats.anki[id] || { interval: 1, ease: 2.5 };
  if (correct) { a.interval = Math.round(a.interval * a.ease); a.ease = Math.min(3, a.ease + .1); }
  else         { a.interval = 1; a.ease = Math.max(1.3, a.ease - .2); }
  const d = new Date(); d.setDate(d.getDate() + a.interval);
  a.next = d.toISOString().split('T')[0];
  stats.anki[id] = a;
}

// ===== SHUFFLE =====
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ===== BUILD SETS =====
function buildSet(mode) {
  if (mode === 'exam')    return shuffle(BANQUE).slice(0, 40);
  if (mode === 'survie')  return shuffle(BANQUE);
  if (mode === 'anki')    return shuffle(ankiDue()).slice(0, 20);
  if (mode === 'hard')    return shuffle(BANQUE.filter(q => stats.hardIds.has(q._id)));
  if (mode === 'errors')  return st.results.filter(r => !r.ok).map(r => r.q);
  // practice
  const theme = st.selTheme;
  const pool = theme === 'all' ? BANQUE : BANQUE.filter(q => q.c === theme);
  return shuffle(pool).slice(0, 15);
}

// ===== LAUNCH =====
function startSession()  { launch('practice'); }
function startSurvie()   { launch('survie'); }
function playAnki()      {
  if (!ankiDue().length) { alert('🧠 Toutes vos questions sont à jour ! Revenez demain.'); return; }
  launch('anki');
}
function playHard()      {
  if (!stats.hardIds.size) { alert('Aucune question difficile marquée !'); return; }
  launch('hard');
}
function replayErrors()  { launch('errors'); }

function launch(mode) {
  beep('click');
  const qs = buildSet(mode);
  if (!qs.length) { alert('Aucune question disponible dans ce thème !'); return; }

  st.mode = mode;
  st.questions = qs;
  st.idx = 0; st.score = 0; st.errors = 0;
  st.pts = 0; st.streak = 0; st.maxStreak = 0;
  st.lives = 3; st.results = [];
  st.isExam = mode === 'exam';
  st.isSurvie = mode === 'survie';
  st.isAnki = mode === 'anki';

  // Screens
  ['startScreen','resultsScreen'].forEach(id => el(id).style.display = 'none');
  el('quizScreen').style.display = 'block';
  el('examBanner').style.display = st.isExam ? 'block' : 'none';
  el('mainTabs').style.display = 'none';
  el('liveBar').style.display = st.isSurvie ? 'flex' : 'none';

  // Timer
  if (st.isExam) {
    st.timerLeft = 40 * 60;
    el('timerPill').style.display = 'flex';
    startTimer();
  } else {
    el('timerPill').style.display = 'none';
    stopTimer();
  }

  el('progFill').className = 'prog-fill' + (st.isExam ? ' exam-mode' : '');
  updateHeader();
  renderQ();
}

// ===== TIMER =====
function startTimer() {
  stopTimer();
  st.timerInterval = setInterval(() => {
    st.timerLeft--;
    const m = Math.floor(st.timerLeft / 60), s = st.timerLeft % 60;
    const pill = el('timerPill');
    pill.textContent = `⏱ ${m}:${String(s).padStart(2,'0')}`;
    pill.classList.toggle('warn', st.timerLeft <= 120);
    if (st.timerLeft <= 0) { stopTimer(); showResults(); }
  }, 1000);
}
function stopTimer() {
  if (st.timerInterval) { clearInterval(st.timerInterval); st.timerInterval = null; }
}

// ===== RENDER QUESTION =====
function renderQ() {
  const q = st.questions[st.idx];
  if (!q) { showResults(); return; }

  st.answered = false; st.hintUsed = false; st.selected = new Set();
  st.qStart = Date.now();

  const total = st.questions.length, num = st.idx + 1;
  const pct = Math.round((st.idx / total) * 100);
  el('progLbl').textContent = `Q ${num}/${total}`;
  el('progPct').textContent = `${pct}%`;
  el('progFill').style.width = `${pct}%`;
  el('qNum').textContent = `Question ${num}`;
  el('qText').textContent = q.q;
  el('catTag').textContent = `${q.e || '📌'} ${q.c}`;
  el('multiTag').style.display = q.m ? 'inline-flex' : 'none';
  el('ptsTag').textContent = `+${q.m ? 15 : 10} pts`;

  const vis = el('qVisual');
  if (q.s && SVG[q.s]) { vis.style.display = 'flex'; vis.innerHTML = SVG[q.s]; }
  else { vis.style.display = 'none'; vis.innerHTML = ''; }

  const isStarred = stats.hardIds.has(q._id);
  el('btnStar').className = 'btn-star' + (isStarred ? ' starred' : '');

  el('btnHint').disabled = st.isExam;
  el('btnHint').style.display = st.isExam ? 'none' : '';

  // Options
  const opts = el('optsList');
  opts.innerHTML = '';
  const ltrs = ['A','B','C','D','E','F'];
  q.o.forEach((txt, i) => {
    const btn = document.createElement('button');
    btn.className = 'opt';
    btn.innerHTML = q.m
      ? `<span class="opt-cb"></span><span>${txt}</span>`
      : `<span class="opt-ltr">${ltrs[i]}</span><span>${txt}</span>`;
    btn.addEventListener('click', () => pickOpt(btn, i));
    opts.appendChild(btn);
  });

  el('fbBox').style.display = 'none';
  el('fbBox').className = 'fb';
  el('btnValidate').style.display = q.m ? 'flex' : 'none';
  el('btnNext').style.display = 'none';

  if (st.isSurvie) renderLives();

  const card = el('qCard');
  card.className = 'q-card' + (st.isExam ? ' exam-mode' : '');
}

function renderLives() {
  el('livesDisplay').textContent = '❤️'.repeat(st.lives) + '🖤'.repeat(3 - st.lives);
}

// ===== PICK OPTION =====
function pickOpt(btn, idx) {
  if (st.answered) return;
  beep('click');
  const q = st.questions[st.idx];
  if (q.m) {
    if (st.selected.has(idx)) {
      st.selected.delete(idx);
      btn.classList.remove('selected');
      btn.querySelector('.opt-cb').textContent = '';
    } else {
      st.selected.add(idx);
      btn.classList.add('selected');
      btn.querySelector('.opt-cb').textContent = '✓';
    }
  } else {
    checkAnswer([idx]);
  }
}

function validateMulti() {
  if (st.answered || !st.selected.size) return;
  checkAnswer([...st.selected]);
}

// ===== CHECK ANSWER =====
function checkAnswer(chosen) {
  const q = st.questions[st.idx];
  st.answered = true;

  const isOk = chosen.length === q.r.length
    && chosen.every(i => q.r.includes(i))
    && q.r.every(i => chosen.includes(i));
  const isPartial = !isOk && chosen.some(i => q.r.includes(i));
  const fast = (Date.now() - st.qStart) < 8000;

  let earned = 0;
  if (isOk) {
    earned = q.m ? 15 : 10;
    if (fast) earned += 5;
    st.score++; st.streak++;
    if (st.streak > st.maxStreak) st.maxStreak = st.streak;
    if (st.streak > stats.bestStreak) stats.bestStreak = st.streak;
    ankiUpdate(q._id, true);
    beep('ok');
    if (st.streak >= 3 && st.streak % 3 === 0) { showStreakPop(st.streak); beep('streak'); }
  } else {
    st.errors++; st.streak = 0;
    stats.wrongCount[q._id] = (stats.wrongCount[q._id] || 0) + 1;
    if (stats.wrongCount[q._id] >= 2) stats.hardIds.add(q._id);
    ankiUpdate(q._id, false);
    beep('err');
    if (st.isSurvie) { st.lives--; renderLives(); }
  }

  st.pts += earned;

  // Daily
  const today = new Date().toISOString().split('T')[0];
  if (stats.daily.date !== today) stats.daily = { date: today, count: 0 };
  stats.daily.count++;
  save();
  updateDailyGoal();

  // Theme stats
  stats.themeTotal[q.c] = (stats.themeTotal[q.c] || 0) + 1;
  if (isOk) stats.themeOk[q.c] = (stats.themeOk[q.c] || 0) + 1;

  // Colorize options
  const btns = [...document.querySelectorAll('.opt')];
  btns.forEach((b, i) => {
    b.disabled = true;
    const right = q.r.includes(i), sel = chosen.includes(i);
    if (right && sel)   b.classList.add('correct');
    else if (right)     b.classList.add('missed');
    else if (sel)       b.classList.add('wrong');
    else                b.classList.add('revealed');
  });

  // Card animation
  const card = el('qCard');
  card.classList.add(isOk ? 'correct-anim' : 'wrong-anim');
  setTimeout(() => card.classList.remove('correct-anim','wrong-anim'), 400);

  // Feedback (not in exam)
  if (!st.isExam) {
    const fb = el('fbBox');
    fb.className = `fb ${isOk ? 'correct' : isPartial ? 'partial' : 'wrong'}`;
    const icon  = isOk ? '✅' : isPartial ? '⚠️' : '❌';
    const title = isOk
      ? ('Bonne réponse !' + (fast ? ' 🚀 Bonus rapidité !' : ''))
      : isPartial ? 'Partiellement correct' : 'Mauvaise réponse';
    fb.innerHTML = `<strong>${icon} ${title}</strong>${q.x}`;
    fb.style.display = 'block';
  }

  st.results.push({ q, ok: isOk, chosen, pts: earned });

  updateHeader();
  el('btnValidate').style.display = 'none';
  el('btnNext').style.display = 'flex';

  if (st.isSurvie && st.lives <= 0) {
    setTimeout(() => {
      saveSession();
      showResults();
    }, 900);
  }
}

// ===== HINT =====
function useHint() {
  if (st.answered || st.hintUsed || st.isExam) return;
  st.hintUsed = true;
  el('btnHint').disabled = true;
  const q = st.questions[st.idx];
  const wrongs = q.o.map((_,i) => i).filter(i => !q.r.includes(i));
  const pick = wrongs[Math.floor(Math.random() * wrongs.length)];
  const btns = [...document.querySelectorAll('.opt')];
  if (btns[pick]) { btns[pick].classList.add('revealed'); btns[pick].disabled = true; }
}

// ===== STAR =====
function toggleStar() {
  const q = st.questions[st.idx];
  if (stats.hardIds.has(q._id)) {
    stats.hardIds.delete(q._id);
    el('btnStar').className = 'btn-star';
  } else {
    stats.hardIds.add(q._id);
    el('btnStar').className = 'btn-star starred';
  }
  save();
}

// ===== NEXT =====
function nextQ() {
  beep('click');
  st.idx++;
  if (st.idx >= st.questions.length) { saveSession(); showResults(); return; }
  renderQ();
}

// ===== SAVE SESSION =====
function saveSession() {
  const answered = st.results.length;
  const pct = answered ? Math.round(st.score / answered * 100) : 0;
  stats.sessions.unshift({
    date: new Date().toLocaleDateString('fr-FR'),
    mode: st.mode,
    score: st.score,
    total: answered,
    pts: st.pts,
    maxStreak: st.maxStreak,
    pct,
  });
  if (stats.sessions.length > 60) stats.sessions.pop();
  stats.totalPts += st.pts;
  save();
}

// ===== RESULTS =====
function showResults() {
  stopTimer();
  el('quizScreen').style.display = 'none';
  el('timerPill').style.display = 'none';
  el('mainTabs').style.display = 'flex';

  const answered = st.results.length;
  const pct = answered ? Math.round(st.score / answered * 100) : 0;

  // Circle label
  const circleText = st.isExam ? `${st.score}/40` : `${pct}%`;
  el('resPct').textContent = circleText;

  const pass = st.isExam ? st.score >= 35 : pct >= 80;
  const med  = !pass && (st.isExam ? st.score >= 28 : pct >= 55);
  el('resCircle').className = `res-circle ${pass ? 'pass' : med ? 'med' : 'fail'}`;

  // Title / sub
  let title, sub;
  if (st.isSurvie) {
    title = `💀 Survie terminée — ${st.score} questions réussies`;
    sub   = `Vies perdues : ${3 - st.lives}/3 · Streak max : ${st.maxStreak} 🔥`;
  } else if (st.isExam) {
    if (pass) { title='✅ Reçu !'; sub=`${st.score}/40 — Seuil de 35/40 atteint. Félicitations !`; }
    else if (med) { title='⚠️ Presque !'; sub=`${st.score}/40 — Il manque ${35-st.score} point(s). Continuez !`; }
    else { title='❌ Non reçu'; sub=`${st.score}/40 — Révisez les thèmes faibles avant de recommencer.`; }
  } else {
    if (pass) { title='🎉 Excellent !'; sub=`${pct}% de bonnes réponses. Bravo !`; }
    else if (med) { title='📚 Bien !'; sub=`${pct}% — Continuez à réviser les points faibles.`; }
    else { title='💪 À travailler'; sub=`${pct}% — Ne vous découragez pas, réessayez !`; }
  }

  el('resTitle').textContent = title;
  el('resSub').textContent = sub;
  el('stOk').textContent = st.score;
  el('stErr').textContent = st.errors;
  el('stPts').textContent = st.pts;
  el('stStreak').textContent = st.maxStreak;
  el('btnReplay').style.display = st.results.some(r => !r.ok) ? '' : 'none';
  el('reviewSection').style.display = 'none';
  el('resultsScreen').style.display = 'block';
  updateAnkiCount();
}

// ===== REVIEW =====
function toggleReview() {
  const sec = el('reviewSection');
  if (sec.style.display === 'none') { buildReview(); sec.style.display = 'block'; }
  else sec.style.display = 'none';
}
function buildReview() {
  const sec = el('reviewSection');
  const ltrs = ['A','B','C','D','E','F'];
  sec.innerHTML = `<div class="review-title">📋 Détail des réponses <span style="color:var(--mut);font-weight:400;font-size:.78rem">(${st.results.length})</span></div>`;
  st.results.forEach((res, n) => {
    const q = res.q;
    const div = document.createElement('div');
    div.className = `review-item ${res.ok ? 'ci' : 'wi'}`;
    const ansHtml = q.o.map((opt, j) => {
      const right = q.r.includes(j), sel = res.chosen.includes(j);
      if (!right && !sel) return '';
      return `<div class="review-ans ${right ? 'good' : 'bad'}">${right ? '✅' : '❌'} ${ltrs[j]}. ${opt}</div>`;
    }).join('');
    div.innerHTML = `
      <div class="review-cat">${q.e || '📌'} ${q.c}</div>
      <div class="review-q">${n+1}. ${q.q}</div>
      ${ansHtml}
      ${!st.isExam && q.x ? `<div class="review-exp">💡 ${q.x}</div>` : ''}`;
    sec.appendChild(div);
  });
}

// ===== RESET =====
function resetApp() {
  beep('click');
  stopTimer();
  ['resultsScreen','quizScreen','examBanner'].forEach(id => el(id).style.display = 'none');
  el('timerPill').style.display = 'none';
  el('liveBar').style.display = 'none';
  el('startScreen').style.display = '';
  el('mainTabs').style.display = 'flex';
  el('sBadge').textContent = '0/0';
  el('ptsPill').textContent = '0 pts';
  el('streakPill').style.display = 'none';
  updateDailyGoal();
  updateAnkiCount();
}

// ===== DASHBOARD =====
function renderDash() {
  const s = stats.sessions;
  el('gsTotal').textContent = s.length;
  el('gsAvg').textContent   = s.length ? Math.round(s.reduce((a,x)=>a+x.pct,0)/s.length)+'%' : '—';
  el('gsStreak').textContent = stats.bestStreak;
  el('dashSub').textContent = s.length
    ? `${s.length} session(s) · ${stats.totalPts} points cumulés`
    : 'Aucune session enregistrée pour l\'instant';

  // Theme bars
  const cats = ['Signalisation','Priorités','Vitesse','Alcool','Stationnement','Sécurité','Conduite','Autoroute','Documents','Éclairages','Environnement'];
  el('themeBars').innerHTML = cats.map(cat => {
    const tot = stats.themeTotal[cat] || 0;
    const ok  = stats.themeOk[cat]   || 0;
    const pct = tot ? Math.round(ok/tot*100) : 0;
    const cls = pct >= 80 ? 'good' : pct >= 55 ? '' : (tot ? 'bad' : '');
    return `<div class="tbar">
      <div class="tbar-top"><span class="tbar-name">${cat}</span><span class="tbar-pct">${tot?pct+'%':'—'}</span></div>
      <div class="tbar-track"><div class="tbar-fill ${cls}" style="width:${pct}%"></div></div>
      <div class="tbar-count">${ok}/${tot} correctes</div>
    </div>`;
  }).join('');

  // Last 5 sessions
  el('sessionsList').innerHTML = s.length
    ? s.slice(0,5).map(x => sessRow(x)).join('')
    : '<div class="no-data"><div class="no-data-icon">📊</div>Aucune session encore</div>';

  // Top 5 by pts
  const top5 = [...s].sort((a,b)=>b.pts-a.pts).slice(0,5);
  el('topScoresList').innerHTML = top5.length
    ? top5.map((x,i)=>sessRow(x,['🥇','🥈','🥉','4️⃣','5️⃣'][i])).join('')
    : '<div style="text-align:center;color:var(--mut);font-size:.8rem;padding:12px">Aucun score encore</div>';

  // Best survie
  const survies = s.filter(x=>x.mode==='survie');
  const bsEl = el('bestSurvieEl');
  if (survies.length) {
    bsEl.style.display='block';
    bsEl.textContent=`💀 Meilleur score Survie : ${Math.max(...survies.map(x=>x.score))} réponses`;
  } else bsEl.style.display='none';
}

function sessRow(s, prefix='') {
  const icon = {exam:'🎯',survie:'💀',anki:'🧠',hard:'⭐',errors:'🔁',practice:'📚'}[s.mode]||'📚';
  const name = {exam:'Examen blanc',survie:'Survie',anki:'Anki',hard:'Difficiles',errors:'Erreurs',practice:'Révision'}[s.mode]||s.mode;
  const cls  = s.pct>=80?'pass':s.pct>=55?'med':'fail';
  const score= s.mode==='exam'?`${s.score}/40`:`${s.pct}%`;
  return `<div class="sess-item">
    <div>
      <div class="sess-left">${prefix||icon} ${name}</div>
      <div class="sess-date">${s.date} · ${s.pts} pts${s.maxStreak?` · 🔥${s.maxStreak}`:''}</div>
    </div>
    <div class="sess-score ${cls}">${score}</div>
  </div>`;
}

// ===== HARD LIST =====
function renderHard() {
  const ids = [...stats.hardIds];
  const list = el('hardList');
  updateAnkiCount();
  if (!ids.length) {
    list.innerHTML = '<div class="no-data"><div class="no-data-icon">⭐</div>Aucune question difficile marquée.<br><small style="color:var(--mut)">Cliquez ⭐ pendant la révision pour marquer une question.</small></div>';
    el('btnPlayHard').style.display = 'none';
    return;
  }
  el('btnPlayHard').style.display = '';
  list.innerHTML = ids.slice(0,20).map(id => {
    const q = BANQUE[id]; if (!q) return '';
    const wc = stats.wrongCount[id] || 0;
    return `<div class="review-item wi">
      <div class="review-cat">${q.e||'📌'} ${q.c}${wc>=2?`<span class="hard-badge">❌ ${wc}× raté</span>`:''}</div>
      <div class="review-q">${q.q}</div>
      <div style="display:flex;justify-content:flex-end;margin-top:6px">
        <button onclick="removeHard(${id})" style="font-size:.7rem;background:none;border:none;color:var(--mut);cursor:pointer">✕ Retirer</button>
      </div>
    </div>`;
  }).join('') + (ids.length>20 ? `<div style="text-align:center;font-size:.75rem;color:var(--mut);padding:8px">+${ids.length-20} autres</div>` : '');
}

function removeHard(id) {
  stats.hardIds.delete(id); save(); renderHard();
}

function resetStats() {
  if (!confirm('Réinitialiser toutes vos statistiques ? Action irréversible.')) return;
  stats = mkStats(); save();
  renderDash(); updateDailyGoal(); updateAnkiCount();
}

// ===== UI HELPERS =====
function el(id) { return document.getElementById(id); }

function updateHeader() {
  el('sBadge').textContent = `${st.score}/${st.idx}`;
  el('ptsPill').textContent = `${st.pts} pts`;
  const sp = el('streakPill');
  if (st.streak >= 3) { sp.style.display='flex'; sp.textContent=`🔥 ${st.streak}`; }
  else sp.style.display = 'none';
}

function showStreakPop(n) {
  const pop = el('streakPop');
  pop.textContent = `🔥 Série × ${n} !`;
  pop.className = 'streak-pop show';
  setTimeout(() => pop.className='streak-pop hide', 1800);
  setTimeout(() => pop.className='streak-pop', 2300);
}

function updateDailyGoal() {
  const today = new Date().toISOString().split('T')[0];
  if (stats.daily.date !== today) stats.daily = { date: today, count: 0 };
  const cnt = stats.daily.count, goal = 10;
  const pct = Math.min(100, Math.round(cnt/goal*100));
  el('dailyGoalText').textContent = `Objectif du jour : ${cnt}/${goal} questions`;
  el('dailyGoalFill').style.width = pct+'%';
  el('dailyGoalBar').style.borderColor = pct>=100 ? 'var(--grn)' : 'var(--brd)';
  el('dailyStreakEl').textContent = pct>=100 ? '✅ Objectif atteint !' : '';
}

function updateAnkiCount() {
  el('ankiCount').textContent = ankiDue().length;
}

// ===== SWIPE SUPPORT =====
let touchX = 0;
document.addEventListener('touchstart', e => { touchX = e.touches[0].clientX; }, { passive:true });
document.addEventListener('touchend', e => {
  if (Math.abs(e.changedTouches[0].clientX - touchX) > 60 && st.answered) nextQ();
}, { passive:true });

// ===== KEYBOARD =====
document.addEventListener('keydown', e => {
  if (document.getElementById('quizScreen').style.display === 'none') return;
  const q = st.questions[st.idx];
  if (!q) return;
  const btns = [...document.querySelectorAll('.opt')];
  const map = { KeyA:0, KeyB:1, KeyC:2, KeyD:3, KeyE:4, Digit1:0, Digit2:1, Digit3:2, Digit4:3, Digit5:4 };
  if (map[e.code] !== undefined && !st.answered) pickOpt(btns[map[e.code]], map[e.code]);
  if (e.code === 'Space' || e.code === 'ArrowRight') { if (st.answered) nextQ(); }
  if (e.code === 'Enter') { if (!st.answered && q.m) validateMulti(); }
  if (e.code === 'KeyH') useHint();
});

// ===== INIT =====
function init() {
  applyTheme();
  el('soundBtn').textContent = stats.sound ? '🔔' : '🔕';
  updateDailyGoal();
  updateAnkiCount();
}

init();
