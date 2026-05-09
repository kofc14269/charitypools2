// March Madness Bracket Component
import { authStore } from '../auth-store.js';
import { db, doc, getDoc, setDoc } from '../firebase.js';
import { showToast, sanitize } from '../utils.js';

const ROUND_NAMES = ['Round of 64', 'Round of 32', 'Sweet 16', 'Elite 8', 'Final Four', 'Championship'];

export function renderBracket(pool) {
  const bracketData = pool.bracketData || {};
  const teams = bracketData.teams || [];
  const results = bracketData.results || {};
  const userPicks = bracketData.userPicks?.[authStore.uid] || {};
  const scoring = bracketData.scoring || { round1: 1, round2: 2, round3: 4, round4: 8, round5: 16, round6: 32 };
  const leaderboard = bracketData.leaderboard || [];

  if (teams.length === 0) {
    return `
      <div class="card" style="text-align:center;padding:48px;">
        <div style="font-size:3rem;margin-bottom:16px;">🏀</div>
        <h3>Bracket Not Ready</h3>
        <p style="color:var(--text-secondary);margin-top:8px;">The admin hasn't set up the bracket teams yet.</p>
      </div>
    `;
  }

  // Calculate number of rounds
  const numRounds = Math.log2(teams.length);

  let html = `
    <div class="card" style="margin-bottom:24px;">
      <div class="card-header">
        <h3>🏀 Tournament Bracket</h3>
        ${pool.status === 'open' ? `<button class="btn btn-primary btn-sm" id="save-bracket-btn">Save My Picks</button>` : ''}
      </div>
      <div style="margin-bottom:16px;display:flex;gap:16px;flex-wrap:wrap;">
        ${Object.entries(scoring).map(([k, v]) => `
          <span style="font-size:0.8rem;color:var(--text-muted);">${ROUND_NAMES[parseInt(k.replace('round',''))-1] || k}: <strong style="color:var(--accent-teal);">${v}pts</strong></span>
        `).join('')}
      </div>
      <div class="bracket-container">
        <div class="bracket" id="bracket-view">
          ${renderBracketRounds(teams, numRounds, results, userPicks)}
        </div>
      </div>
    </div>

    ${leaderboard.length > 0 ? `
      <div class="card">
        <h3 style="margin-bottom:16px;">🏆 Leaderboard</h3>
        <div class="leaderboard">
          <div class="leaderboard-row header">
            <div>#</div><div>Player</div><div style="text-align:right;">Score</div><div style="text-align:right;">Payout</div>
          </div>
          ${leaderboard.map((entry, i) => `
            <div class="leaderboard-row">
              <div class="leaderboard-rank ${i === 0 ? 'gold' : i === 1 ? 'silver' : i === 2 ? 'bronze' : ''}">${i + 1}</div>
              <div class="leaderboard-alias">${sanitize(entry.alias)}</div>
              <div class="leaderboard-score">${entry.score}</div>
              <div class="leaderboard-payout">${entry.payout ? '$' + entry.payout : '—'}</div>
            </div>
          `).join('')}
        </div>
      </div>
    ` : ''}
  `;

  return html;
}

function renderBracketRounds(teams, numRounds, results, userPicks) {
  let html = '';
  for (let round = 0; round < numRounds; round++) {
    const gamesInRound = teams.length / Math.pow(2, round + 1);
    const roundName = ROUND_NAMES[round] || `Round ${round + 1}`;

    html += `<div class="bracket-round" data-round="${round}">`;
    html += `<div class="bracket-round-title">${roundName}</div>`;

    for (let game = 0; game < gamesInRound; game++) {
      const gameKey = `r${round}g${game}`;
      const result = results[gameKey] || {};
      const pick = userPicks[gameKey] || null;

      let team1 = '', team2 = '', seed1 = '', seed2 = '';
      if (round === 0) {
        const idx1 = game * 2;
        const idx2 = game * 2 + 1;
        team1 = teams[idx1]?.name || `Team ${idx1 + 1}`;
        team2 = teams[idx2]?.name || `Team ${idx2 + 1}`;
        seed1 = teams[idx1]?.seed || '';
        seed2 = teams[idx2]?.seed || '';
      } else {
        // Teams come from previous round winners
        const prevGame1 = `r${round-1}g${game*2}`;
        const prevGame2 = `r${round-1}g${game*2+1}`;
        team1 = results[prevGame1]?.winner || userPicks[prevGame1] || 'TBD';
        team2 = results[prevGame2]?.winner || userPicks[prevGame2] || 'TBD';
      }

      const t1Class = getTeamClass(team1, pick, result.winner);
      const t2Class = getTeamClass(team2, pick, result.winner);

      html += `
        <div class="bracket-matchup" data-game="${gameKey}">
          <div class="bracket-team ${t1Class}" data-team="${sanitize(team1)}" data-game="${gameKey}">
            ${seed1 ? `<span class="bracket-seed">${seed1}</span>` : ''}
            <span>${sanitize(team1)}</span>
          </div>
          <div class="bracket-team ${t2Class}" data-team="${sanitize(team2)}" data-game="${gameKey}">
            ${seed2 ? `<span class="bracket-seed">${seed2}</span>` : ''}
            <span>${sanitize(team2)}</span>
          </div>
        </div>
      `;
    }
    html += '</div>';
  }
  return html;
}

function getTeamClass(team, pick, winner) {
  if (!winner && !pick) return '';
  if (pick === team && !winner) return 'selected';
  if (winner && pick === team && winner === team) return 'correct';
  if (winner && pick === team && winner !== team) return 'incorrect';
  if (winner === team) return 'correct';
  return '';
}

export function bindBracket(pool) {
  if (pool.status !== 'open') return;

  const bracketEl = document.getElementById('bracket-view');
  if (!bracketEl) return;

  // Track user picks in memory
  const picks = { ...(pool.bracketData?.userPicks?.[authStore.uid] || {}) };

  bracketEl.addEventListener('click', (e) => {
    const teamEl = e.target.closest('.bracket-team');
    if (!teamEl) return;
    if (!authStore.isLoggedIn) {
      showToast('Please log in to make picks', 'error');
      return;
    }

    const gameKey = teamEl.dataset.game;
    const team = teamEl.dataset.team;
    if (team === 'TBD') return;

    // Select this team
    const matchup = teamEl.closest('.bracket-matchup');
    matchup.querySelectorAll('.bracket-team').forEach(t => t.classList.remove('selected'));
    teamEl.classList.add('selected');
    picks[gameKey] = team;
  });

  // Save picks
  document.getElementById('save-bracket-btn')?.addEventListener('click', async () => {
    if (!authStore.isLoggedIn) {
      showToast('Please log in first', 'error');
      return;
    }

    try {
      const poolRef = doc(db, 'pools', pool.id);
      await setDoc(poolRef, {
        bracketData: {
          ...pool.bracketData,
          userPicks: {
            ...(pool.bracketData?.userPicks || {}),
            [authStore.uid]: picks
          }
        }
      }, { merge: true });

      showToast('Bracket picks saved! 🏀', 'success');
    } catch (err) {
      console.error('Save bracket error:', err);
      showToast('Failed to save picks', 'error');
    }
  });
}
