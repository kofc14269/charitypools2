// Pick'em / Over-Under / Confidence Pool Component
import { authStore } from '../auth-store.js';
import { db, doc, setDoc } from '../firebase.js';
import { showToast, sanitize, formatDate } from '../utils.js';

export function renderPickem(pool) {
  const games = pool.games || [];
  const userPicks = pool.userPicks?.[authStore.uid] || {};
  const results = pool.results || {};
  const isOpen = pool.status === 'open';
  const type = pool.type; // pickem, overunder, confidence

  if (games.length === 0) {
    return `
      <div class="card" style="text-align:center;padding:48px;">
        <div style="font-size:3rem;margin-bottom:16px;">🎯</div>
        <h3>Games Not Set</h3>
        <p style="color:var(--text-secondary);margin-top:8px;">The admin hasn't added games to this pool yet.</p>
      </div>
    `;
  }

  let html = `
    <div class="card">
      <div class="card-header">
        <h3>${type === 'overunder' ? '📊 Over/Under Picks' : type === 'confidence' ? '🎯 Confidence Picks' : '🏆 Pick\'em'}</h3>
        ${isOpen ? `<button class="btn btn-primary btn-sm" id="save-picks-btn">Save Picks</button>` : ''}
      </div>

      ${type === 'confidence' ? '<p style="color:var(--text-secondary);margin-bottom:16px;font-size:0.9rem;">Rank your picks by confidence (highest number = most confident).</p>' : ''}

      <div id="picks-list">
        ${games.map((game, i) => {
          const gameKey = `game_${i}`;
          const pick = userPicks[gameKey] || {};
          const result = results[gameKey] || {};
          const isCorrect = result.winner && pick.pick === result.winner;
          const isWrong = result.winner && pick.pick && pick.pick !== result.winner;

          return `
            <div class="card" style="margin-bottom:8px;padding:16px 20px;border-color:${isCorrect ? 'var(--accent-football)' : isWrong ? '#ef4444' : 'var(--border-glass)'};">
              <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;">
                <div style="flex:1;">
                  <div style="font-size:0.8rem;color:var(--text-muted);margin-bottom:4px;">${formatDate(game.date)} ${game.time || ''}</div>
                  <div style="display:flex;align-items:center;gap:16px;">
                    <button class="btn btn-sm ${pick.pick === game.away ? 'btn-primary' : 'btn-secondary'} pick-btn"
                            data-game="${gameKey}" data-pick="${sanitize(game.away)}" ${!isOpen ? 'disabled' : ''}>
                      ${sanitize(game.away)}
                    </button>
                    <span style="color:var(--text-muted);font-weight:700;">@</span>
                    <button class="btn btn-sm ${pick.pick === game.home ? 'btn-primary' : 'btn-secondary'} pick-btn"
                            data-game="${gameKey}" data-pick="${sanitize(game.home)}" ${!isOpen ? 'disabled' : ''}>
                      ${sanitize(game.home)}
                    </button>
                  </div>
                  ${type === 'overunder' && game.total ? `
                    <div style="margin-top:8px;display:flex;gap:8px;align-items:center;">
                      <span style="font-size:0.85rem;color:var(--text-muted);">O/U ${game.total}:</span>
                      <button class="btn btn-sm ${pick.ou === 'over' ? 'btn-primary' : 'btn-secondary'} ou-btn" data-game="${gameKey}" data-ou="over" ${!isOpen ? 'disabled' : ''}>Over</button>
                      <button class="btn btn-sm ${pick.ou === 'under' ? 'btn-primary' : 'btn-secondary'} ou-btn" data-game="${gameKey}" data-ou="under" ${!isOpen ? 'disabled' : ''}>Under</button>
                    </div>
                  ` : ''}
                  ${type === 'confidence' ? `
                    <div style="margin-top:8px;">
                      <label class="form-label">Confidence (1-${games.length}):</label>
                      <input type="number" class="form-input confidence-input" data-game="${gameKey}" min="1" max="${games.length}" value="${pick.confidence || ''}" style="width:80px;" ${!isOpen ? 'disabled' : ''} />
                    </div>
                  ` : ''}
                </div>
                <div style="text-align:right;">
                  ${result.winner ? `
                    <div style="font-size:0.85rem;font-weight:700;color:${isCorrect ? 'var(--accent-football)' : '#ef4444'};">
                      ${isCorrect ? '✓ Correct' : isWrong ? '✕ Wrong' : ''}
                    </div>
                    <div style="font-size:0.8rem;color:var(--text-muted);">Winner: ${sanitize(result.winner)}</div>
                    ${result.score ? `<div style="font-size:0.8rem;color:var(--text-muted);">${result.score}</div>` : ''}
                  ` : ''}
                </div>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `;

  return html;
}

export function bindPickem(pool) {
  if (pool.status !== 'open') return;

  const picks = { ...(pool.userPicks?.[authStore.uid] || {}) };

  // Pick buttons (pick winner)
  document.querySelectorAll('.pick-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const gameKey = btn.dataset.game;
      const pickValue = btn.dataset.pick;
      if (!picks[gameKey]) picks[gameKey] = {};
      picks[gameKey].pick = pickValue;

      // Update UI
      const siblings = document.querySelectorAll(`.pick-btn[data-game="${gameKey}"]`);
      siblings.forEach(s => { s.classList.remove('btn-primary'); s.classList.add('btn-secondary'); });
      btn.classList.remove('btn-secondary');
      btn.classList.add('btn-primary');
    });
  });

  // Over/Under buttons
  document.querySelectorAll('.ou-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const gameKey = btn.dataset.game;
      const ouValue = btn.dataset.ou;
      if (!picks[gameKey]) picks[gameKey] = {};
      picks[gameKey].ou = ouValue;

      const siblings = document.querySelectorAll(`.ou-btn[data-game="${gameKey}"]`);
      siblings.forEach(s => { s.classList.remove('btn-primary'); s.classList.add('btn-secondary'); });
      btn.classList.remove('btn-secondary');
      btn.classList.add('btn-primary');
    });
  });

  // Confidence inputs
  document.querySelectorAll('.confidence-input').forEach(input => {
    input.addEventListener('change', () => {
      const gameKey = input.dataset.game;
      if (!picks[gameKey]) picks[gameKey] = {};
      picks[gameKey].confidence = parseInt(input.value) || 0;
    });
  });

  // Save button
  document.getElementById('save-picks-btn')?.addEventListener('click', async () => {
    if (!authStore.isLoggedIn) {
      showToast('Please log in first', 'error');
      return;
    }
    try {
      const poolRef = doc(db, 'pools', pool.id);
      await setDoc(poolRef, {
        userPicks: {
          ...(pool.userPicks || {}),
          [authStore.uid]: picks
        }
      }, { merge: true });
      showToast('Picks saved! 🎯', 'success');
    } catch (err) {
      console.error('Save picks error:', err);
      showToast('Failed to save picks', 'error');
    }
  });
}
