/* ============================================================
   ASVAB Study Guide — Online Companion
   Core Application Logic
   ArcLight Press · erictomchik.com
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {
  initNavToggle();
  initFadeIn();
});

/* --- Mobile Nav -------------------------------------------- */
function initNavToggle() {
  const toggle = document.querySelector('.nav-toggle');
  const links = document.querySelector('.nav-links');
  if (!toggle || !links) return;
  toggle.addEventListener('click', () => links.classList.toggle('open'));
  links.querySelectorAll('a').forEach(a => a.addEventListener('click', () => links.classList.remove('open')));
}

/* --- Scroll Fade In ---------------------------------------- */
function initFadeIn() {
  const els = document.querySelectorAll('.fade-in');
  if (!els.length) return;
  const obs = new IntersectionObserver((entries) => {
    entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('visible'); obs.unobserve(e.target); } });
  }, { threshold: 0.15 });
  els.forEach(el => obs.observe(el));
}

/* --- Utility: Shuffle Array -------------------------------- */
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/* --- Utility: Format Time ---------------------------------- */
function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

/* --- Utility: Score Storage -------------------------------- */
const ScoreStore = {
  KEY: 'asvab_scores',

  getAll() {
    try {
      return JSON.parse(localStorage.getItem(this.KEY) || '[]');
    } catch { return []; }
  },

  save(result) {
    const all = this.getAll();
    result.date = new Date().toISOString();
    result.id = Date.now();
    all.push(result);
    // Keep last 50
    while (all.length > 50) all.shift();
    localStorage.setItem(this.KEY, JSON.stringify(all));
    return result;
  },

  clear() {
    localStorage.removeItem(this.KEY);
  }
};

/* --- Utility: Get Questions by Subtest --------------------- */
function getQuestionsBySubtest(sub, count, difficulty) {
  if (!window.ASVAB_QUESTIONS) return [];
  let pool = window.ASVAB_QUESTIONS.filter(q => q.sub === sub);
  if (difficulty) {
    pool = pool.filter(q => q.diff === difficulty);
  }
  return shuffle(pool).slice(0, count);
}

/* --- Utility: Build Full Exam ------------------------------ */
function buildFullExam() {
  const order = window.SUBTEST_ORDER || [];
  const meta = window.SUBTEST_META || {};
  const questions = [];

  order.forEach(sub => {
    const info = meta[sub];
    if (!info) return;
    const subQs = getQuestionsBySubtest(sub, info.questions);
    subQs.forEach((q, i) => {
      questions.push({ ...q, examIndex: questions.length, subtestIndex: i });
    });
  });

  return questions;
}

/* --- Utility: Calculate AFQT Score ------------------------- */
function calculateAFQT(subtestScores) {
  const info = window.AFQT_INFO;
  if (!info) return 0;

  // Simplified: Average percentages of AFQT subtests
  let total = 0, count = 0;
  info.subtests.forEach(sub => {
    if (subtestScores[sub]) {
      total += subtestScores[sub].pct;
      count++;
    }
  });
  return count > 0 ? Math.round(total / count) : 0;
}

/* --- Utility: Calculate Composite Scores ------------------- */
function calculateComposites(subtestScores) {
  const composites = window.COMPOSITE_SCORES || {};
  const result = {};

  Object.keys(composites).forEach(code => {
    const comp = composites[code];
    let total = 0, count = 0;
    comp.subtests.forEach(sub => {
      if (subtestScores[sub]) {
        total += subtestScores[sub].pct;
        count++;
      }
    });
    result[code] = {
      name: comp.name,
      desc: comp.desc,
      score: count > 0 ? Math.round(total / count) : 0,
      subtests: comp.subtests
    };
  });

  return result;
}
