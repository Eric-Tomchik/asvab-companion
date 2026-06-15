/* ============================================================
   Flashcards
   ============================================================ */

(function() {
  const state = {
    cards: [],
    current: 0,
    flipped: false,
    starred: new Set(),
    mode: 'all'
  };

  document.addEventListener('DOMContentLoaded', () => {
    if (!window.FLASHCARD_DATA) return;
    state.cards = [...window.FLASHCARD_DATA];

    // Load starred
    try {
      const saved = JSON.parse(localStorage.getItem('asvab_starred') || '[]');
      state.starred = new Set(saved);
    } catch {}

    updateModeButtons();
    renderCard();

    // Controls
    document.getElementById('fc-prev')?.addEventListener('click', () => navigate(-1));
    document.getElementById('fc-next')?.addEventListener('click', () => navigate(1));
    document.getElementById('fc-shuffle')?.addEventListener('click', shuffleCards);
    document.getElementById('fc-star')?.addEventListener('click', toggleStar);

    // Card flip
    document.getElementById('flashcard')?.addEventListener('click', () => {
      state.flipped = !state.flipped;
      const fc = document.getElementById('flashcard');
      if (fc) fc.classList.toggle('flipped', state.flipped);
    });

    // Keyboard
    document.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft') navigate(-1);
      else if (e.key === 'ArrowRight') navigate(1);
      else if (e.key === ' ') { e.preventDefault(); document.getElementById('flashcard')?.click(); }
      else if (e.key === 's') toggleStar();
    });

    // Mode buttons
    document.querySelectorAll('.fc-mode').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.fc-mode').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        state.mode = btn.dataset.mode;
        state.current = 0;
        state.flipped = false;
        document.getElementById('flashcard')?.classList.remove('flipped');
        filterCards();
        renderCard();
      });
    });
  });

  function filterCards() {
    if (state.mode === 'starred') {
      state.cards = window.FLASHCARD_DATA.filter(c => state.starred.has(c.id));
    } else if (state.mode === 'formulas') {
      state.cards = window.FLASHCARD_DATA.filter(c => c.cat === 'formula');
    } else if (state.mode === 'vocab') {
      state.cards = window.FLASHCARD_DATA.filter(c => c.cat === 'vocab');
    } else if (state.mode === 'science') {
      state.cards = window.FLASHCARD_DATA.filter(c => c.cat === 'science');
    } else {
      state.cards = [...window.FLASHCARD_DATA];
    }
  }

  function navigate(dir) {
    state.current = Math.max(0, Math.min(state.cards.length - 1, state.current + dir));
    state.flipped = false;
    document.getElementById('flashcard')?.classList.remove('flipped');
    renderCard();
  }

  function shuffleCards() {
    state.cards = shuffle(state.cards);
    state.current = 0;
    state.flipped = false;
    document.getElementById('flashcard')?.classList.remove('flipped');
    renderCard();
  }

  function toggleStar() {
    if (!state.cards.length) return;
    const card = state.cards[state.current];
    if (state.starred.has(card.id)) {
      state.starred.delete(card.id);
    } else {
      state.starred.add(card.id);
    }
    localStorage.setItem('asvab_starred', JSON.stringify([...state.starred]));
    updateModeButtons();
    renderCard();
  }

  function updateModeButtons() {
    const starBtn = document.querySelector('.fc-mode[data-mode="starred"]');
    if (starBtn) starBtn.textContent = `⭐ Starred (${state.starred.size})`;
  }

  function renderCard() {
    if (!state.cards.length) {
      document.querySelector('.fc-term').textContent = 'No cards';
      document.querySelector('.fc-def').textContent = state.mode === 'starred' ? 'Star some cards first!' : 'No cards in this category';
      document.getElementById('fc-counter').textContent = '0 / 0';
      return;
    }

    const card = state.cards[state.current];
    document.querySelector('.fc-term').textContent = card.front;
    document.querySelector('.fc-def').textContent = card.back;
    document.getElementById('fc-counter').textContent = `${state.current + 1} / ${state.cards.length}`;

    // Star button
    const starBtn = document.getElementById('fc-star');
    if (starBtn) starBtn.textContent = state.starred.has(card.id) ? '★' : '☆';

    // Progress bar
    const fill = document.querySelector('.flashcard-progress-fill');
    if (fill) fill.style.width = `${((state.current + 1) / state.cards.length) * 100}%`;

    // Category tag
    const catEl = document.getElementById('fc-category');
    if (catEl && card.cat) catEl.textContent = card.cat;
  }
})();
