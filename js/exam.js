/* ============================================================
   Full Exam Simulator
   ============================================================ */

(function() {
  const state = {
    questions: [],
    current: 0,
    answers: {},
    timerInterval: null,
    timeRemaining: 0,
    totalTime: 0,
    started: false,
    finished: false,
    mode: 'full', // 'full' or 'untimed'
    currentSubtest: '',
    subtestStart: 0,
    subtestTimers: {},
    noGoBack: true
  };

  document.addEventListener('DOMContentLoaded', () => {
    const setupEl = document.getElementById('exam-setup');
    const examEl = document.getElementById('exam-area');
    if (!setupEl) return;

    // Setup event listeners
    document.querySelectorAll('.setup-option').forEach(opt => {
      opt.addEventListener('click', () => {
        document.querySelectorAll('.setup-option').forEach(o => o.classList.remove('selected'));
        opt.classList.add('selected');
        opt.querySelector('input').checked = true;
        state.mode = opt.querySelector('input').value;
      });
    });

    const toggleNoBack = document.getElementById('toggle-no-back');
    if (toggleNoBack) {
      toggleNoBack.addEventListener('click', () => {
        toggleNoBack.classList.toggle('on');
        state.noGoBack = toggleNoBack.classList.contains('on');
      });
    }

    document.getElementById('start-exam')?.addEventListener('click', startExam);
  });

  function startExam() {
    state.questions = buildFullExam();
    if (!state.questions.length) return;

    state.current = 0;
    state.answers = {};
    state.started = true;
    state.finished = false;

    // Calculate total time from all subtests
    const meta = window.SUBTEST_META || {};
    state.totalTime = 0;
    window.SUBTEST_ORDER.forEach(sub => {
      const m = meta[sub];
      if (m) {
        state.subtestTimers[sub] = m.minutes * 60;
        state.totalTime += m.minutes * 60;
      }
    });
    state.timeRemaining = state.totalTime;
    state.currentSubtest = state.questions[0].sub;
    state.subtestStart = 0;

    document.getElementById('exam-setup').classList.add('hidden');
    document.getElementById('exam-area').classList.remove('hidden');

    if (state.mode === 'full') {
      startTimer();
    }

    renderQuestion();
    renderQuestionMap();
  }

  function startTimer() {
    clearInterval(state.timerInterval);
    state.timerInterval = setInterval(() => {
      if (state.timeRemaining <= 0) {
        clearInterval(state.timerInterval);
        finishExam();
        return;
      }
      state.timeRemaining--;

      // Also decrement subtest timer
      const sub = state.questions[state.current]?.sub;
      if (sub && state.subtestTimers[sub] !== undefined) {
        state.subtestTimers[sub]--;
        if (state.subtestTimers[sub] <= 0) {
          // Auto-advance to next subtest
          const nextSub = findNextSubtest(sub);
          if (nextSub) {
            advanceToSubtest(nextSub);
          } else {
            finishExam();
            return;
          }
        }
      }

      updateTimerDisplay();
    }, 1000);
  }

  function findNextSubtest(currentSub) {
    const order = window.SUBTEST_ORDER;
    const idx = order.indexOf(currentSub);
    return idx < order.length - 1 ? order[idx + 1] : null;
  }

  function advanceToSubtest(sub) {
    // Find first question of this subtest
    const idx = state.questions.findIndex(q => q.sub === sub);
    if (idx >= 0) {
      state.current = idx;
      state.currentSubtest = sub;
      renderQuestion();
      renderQuestionMap();
    }
  }

  function updateTimerDisplay() {
    const timerEl = document.getElementById('timer-value');
    const subtestTimerEl = document.getElementById('subtest-timer');
    if (!timerEl) return;

    const sub = state.questions[state.current]?.sub;
    const subTime = sub ? (state.subtestTimers[sub] || 0) : 0;

    if (state.mode === 'full') {
      timerEl.textContent = formatTime(subTime);

      // Warning colors
      timerEl.className = 'timer';
      if (subTime < 60) timerEl.classList.add('danger');
      else if (subTime < 120) timerEl.classList.add('warning');
    } else {
      timerEl.textContent = '∞';
    }

    if (subtestTimerEl) {
      subtestTimerEl.textContent = formatTime(state.timeRemaining);
    }

    // Update progress
    const progressEl = document.getElementById('exam-progress');
    if (progressEl) {
      const answered = Object.keys(state.answers).length;
      progressEl.textContent = `${answered}/${state.questions.length} answered`;
    }
  }

  function renderQuestion() {
    const q = state.questions[state.current];
    if (!q) return;

    const meta = window.SUBTEST_META[q.sub] || {};

    // Update subtest label
    const labelEl = document.getElementById('subtest-label');
    if (labelEl) labelEl.textContent = `${meta.name || q.sub} (${q.sub})`;

    // Question number
    const numEl = document.getElementById('question-number');
    if (numEl) numEl.textContent = `Question ${state.current + 1} of ${state.questions.length}`;

    // Passage / SVG context
    const contextEl = document.getElementById('question-context');
    if (contextEl) {
      let ctx = '';
      if (q.passage) ctx += `<div class="passage-box">${q.passage}</div>`;
      if (q.svg) ctx += `<div class="ao-shape-box">${q.svg}</div>`;
      contextEl.innerHTML = ctx;
    }

    // Question text
    const textEl = document.getElementById('question-text');
    if (textEl) textEl.textContent = q.q;

    // Options
    const optsEl = document.getElementById('question-options');
    if (optsEl) {
      const letters = ['A', 'B', 'C', 'D'];
      optsEl.innerHTML = q.opts.map((opt, i) => {
        const selected = state.answers[state.current] === i ? 'selected' : '';
        return `<li class="option ${selected}" data-idx="${i}">
          <span class="option-letter">${letters[i]}.</span>
          <span>${opt}</span>
        </li>`;
      }).join('');

      optsEl.querySelectorAll('.option').forEach(opt => {
        opt.addEventListener('click', () => selectAnswer(parseInt(opt.dataset.idx)));
      });
    }

    // Nav buttons
    const prevBtn = document.getElementById('prev-btn');
    const nextBtn = document.getElementById('next-btn');
    const finishBtn = document.getElementById('finish-btn');

    if (prevBtn) {
      prevBtn.classList.toggle('hidden', state.current === 0 || state.noGoBack);
    }
    if (nextBtn) {
      nextBtn.classList.toggle('hidden', state.current >= state.questions.length - 1);
    }
    if (finishBtn) {
      finishBtn.classList.toggle('hidden', state.current < state.questions.length - 1);
    }

    updateTimerDisplay();
    updateQuestionMapCurrent();
  }

  function selectAnswer(idx) {
    if (state.finished) return;
    state.answers[state.current] = idx;
    renderQuestion();
    renderQuestionMap();
  }

  function renderQuestionMap() {
    const mapEl = document.getElementById('question-map');
    if (!mapEl) return;

    let html = '';
    let lastSub = '';

    state.questions.forEach((q, i) => {
      if (q.sub !== lastSub) {
        const meta = window.SUBTEST_META[q.sub] || {};
        html += `<div class="qmap-sep">${meta.name || q.sub}</div>`;
        lastSub = q.sub;
      }
      const answered = state.answers[i] !== undefined ? 'answered' : '';
      const current = i === state.current ? 'current' : '';
      html += `<div class="qmap-dot ${answered} ${current}" data-idx="${i}">${i + 1}</div>`;
    });

    mapEl.innerHTML = html;
    mapEl.querySelectorAll('.qmap-dot').forEach(dot => {
      dot.addEventListener('click', () => {
        const idx = parseInt(dot.dataset.idx);
        if (state.noGoBack && idx < state.current) return;
        state.current = idx;
        renderQuestion();
        updateQuestionMapCurrent();
      });
    });
  }

  function updateQuestionMapCurrent() {
    document.querySelectorAll('.qmap-dot').forEach(dot => {
      dot.classList.remove('current');
      if (parseInt(dot.dataset.idx) === state.current) {
        dot.classList.add('current');
      }
    });
  }

  // Global nav functions
  window.examPrev = function() {
    if (state.current > 0 && !state.noGoBack) {
      state.current--;
      renderQuestion();
      updateQuestionMapCurrent();
    }
  };

  window.examNext = function() {
    if (state.current < state.questions.length - 1) {
      state.current++;
      renderQuestion();
      updateQuestionMapCurrent();
    }
  };

  window.examFinish = function() {
    const unanswered = state.questions.length - Object.keys(state.answers).length;
    if (unanswered > 0) {
      if (!confirm(`You have ${unanswered} unanswered question(s). Finish anyway?`)) return;
    }
    finishExam();
  };

  function finishExam() {
    clearInterval(state.timerInterval);
    state.finished = true;

    // Calculate scores by subtest
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

    // Calculate percentages
    Object.keys(subtestScores).forEach(sub => {
      const s = subtestScores[sub];
      s.pct = Math.round((s.correct / s.total) * 100);
    });

    // AFQT score
    const afqt = calculateAFQT(subtestScores);

    // Composite scores
    const composites = calculateComposites(subtestScores);

    // Overall
    const totalCorrect = Object.values(subtestScores).reduce((sum, s) => sum + s.correct, 0);
    const totalQuestions = state.questions.length;
    const overallPct = Math.round((totalCorrect / totalQuestions) * 100);

    // Save to history
    ScoreStore.save({
      type: 'full-exam',
      mode: state.mode,
      overall: overallPct,
      afqt: afqt,
      subtests: subtestScores,
      composites: composites,
      totalCorrect: totalCorrect,
      totalQuestions: totalQuestions,
      timeUsed: state.totalTime - state.timeRemaining
    });

    // Show results
    showResults(subtestScores, afqt, composites, overallPct, totalCorrect, totalQuestions);
  }

  function showResults(subtestScores, afqt, composites, overallPct, totalCorrect, totalQuestions) {
    const area = document.getElementById('exam-area');
    const timerBar = document.querySelector('.timer-bar');
    if (timerBar) timerBar.classList.add('hidden');

    const scoreClass = overallPct >= 70 ? 'high' : overallPct >= 50 ? 'mid' : 'low';
    const afqtClass = afqt >= 70 ? 'high' : afqt >= 50 ? 'mid' : 'low';

    let html = `
      <div class="section">
        <div class="container">
          <div class="score-card">
            <div class="badge" style="margin-bottom:1rem">Exam Complete</div>
            <div class="score-big ${scoreClass}">${overallPct}%</div>
            <p class="text-muted">${totalCorrect} of ${totalQuestions} correct</p>
          </div>

          <div class="stats-bar">
            <div class="stat">
              <span class="stat-value" style="color:var(--${afqtClass === 'high' ? 'green' : afqtClass === 'mid' ? 'orange' : 'red'})">${afqt}</span>
              <span class="stat-label">AFQT Score</span>
            </div>
            <div class="stat">
              <span class="stat-value">${formatTime(state.totalTime - state.timeRemaining)}</span>
              <span class="stat-label">Time Used</span>
            </div>
            <div class="stat">
              <span class="stat-value">${Object.keys(state.answers).length}</span>
              <span class="stat-label">Answered</span>
            </div>
          </div>

          <h2 style="text-align:center;margin:2rem 0 1rem">Subtest Breakdown</h2>
          <table class="score-table" style="max-width:700px;margin:0 auto">
            <thead>
              <tr><th>Subtest</th><th>Score</th><th>Correct</th><th>Result</th></tr>
            </thead>
            <tbody>`;

    const order = window.SUBTEST_ORDER || [];
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
        <td>${s.pct >= 60 ? '✅' : '❌'}</td>
      </tr>`;
    });

    html += `</tbody></table>`;

    // AFQT eligibility
    const mins = window.AFQT_INFO?.minimums || {};
    html += `<h2 style="text-align:center;margin:2rem 0 1rem">Branch Eligibility (AFQT: ${afqt})</h2>
      <div style="max-width:600px;margin:0 auto;display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:.75rem">`;

    Object.entries(mins).forEach(([branch, min]) => {
      const qual = afqt >= min;
      html += `<div class="mos-card ${qual ? 'qualified' : 'not-qualified'}">
        <div class="mos-name">${branch}</div>
        <div class="mos-branch">Min AFQT: ${min} — ${qual ? '✅ Eligible' : '❌ Below minimum'}</div>
      </div>`;
    });

    html += `</div>`;

    // Composite scores
    html += `<h2 style="text-align:center;margin:2rem 0 1rem">Line Scores (Composites)</h2>
      <table class="score-table" style="max-width:700px;margin:0 auto">
        <thead><tr><th>Code</th><th>Line Score</th><th>Score</th><th>Components</th></tr></thead>
        <tbody>`;

    Object.entries(composites).forEach(([code, comp]) => {
      const cls = comp.score >= 70 ? 'high' : comp.score >= 50 ? 'mid' : 'low';
      html += `<tr>
        <td><strong>${code}</strong></td>
        <td>${comp.name}</td>
        <td class="score-pct ${cls}">${comp.score}</td>
        <td class="text-sm text-muted">${comp.subtests.join(' + ')}</td>
      </tr>`;
    });

    html += `</tbody></table>`;

    // Review questions button
    html += `
      <div style="text-align:center;margin:2rem 0">
        <button class="btn btn-primary" onclick="showReview()">📋 Review All Answers</button>
        <a href="index.html" class="btn btn-outline" style="margin-left:.5rem">← Back to Home</a>
      </div>
      <div id="review-area"></div>
    </div></div>`;

    area.innerHTML = html;
    area.classList.remove('exam-body');
  }

  window.showReview = function() {
    const area = document.getElementById('review-area');
    if (!area) return;

    const letters = ['A', 'B', 'C', 'D'];
    let html = '<div style="max-width:800px;margin:2rem auto">';

    state.questions.forEach((q, i) => {
      const userAns = state.answers[i];
      const correct = userAns === q.ans;
      const meta = window.SUBTEST_META[q.sub] || {};

      let reviewCtx = '';
      if (q.passage) reviewCtx += `<div class="passage-box">${q.passage}</div>`;
      if (q.svg) reviewCtx += `<div class="ao-shape-box">${q.svg}</div>`;

      html += `<div class="question-card" style="border-left:3px solid var(--${correct ? 'green' : 'red'})">
        <div class="question-number">${q.sub} — ${meta.name || ''} · Question ${i + 1}</div>
        ${reviewCtx}
        <div class="question-text">${q.q}</div>
        <ul class="options" style="pointer-events:none">`;

      q.opts.forEach((opt, j) => {
        let cls = '';
        if (j === q.ans) cls = 'correct';
        else if (j === userAns && userAns !== q.ans) cls = 'incorrect';
        html += `<li class="option ${cls}">
          <span class="option-letter">${letters[j]}.</span>
          <span>${opt}</span>
        </li>`;
      });

      html += `</ul>`;
      if (q.exp) {
        html += `<div class="explanation"><strong>Explanation:</strong> ${q.exp}</div>`;
      }
      html += `</div>`;
    });

    html += '</div>';
    area.innerHTML = html;
    area.scrollIntoView({ behavior: 'smooth' });
  };
})();
