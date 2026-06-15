/* ============================================================
   Subtest Practice Drills
   ============================================================ */

(function() {
  const state = {
    questions: [],
    current: 0,
    answers: {},
    revealed: {},
    subtest: '',
    mode: 'all' // 'all', 'easy', 'medium', 'hard'
  };

  document.addEventListener('DOMContentLoaded', () => {
    // Check URL params for subtest
    const params = new URLSearchParams(window.location.search);
    const sub = params.get('sub');
    if (sub && window.SUBTEST_META && window.SUBTEST_META[sub]) {
      startPractice(sub);
    }

    // Subtest card clicks
    document.querySelectorAll('.subtest-card').forEach(card => {
      card.addEventListener('click', (e) => {
        e.preventDefault();
        const s = card.dataset.sub;
        if (s) {
          window.history.pushState({}, '', `?sub=${s}`);
          startPractice(s);
        }
      });
    });
  });

  function startPractice(sub) {
    state.subtest = sub;
    state.current = 0;
    state.answers = {};
    state.revealed = {};

    const meta = window.SUBTEST_META[sub] || {};
    const allQs = (window.ASVAB_QUESTIONS || []).filter(q => q.sub === sub);
    state.questions = shuffle(allQs);

    // Hide selector, show practice
    const selector = document.getElementById('subtest-selector');
    const practice = document.getElementById('practice-area');
    if (selector) selector.classList.add('hidden');
    if (practice) practice.classList.remove('hidden');

    // Update header
    const headerEl = document.getElementById('practice-header');
    if (headerEl) {
      headerEl.innerHTML = `
        <div class="badge">${sub}</div>
        <h1>${meta.name || sub}</h1>
        <p class="subtitle">${allQs.length} questions · ${meta.desc || ''}</p>
        <div class="tabs" style="justify-content:center;margin-top:1rem">
          <button class="tab active" data-diff="all">All (${allQs.length})</button>
          <button class="tab" data-diff="1">Easy (${allQs.filter(q=>q.diff===1).length})</button>
          <button class="tab" data-diff="2">Medium (${allQs.filter(q=>q.diff===2).length})</button>
          <button class="tab" data-diff="3">Hard (${allQs.filter(q=>q.diff===3).length})</button>
        </div>
      `;

      headerEl.querySelectorAll('.tab').forEach(tab => {
        tab.addEventListener('click', () => {
          headerEl.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
          tab.classList.add('active');
          const diff = tab.dataset.diff;
          state.current = 0;
          state.answers = {};
          state.revealed = {};
          if (diff === 'all') {
            state.questions = shuffle(allQs);
          } else {
            state.questions = shuffle(allQs.filter(q => q.diff === parseInt(diff)));
          }
          renderPracticeQuestion();
        });
      });
    }

    // Back button
    document.getElementById('practice-back')?.addEventListener('click', () => {
      const selector = document.getElementById('subtest-selector');
      const practice = document.getElementById('practice-area');
      if (selector) selector.classList.remove('hidden');
      if (practice) practice.classList.add('hidden');
      window.history.pushState({}, '', window.location.pathname);
    });

    renderPracticeQuestion();
  }

  function renderPracticeQuestion() {
    if (!state.questions.length) {
      const body = document.getElementById('practice-body');
      if (body) body.innerHTML = '<p class="text-center text-muted">No questions available for this filter.</p>';
      return;
    }

    const q = state.questions[state.current];
    const letters = ['A', 'B', 'C', 'D'];
    const isRevealed = state.revealed[state.current];
    const userAns = state.answers[state.current];
    const diffLabel = q.diff === 1 ? 'Easy' : q.diff === 3 ? 'Hard' : 'Medium';
    const diffColor = q.diff === 1 ? 'green' : q.diff === 3 ? 'red' : 'orange';

    const body = document.getElementById('practice-body');
    if (!body) return;

    let optionsHTML = q.opts.map((opt, i) => {
      let cls = '';
      if (isRevealed) {
        if (i === q.ans) cls = 'correct';
        else if (i === userAns && userAns !== q.ans) cls = 'incorrect';
      } else if (userAns === i) {
        cls = 'selected';
      }
      return `<li class="option ${cls}" data-idx="${i}" ${isRevealed ? 'style="pointer-events:none"' : ''}>
        <span class="option-letter">${letters[i]}.</span>
        <span>${opt}</span>
      </li>`;
    }).join('');

    body.innerHTML = `
      <div class="question-card">
        <div class="question-number" style="display:flex;justify-content:space-between">
          <span>Question ${state.current + 1} of ${state.questions.length}</span>
          <span style="color:var(--${diffColor});font-size:.7rem;padding:.2rem .5rem;border:1px solid var(--${diffColor});border-radius:4px">${diffLabel}</span>
        </div>
        <div class="question-text">${q.q}</div>
        <ul class="options" id="practice-opts">${optionsHTML}</ul>
        ${isRevealed && q.exp ? `<div class="explanation"><strong>${userAns === q.ans ? '✅ Correct!' : '❌ Incorrect.'}</strong> ${q.exp}</div>` : ''}
      </div>
      <div class="exam-nav">
        <button class="btn btn-outline" onclick="practicePrev()" ${state.current === 0 ? 'disabled' : ''}>← Previous</button>
        <span class="text-muted text-sm">${countCorrect()} correct of ${countAnswered()} answered</span>
        ${!isRevealed && userAns !== undefined ?
          `<button class="btn btn-primary" id="check-btn">Check Answer</button>` :
          `<button class="btn btn-primary" onclick="practiceNext()" ${state.current >= state.questions.length - 1 ? 'disabled' : ''}>Next →</button>`
        }
      </div>`;

    // Attach option listeners
    if (!isRevealed) {
      document.querySelectorAll('#practice-opts .option').forEach(opt => {
        opt.addEventListener('click', () => {
          state.answers[state.current] = parseInt(opt.dataset.idx);
          renderPracticeQuestion();
        });
      });
    }

    document.getElementById('check-btn')?.addEventListener('click', () => {
      state.revealed[state.current] = true;
      renderPracticeQuestion();
    });
  }

  function countCorrect() {
    let c = 0;
    Object.entries(state.revealed).forEach(([idx, revealed]) => {
      if (revealed && state.answers[idx] === state.questions[idx]?.ans) c++;
    });
    return c;
  }

  function countAnswered() {
    return Object.keys(state.revealed).length;
  }

  window.practicePrev = function() {
    if (state.current > 0) {
      state.current--;
      renderPracticeQuestion();
    }
  };

  window.practiceNext = function() {
    if (state.current < state.questions.length - 1) {
      state.current++;
      renderPracticeQuestion();
    }
  };
})();
