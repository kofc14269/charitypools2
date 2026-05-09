// Admin Pool Management
import { authStore } from '../auth-store.js';
import { db, collection, getDocs, addDoc, doc, updateDoc, deleteDoc, query, where, serverTimestamp } from '../firebase.js';
import { formatCurrency, formatDate, showToast, showModal, closeModal, sportIcon, poolTypeLabel, spinner, sanitize } from '../utils.js';
import { router } from '../router.js';

export function renderAdminPools() {
  return `
    <div class="page-wrapper">
      <div class="admin-layout">
        <nav class="admin-sidebar">
          <div class="admin-sidebar-section"><div class="admin-sidebar-title">Management</div></div>
          <a href="#/admin" class="admin-sidebar-link">📊 Dashboard</a>
          <a href="#/admin/pools" class="admin-sidebar-link active">🎯 Pools</a>
          <a href="#/admin/users" class="admin-sidebar-link">👥 Users</a>
          <a href="#/admin/payments" class="admin-sidebar-link">💳 Payments</a>
          <a href="#/admin/settings" class="admin-sidebar-link">⚙️ Settings</a>
        </nav>
        <div class="admin-content">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:32px;">
            <h1>Manage Pools</h1>
            <button class="btn btn-primary" id="create-pool-btn">+ Create Pool</button>
          </div>
          <div id="admin-pools-list">${spinner()}</div>
        </div>
      </div>
    </div>
  `;
}

export async function bindAdminPools() {
  await loadPoolsList();

  document.getElementById('create-pool-btn').addEventListener('click', () => {
    showCreatePoolModal();
  });
}

async function loadPoolsList() {
  const orgId = authStore.orgId;
  if (!orgId) return;

  try {
    const snap = await getDocs(query(collection(db, 'pools'), where('orgId', '==', orgId)));
    const pools = snap.docs.map(d => ({ id: d.id, ...d.data() }));

    const listEl = document.getElementById('admin-pools-list');
    if (pools.length === 0) {
      listEl.innerHTML = `
        <div class="card" style="text-align:center;padding:48px;">
          <div style="font-size:3rem;margin-bottom:16px;">🎯</div>
          <h3>No pools yet</h3>
          <p style="color:var(--text-secondary);margin-top:8px;">Create your first charity pool!</p>
        </div>
      `;
      return;
    }

    listEl.innerHTML = `
      <table class="data-table">
        <thead>
          <tr>
            <th>Pool Name</th><th>Type</th><th>Sport</th><th>Status</th>
            <th>Participants</th><th>Entry Fee</th><th>Charity %</th><th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${pools.map(p => `
            <tr>
              <td style="font-weight:600;">${sanitize(p.name)}</td>
              <td>${poolTypeLabel(p.type)}</td>
              <td>${sportIcon(p.sport)} ${p.sport}</td>
              <td><span class="badge badge-${p.status}">${p.status}</span></td>
              <td>${(p.participants || []).length}</td>
              <td>${formatCurrency(p.entryFee || 0)}</td>
              <td>${p.charityPercent || 0}%</td>
              <td>
                <div style="display:flex;gap:8px;">
                  <button class="btn btn-secondary btn-sm edit-pool-btn" data-id="${p.id}">Edit</button>
                  <button class="btn btn-secondary btn-sm" onclick="location.hash='#/pool/${p.id}'">View</button>
                  <button class="btn btn-danger btn-sm delete-pool-btn" data-id="${p.id}" data-name="${sanitize(p.name)}">Delete</button>
                </div>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;

    // Edit buttons
    document.querySelectorAll('.edit-pool-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const poolId = btn.dataset.id;
        const poolSnap = await getDoc(doc(db, 'pools', poolId));
        if (poolSnap.exists()) showEditPoolModal({ id: poolSnap.id, ...poolSnap.data() });
      });
    });

    // Delete buttons
    document.querySelectorAll('.delete-pool-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        if (confirm(`Delete pool "${btn.dataset.name}"? This cannot be undone.`)) {
          deleteDoc(doc(db, 'pools', btn.dataset.id)).then(() => {
            showToast('Pool deleted', 'success');
            loadPoolsList();
          });
        }
      });
    });
  } catch (err) {
    console.error('Load pools error:', err);
  }
}

