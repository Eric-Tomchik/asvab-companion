/* ============================================================
   Score Dashboard
   ============================================================ */

(function() {
  document.addEventListener('DOMContentLoaded', () => {
    renderDashboard();
    document.getElementById('clear-scores')?.addEventListener('click', () => {
      if (confirm('Clear all saved scores? This cannot be undone.')) {
        ScoreStore.clear();
        renderDashboard();
      }
    });
  });

  function renderDashboard() {
    const scores = ScoreStore.getAll();
    const container = document.getElementById('dashboard-content');
    if (!container) return;

    if (!scores.length) {
      container.innerHTML = `
        <div class="score-card">
          <h2>No Scores Yet</h2>
          <p class="text-muted">Complete a practice exam or CAT-ASVAB to see your scores here.</p>
          <div style="margin-top:1.5rem;display:flex;gap:1rem;justify-content:center;flex-wrap:wrap">
            <a href="exam/index.html" class="btn btn-primary">📝 Take Full Exam</a>
            <a href="cat/index.html" class="btn btn-outline">⚡ Try CAT-ASVAB</a>
          </div>
        </div>`;
      return;
    }

    // Summary stats
    const latest = scores[scores.length - 1];
    const best = scores.reduce((best, s) => s.overall > best.overall ? s : best, scores[0]);
    const avgAFQT = Math.round(scores.reduce((sum, s) => sum + (s.afqt || 0), 0) / scores.length);

    let html = `
      <div class="stats-bar">
        <div class="stat">
          <span class="stat-value">${scores.length}</span>
          <span class="stat-label">Tests Taken</span>
        </div>
        <div class="stat">
          <span class="stat-value">${latest.overall}%</span>
          <span class="stat-label">Latest Score</span>
        </div>
        <div class="stat">
          <span class="stat-value" style="color:var(--green)">${best.overall}%</span>
          <span class="stat-label">Best Score</span>
        </div>
        <div class="stat">
          <span class="stat-value">${avgAFQT}</span>
          <span class="stat-label">Avg AFQT</span>
        </div>
      </div>`;

    // AFQT trend
    if (scores.length >= 2) {
      const trend = latest.afqt - scores[scores.length - 2].afqt;
      const trendIcon = trend > 0 ? '📈' : trend < 0 ? '📉' : '➡️';
      const trendColor = trend > 0 ? 'green' : trend < 0 ? 'red' : 'text-muted';
      html += `<div class="card" style="text-align:center;padding:1rem;margin-bottom:1.5rem">
        <span style="font-size:1.5rem">${trendIcon}</span>
        <span style="color:var(--${trendColor});font-weight:700;margin-left:.5rem">
          AFQT ${trend > 0 ? '+' : ''}${trend} since last test
        </span>
      </div>`;
    }

    // Subtest averages
    if (scores.some(s => s.subtests)) {
      html += `<h2 style="margin:2rem 0 1rem">Subtest Averages</h2>`;
      html += `<div style="max-width:700px">`;

      const order = window.SUBTEST_ORDER || [];
      const meta = window.SUBTEST_META || {};
      order.forEach(sub => {
        const m = meta[sub] || {};
        let total = 0, count = 0;
        scores.forEach(s => {
          if (s.subtests && s.subtests[sub]) {
            total += s.subtests[sub].pct;
            count++;
          }
        });
        if (count === 0) return;
        const avg = Math.round(total / count);
        const cls = avg >= 70 ? 'high' : avg >= 50 ? 'mid' : 'low';

        html += `<div class="history-item">
          <div>
            <strong style="color:#f1f5f9">${sub}</strong>
            <span class="text-muted text-sm"> — ${m.name || ''}</span>
          </div>
          <div class="progress-bar"><div class="progress-fill ${cls}" style="width:${avg}%"></div></div>
          <span class="history-score" style="color:var(--${cls === 'high' ? 'green' : cls === 'mid' ? 'orange' : 'red'})">${avg}%</span>
        </div>`;
      });
      html += `</div>`;
    }

    // Score history
    html += `<h2 style="margin:2rem 0 1rem">Test History</h2>`;
    [...scores].reverse().forEach(s => {
      const date = new Date(s.date).toLocaleDateString('en-US', {
        month: 'short', day: 'numeric', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
      });
      const type = s.type === 'cat-asvab' ? '⚡ CAT-ASVAB' : '📝 Full Exam';
      const cls = s.overall >= 70 ? 'high' : s.overall >= 50 ? 'mid' : 'low';

      html += `<div class="history-item">
        <div>
          <div style="font-weight:600;color:#f1f5f9">${type}</div>
          <div class="history-date">${date}</div>
        </div>
        <div>
          <span class="text-muted text-sm">AFQT: ${s.afqt || '—'}</span>
        </div>
        <span class="history-score" style="color:var(--${cls === 'high' ? 'green' : cls === 'mid' ? 'orange' : 'red'})">${s.overall}%</span>
      </div>`;
    });

    // Clear button
    html += `<div style="text-align:center;margin:2rem 0">
      <button class="btn btn-outline btn-sm" id="clear-scores" style="color:var(--red);border-color:var(--red)">🗑️ Clear All Scores</button>
    </div>`;

    container.innerHTML = html;

    // Re-attach clear handler
    document.getElementById('clear-scores')?.addEventListener('click', () => {
      if (confirm('Clear all saved scores? This cannot be undone.')) {
        ScoreStore.clear();
        renderDashboard();
      }
    });
  }
})();
