/* ============================================================
   CAT-ASVAB Adaptive Simulator
   Simulates the Computer Adaptive Test experience
   ============================================================ */

(function() {
  const state = {
    questions: [],
    current: 0,
    answers: {},
    difficulty: {},   // tracks difficulty per subtest
    timerInterval: null,
    currentSubtest: 0,
    subtestTimeLeft: 0,
    started: false,
    finished: false,
    subtestQuestions: [],
    subtestIndex: 0
  };

  const order = ['GS','AR','WK','PC','MK','EI','AI','SI','MC','AO'];

  document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('start-cat')?.addEventListener('click', startCAT);
  });

  function startCAT() {
    state.currentSubtest = 0;
    state.answers = {};
    state.difficulty = {};
    state.questions = [];
    state.started = true;
    state.finished = false;

    order.forEach(sub => { state.difficulty[sub] = 2; }); // Start at medium

    document.getElementById('cat-setup').classList.add('hidden');
    document.getElementById('cat-area').classList.remove('hidden');

    startSubtest(0);
  }

  function startSubtest(idx) {
    if (idx >= order.length) {
      finishCAT();
      return;
    }

    state.currentSubtest = idx;
    const sub = order[idx];
    const meta = window.SUBTEST_META[sub] || {};

    state.subtestIndex = 0;
    state.subtestQuestions = [];
    state.subtestTimeLeft = (meta.minutes || 10) * 60;

    // Show subtest intro
    const area = document.getElementById('cat-area');
    area.innerHTML = `
      <div class="timer-bar" id="cat-timer-bar">
        <span id="cat-subtest-label" class="subtest-label">${meta.name || sub} (${sub})</span>
        <span id="cat-timer" class="timer">${formatTime(state.subtestTimeLeft)}</span>
        <span id="cat-progress" class="progress-text">0/${meta.questions || 15}</span>
      </div>
      <div class="exam-body">
        <div class="score-card" style="max-width:500px">
          <div class="badge">${sub}</div>
          <h2 style="margin:.5rem 0">${meta.name || sub}</h2>
          <p class="text-muted">${meta.desc || ''}</p>
          <p class="text-muted text-sm">${meta.questions || 15} questions · ${meta.minutes || 10} minutes</p>
          <p class="text-muted text-sm" style="margin-top:.5rem">
            ⚡ Adaptive: Questions adjust difficulty based on your answers
          </p>
          <button class="btn btn-primary mt-3" id="begin-subtest">Begin ${sub} →</button>
        </div>
      </div>`;

    document.getElementById('begin-subtest').addEventListener('click', () => {
      startSubtestTimer();
      selectNextQuestion();
    });
  }

  function startSubtestTimer() {
    clearInterval(state.timerInterval);
    state.timerInterval = setInterval(() => {
      state.subtestTimeLeft--;
      const el = document.getElementById('cat-timer');
      if (el) {
        el.textContent = formatTime(Math.max(0, state.subtestTimeLeft));
        el.className = 'timer';
        if (state.subtestTimeLeft < 60) el.classList.add('danger');
        else if (state.subtestTimeLeft < 120) el.classList.add('warning');
      }
      if (state.subtestTimeLeft <= 0) {
        clearInterval(state.timerInterval);
        // Auto-advance to next subtest
        startSubtest(state.currentSubtest + 1);
      }
    }, 1000);
  }

  function selectNextQuestion() {
    const sub = order[state.currentSubtest];
    const meta = window.SUBTEST_META[sub] || {};
    const needed = meta.questions || 15;

    if (state.subtestIndex >= needed) {
      clearInterval(state.timerInterval);
      startSubtest(state.currentSubtest + 1);
      return;
    }

    // Get current difficulty for this subtest
    const diff = state.difficulty[sub] || 2;

    // Try to find a question at current difficulty not already used
    const usedIds = new Set(state.subtestQuestions.map(q => q.id));
    let pool = (window.ASVAB_QUESTIONS || []).filter(q =>
      q.sub === sub && q.diff === diff && !usedIds.has(q.id)
    );

    // If not enough at this difficulty, expand to adjacent difficulties
    if (pool.length === 0) {
      pool = (window.ASVAB_QUESTIONS || []).filter(q =>
        q.sub === sub && !usedIds.has(q.id)
      );
    }

    if (pool.length === 0) {
      // No more questions available, finish subtest
      clearInterval(state.timerInterval);
      startSubtest(state.currentSubtest + 1);
      return;
    }

    const q = shuffle(pool)[0];
    state.subtestQuestions.push(q);
    renderCATQuestion(q);
  }

  function renderCATQuestion(q) {
    const sub = order[state.currentSubtest];
    const meta = window.SUBTEST_META[sub] || {};
    const needed = meta.questions || 15;

    // Update progress
    const progEl = document.getElementById('cat-progress');
    if (progEl) progEl.textContent = `${state.subtestIndex + 1}/${needed}`;

    const area = document.getElementById('cat-area');
    const letters = ['A', 'B', 'C', 'D'];
    const diffLabel = q.diff === 1 ? 'Easy' : q.diff === 3 ? 'Hard' : 'Medium';
    const diffColor = q.diff === 1 ? 'green' : q.diff === 3 ? 'red' : 'orange';

    // Keep timer bar, replace body
    const timerBar = document.getElementById('cat-timer-bar');
    const timerHTML = timerBar ? timerBar.outerHTML : '';

    area.innerHTML = `${timerHTML}
      <div class="exam-body">
        <div class="question-card">
          <div class="question-number" style="display:flex;justify-content:space-between;align-items:center">
            <span>Question ${state.subtestIndex + 1} of ${needed}</span>
            <span style="color:var(--${diffColor});font-size:.7rem;padding:.2rem .5rem;border:1px solid var(--${diffColor});border-radius:4px">${diffLabel}</span>
          </div>
          <div class="question-text">${q.q}</div>
          <ul class="options" id="cat-options">
            ${q.opts.map((opt, i) => `
              <li class="option" data-idx="${i}">
                <span class="option-letter">${letters[i]}.</span>
                <span>${opt}</span>
              </li>
            `).join('')}
          </ul>
          <div id="cat-feedback" class="hidden"></div>
        </div>
        <div style="text-align:center;margin-top:1rem">
          <button class="btn btn-primary hidden" id="cat-next">Next Question →</button>
        </div>
      </div>`;

    // Re-attach timer
    const newTimerBar = document.getElementById('cat-timer-bar');
    if (newTimerBar) {
      // Timer already in DOM from innerHTML
    }

    // Answer selection
    document.querySelectorAll('#cat-options .option').forEach(opt => {
      opt.addEventListener('click', () => handleCATAnswer(q, parseInt(opt.dataset.idx)));
    });
  }

  function handleCATAnswer(q, ansIdx) {
    const correct = ansIdx === q.ans;
    const sub = order[state.currentSubtest];
    const letters = ['A', 'B', 'C', 'D'];

    // Store answer
    const globalIdx = state.questions.length;
    state.questions.push(q);
    state.answers[globalIdx] = ansIdx;

    // Show feedback
    document.querySelectorAll('#cat-options .option').forEach(opt => {
      const idx = parseInt(opt.dataset.idx);
      opt.style.pointerEvents = 'none';
      if (idx === q.ans) opt.classList.add('correct');
      else if (idx === ansIdx && !correct) opt.classList.add('incorrect');
    });

    const feedback = document.getElementById('cat-feedback');
    if (feedback) {
      feedback.classList.remove('hidden');
      feedback.innerHTML = `<div class="explanation">
        <strong>${correct ? '✅ Correct!' : '❌ Incorrect.'}</strong>
        ${correct ? '' : ` The correct answer is ${letters[q.ans]}.`}
        ${q.exp ? `<br><br>${q.exp}` : ''}
      </div>`;
    }

    // Adaptive difficulty adjustment
    if (correct) {
      state.difficulty[sub] = Math.min(3, (state.difficulty[sub] || 2) + 1);
    } else {
      state.difficulty[sub] = Math.max(1, (state.difficulty[sub] || 2) - 1);
    }

    // Show next button
    const nextBtn = document.getElementById('cat-next');
    if (nextBtn) {
      nextBtn.classList.remove('hidden');
      nextBtn.addEventListener('click', () => {
        state.subtestIndex++;
        selectNextQuestion();
      });
    }
  }

  function finishCAT() {
    clearInterval(state.timerInterval);
    state.finished = true;

    // Calculate scores
    const subtestScores = {};
    state.questions.forEach((q, i) => {
      if (!subtestScores[q.sub]) {
        subtestScores[q.sub] = { correct: 0, total: 0, pct: 0 };
      }
      subtestScores[q.sub].total++;
      if (state.answers[i] === q.ans) {
        subtestScores[q.sub].correct++;
      }
    });

    Object.keys(subtestScores).forEach(sub => {
      const s = subtestScores[sub];
      s.pct = Math.round((s.correct / s.total) * 100);
    });

    const afqt = calculateAFQT(subtestScores);
    const composites = calculateComposites(subtestScores);
    const totalCorrect = Object.values(subtestScores).reduce((sum, s) => sum + s.correct, 0);
    const totalQuestions = state.questions.length;
    const overallPct = Math.round((totalCorrect / totalQuestions) * 100);

    ScoreStore.save({
      type: 'cat-asvab',
      overall: overallPct,
      afqt: afqt,
      subtests: subtestScores,
      composites: composites,
      totalCorrect: totalCorrect,
      totalQuestions: totalQuestions
    });

    // Render results
    const area = document.getElementById('cat-area');
    const scoreClass = overallPct >= 70 ? 'high' : overallPct >= 50 ? 'mid' : 'low';
    const afqtClass = afqt >= 70 ? 'high' : afqt >= 50 ? 'mid' : 'low';

    let html = `
      <div class="section">
        <div class="container">
          <div class="score-card">
            <div class="badge">CAT-ASVAB Complete</div>
            <div class="score-big ${scoreClass}">${overallPct}%</div>
            <p class="text-muted">${totalCorrect} of ${totalQuestions} correct</p>
          </div>

          <div class="stats-bar">
            <div class="stat">
              <span class="stat-value" style="color:var(--${afqtClass === 'high' ? 'green' : afqtClass === 'mid' ? 'orange' : 'red'})">${afqt}</span>
              <span class="stat-label">AFQT Score</span>
            </div>
          </div>

          <h2 style="text-align:center;margin:2rem 0 1rem">Subtest Breakdown</h2>
          <table class="score-table" style="max-width:700px;margin:0 auto">
            <thead><tr><th>Subtest</th><th>Score</th><th>Correct</th></tr></thead>
            <tbody>`;

    const meta = window.SUBTEST_META || {};
    order.forEach(sub => {
      const s = subtestScores[sub];
      if (!s) return;
      const m = meta[sub] || {};
      const cls = s.pct >= 70 ? 'high' : s.pct >= 50 ? 'mid' : 'low';
      html += `<tr>
        <td><strong>${sub}</strong> — ${m.name || ''}</td>
        <td class="score-pct ${cls}">${s.pct}%</td>
        <td>${s.correct}/${s.total}</td>
      </tr>`;
    });

    html += `</tbody></table>`;

    // Branch eligibility
    const mins = window.AFQT_INFO?.minimums || {};
    html += `<h2 style="text-align:center;margin:2rem 0 1rem">Branch Eligibility (AFQT: ${afqt})</h2>
      <div style="max-width:600px;margin:0 auto;display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:.75rem">`;
    Object.entries(mins).forEach(([branch, min]) => {
      const qual = afqt >= min;
      html += `<div class="mos-card ${qual ? 'qualified' : 'not-qualified'}">
        <div class="mos-name">${branch}</div>
        <div class="mos-branch">Min: ${min} — ${qual ? '✅ Eligible' : '❌ Below'}</div>
      </div>`;
    });
    html += `</div>`;

    html += `
      <div style="text-align:center;margin:2rem 0">
        <a href="cat/index.html" class="btn btn-primary">🔄 Retake CAT</a>
        <a href="index.html" class="btn btn-outline" style="margin-left:.5rem">← Back to Home</a>
      </div>
    </div></div>`;

    area.innerHTML = html;
  }
})();