function showCreatePoolModal() {
  const html = `
    <h2 class="modal-title">Create New Pool</h2>
    <form id="create-pool-form">
      <div class="form-group">
        <label class="form-label" for="pool-name">Pool Name</label>
        <input class="form-input" id="pool-name" required placeholder="e.g. Super Bowl LXI Squares" />
      </div>
      <div class="grid grid-2">
        <div class="form-group">
          <label class="form-label" for="pool-type">Pool Type</label>
          <select class="form-select" id="pool-type" required>
            <option value="squares">🏈 Squares (10×10 Grid)</option>
            <option value="bracket">🏀 Bracket (March Madness)</option>
            <option value="pickem">🎯 Pick'em</option>
            <option value="overunder">📊 Over/Under</option>
            <option value="confidence">🎯 Confidence Pool</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label" for="pool-sport">Sport</label>
          <select class="form-select" id="pool-sport" required>
            <option value="football">🏈 Football</option>
            <option value="basketball">🏀 Basketball</option>
            <option value="baseball">⚾ Baseball</option>
          </select>
        </div>
      </div>
      <div class="grid grid-2">
        <div class="form-group">
          <label class="form-label" for="pool-fee">Entry Fee ($)</label>
          <input class="form-input" id="pool-fee" type="number" min="0" step="1" value="25" required />
        </div>
        <div class="form-group">
          <label class="form-label" for="pool-charity">Charity Percentage (%)</label>
          <input class="form-input" id="pool-charity" type="number" min="0" max="100" value="20" required />
        </div>
      </div>
      <div class="form-group">
        <label class="form-label" for="pool-deadline">Registration Deadline</label>
        <input class="form-input" id="pool-deadline" type="datetime-local" required />
      </div>
      <div class="form-group" id="squares-options" style="display:none;">
        <label class="form-label">Squares Options</label>
        <div class="grid grid-2" style="gap:8px;">
          <div class="form-group">
            <label class="form-label" for="home-team">Home Team</label>
            <input class="form-input" id="home-team" placeholder="e.g. Chiefs" />
          </div>
          <div class="form-group">
            <label class="form-label" for="away-team">Away Team</label>
            <input class="form-input" id="away-team" placeholder="e.g. Eagles" />
          </div>
        </div>
        <label class="form-label" style="margin-top:8px;">Payout Type</label>
        <select class="form-select" id="payout-type">
          <option value="quarters">Quarter Payouts (Q1, Q2, Q3, Final)</option>
          <option value="score_change">Score Change (every score)</option>
          <option value="neighboring">Neighboring Boxes Bonus</option>
        </select>
      </div>
      <div class="form-group">
        <label class="form-label" for="pool-rules">Rules</label>
        <textarea class="form-textarea" id="pool-rules" placeholder="Enter pool rules and details..."></textarea>
      </div>
      <div class="modal-actions">
        <button type="button" class="btn btn-secondary" id="cancel-create">Cancel</button>
        <button type="submit" class="btn btn-primary">Create Pool</button>
      </div>
    </form>
  `;
  showModal(html);

  // Show/hide squares options
  document.getElementById('pool-type').addEventListener('change', (e) => {
    document.getElementById('squares-options').style.display = e.target.value === 'squares' ? 'block' : 'none';
  });

  document.getElementById('cancel-create').addEventListener('click', closeModal);

  document.getElementById('create-pool-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const poolData = {
      name: document.getElementById('pool-name').value.trim(),
      type: document.getElementById('pool-type').value,
      sport: document.getElementById('pool-sport').value,
      entryFee: parseFloat(document.getElementById('pool-fee').value),
      charityPercent: parseInt(document.getElementById('pool-charity').value),
      deadline: new Date(document.getElementById('pool-deadline').value).toISOString(),
      rules: document.getElementById('pool-rules').value.trim(),
      status: 'open',
      orgId: authStore.orgId,
      createdBy: authStore.uid,
      participants: [],
      participantAliases: {},
      createdAt: serverTimestamp()
    };

    if (poolData.type === 'squares') {
      poolData.homeTeam = document.getElementById('home-team').value.trim() || 'Home';
      poolData.awayTeam = document.getElementById('away-team').value.trim() || 'Away';
      poolData.payoutType = document.getElementById('payout-type').value;
      // Firestore doesn't support nested arrays — use flat map with "r{row}c{col}" keys
      const grid = {};
      for (let r = 0; r < 10; r++) {
        for (let c = 0; c < 10; c++) {
          grid[`r${r}c${c}`] = null;
        }
      }
      poolData.squaresData = {
        grid,
        rowNumbers: [0,1,2,3,4,5,6,7,8,9],
        colNumbers: [0,1,2,3,4,5,6,7,8,9],
        scores: {},
        winners: {}
      };
    } else if (poolData.type === 'bracket') {
      poolData.bracketData = { teams: [], results: {}, userPicks: {}, scoring: { round1: 1, round2: 2, round3: 4, round4: 8, round5: 16, round6: 32 }, leaderboard: [] };
    } else {
      poolData.games = [];
      poolData.userPicks = {};
      poolData.results = {};
    }

    try {
      await addDoc(collection(db, 'pools'), poolData);
      closeModal();
      showToast('Pool created! 🎉', 'success');
      await loadPoolsList();
    } catch (err) {
      console.error('Create pool error:', err);
      showToast('Failed to create pool', 'error');
    }
  });
}

function showEditPoolModal(pool) {
  const html = `
    <h2 class="modal-title">Edit: ${sanitize(pool.name)}</h2>
    <form id="edit-pool-form">
      <div class="form-group">
        <label class="form-label">Pool Name</label>
        <input class="form-input" id="edit-name" value="${sanitize(pool.name)}" required />
      </div>
      <div class="grid grid-2">
        <div class="form-group">
          <label class="form-label">Entry Fee ($)</label>
          <input class="form-input" id="edit-fee" type="number" value="${pool.entryFee || 0}" />
        </div>
        <div class="form-group">
          <label class="form-label">Charity %</label>
          <input class="form-input" id="edit-charity" type="number" value="${pool.charityPercent || 0}" />
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Status</label>
        <select class="form-select" id="edit-status">
          <option value="open" ${pool.status === 'open' ? 'selected' : ''}>Open</option>
          <option value="locked" ${pool.status === 'locked' ? 'selected' : ''}>Locked</option>
          <option value="in_progress" ${pool.status === 'in_progress' ? 'selected' : ''}>In Progress</option>
          <option value="completed" ${pool.status === 'completed' ? 'selected' : ''}>Completed</option>
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Rules</label>
        <textarea class="form-textarea" id="edit-rules">${pool.rules || ''}</textarea>
      </div>
      ${pool.type === 'squares' ? `
        <div class="form-group">
          <label class="form-label">Assign Random Numbers (comma-separated 0-9)</label>
          <div class="grid grid-2" style="gap:8px;">
            <div>
              <label class="form-label">Row Numbers (Home)</label>
              <input class="form-input" id="edit-row-nums" value="${(pool.squaresData?.rowNumbers || []).join(',')}" placeholder="e.g. 3,7,1,0,5,9,2,8,6,4" />
            </div>
            <div>
              <label class="form-label">Column Numbers (Away)</label>
              <input class="form-input" id="edit-col-nums" value="${(pool.squaresData?.colNumbers || []).join(',')}" placeholder="e.g. 5,2,9,0,8,1,6,3,7,4" />
            </div>
          </div>
          <button type="button" class="btn btn-secondary btn-sm" id="randomize-nums" style="margin-top:8px;">🎲 Randomize Numbers</button>
        </div>
        <div class="form-group">
          <label class="form-label">Enter Scores</label>
          <div class="grid grid-4" style="gap:8px;">
            ${['q1','q2','q3','final'].map(q => `
              <div>
                <label class="form-label">${q.toUpperCase()}</label>
                <input class="form-input" id="score-${q}-away" type="number" placeholder="Away" value="${pool.squaresData?.scores?.[q]?.away || ''}" style="margin-bottom:4px;" />
                <input class="form-input" id="score-${q}-home" type="number" placeholder="Home" value="${pool.squaresData?.scores?.[q]?.home || ''}" />
              </div>
            `).join('')}
          </div>
        </div>
      ` : ''}
      <div class="modal-actions">
        <button type="button" class="btn btn-secondary" id="cancel-edit">Cancel</button>
        <button type="submit" class="btn btn-primary">Save Changes</button>
      </div>
    </form>
  `;
  showModal(html);

  // Randomize button for squares
  document.getElementById('randomize-nums')?.addEventListener('click', () => {
    const shuffle = () => {
      const arr = [0,1,2,3,4,5,6,7,8,9];
      for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; }
      return arr;
    };
    document.getElementById('edit-row-nums').value = shuffle().join(',');
    document.getElementById('edit-col-nums').value = shuffle().join(',');
  });

  document.getElementById('cancel-edit').addEventListener('click', closeModal);

  document.getElementById('edit-pool-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const updates = {
      name: document.getElementById('edit-name').value.trim(),
      entryFee: parseFloat(document.getElementById('edit-fee').value),
      charityPercent: parseInt(document.getElementById('edit-charity').value),
      status: document.getElementById('edit-status').value,
      rules: document.getElementById('edit-rules').value.trim()
    };

    if (pool.type === 'squares') {
      const rowNums = document.getElementById('edit-row-nums').value.split(',').map(n => parseInt(n.trim()));
      const colNums = document.getElementById('edit-col-nums').value.split(',').map(n => parseInt(n.trim()));
      if (rowNums.length === 10) updates['squaresData.rowNumbers'] = rowNums;
      if (colNums.length === 10) updates['squaresData.colNumbers'] = colNums;

      // Scores
      ['q1','q2','q3','final'].forEach(q => {
        const away = document.getElementById(`score-${q}-away`).value;
        const home = document.getElementById(`score-${q}-home`).value;
        if (away !== '' && home !== '') {
          updates[`squaresData.scores.${q}`] = { away: parseInt(away), home: parseInt(home) };
          // Auto-calculate winner using flat grid
          const grid = pool.squaresData?.grid || {};
          const rNums = rowNums.length === 10 ? rowNums : (pool.squaresData?.rowNumbers || []);
          const cNums = colNums.length === 10 ? colNums : (pool.squaresData?.colNumbers || []);
          const homeDigit = parseInt(home) % 10;
          const awayDigit = parseInt(away) % 10;
          const rowIdx = rNums.indexOf(homeDigit);
          const colIdx = cNums.indexOf(awayDigit);
          const cellKey = `r${rowIdx}c${colIdx}`;
          if (rowIdx >= 0 && colIdx >= 0 && grid[cellKey]) {
            updates[`squaresData.winners.${q}`] = grid[cellKey];
          }
        }
      });
    }

    try {
      await updateDoc(doc(db, 'pools', pool.id), updates);
      closeModal();
      showToast('Pool updated!', 'success');
      await loadPoolsList();
    } catch (err) {
      console.error('Edit pool error:', err);
      showToast('Failed to update pool', 'error');
    }
  });
}

// Need getDoc for edit
import { getDoc } from '../firebase.js';
