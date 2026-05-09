// Super Bowl Squares Grid Component
// Grid uses flat map format: { "r0c0": null, "r0c1": "uid123", ... }
import { authStore } from '../auth-store.js';
import { db, doc, getDoc, updateDoc, arrayUnion, addDoc, collection } from '../firebase.js';
import { showToast, showModal, closeModal, sanitize, formatCurrency } from '../utils.js';
import { buildPaymentRecord } from '../stripe.js';

// Helper: get cell value from flat grid
function getCell(grid, r, c) {
  if (!grid) return null;
  return grid[`r${r}c${c}`] || null;
}

// Track selected (not yet purchased) squares
let selectedSquares = [];
let currentPoolRef = null;

export function renderSquaresGrid(pool) {
  const squaresData = pool.squaresData || {};
  const grid = squaresData.grid || {};
  const rowNums = squaresData.rowNumbers || [0,1,2,3,4,5,6,7,8,9];
  const colNums = squaresData.colNumbers || [0,1,2,3,4,5,6,7,8,9];
  const homeTeam = pool.homeTeam || 'Home';
  const awayTeam = pool.awayTeam || 'Away';
  const scores = squaresData.scores || {};
  const winners = squaresData.winners || {};
  const payoutType = pool.payoutType || 'quarters';
  const pricePerSquare = pool.entryFee || 0;

  // Build participant lookup
  const participantNames = pool.participantAliases || {};

  // Count available squares
  let availableCount = 0;
  for (let r = 0; r < 10; r++) {
    for (let c = 0; c < 10; c++) {
      if (!getCell(grid, r, c)) availableCount++;
    }
  }

  // Build rows from flat grid
  let gridCells = '';
  for (let r = 0; r < 10; r++) {
    gridCells += `<div class="squares-header">${rowNums[r]}</div>`;
    for (let c = 0; c < 10; c++) {
      const cell = getCell(grid, r, c);
      const isMine = cell === authStore.uid;
      const isClaimed = cell !== null;
      const isWinner = Object.values(winners).includes(cell) && cell === authStore.uid;
      const alias = cell ? (participantNames[cell] || '?') : '';
      const classes = ['square-cell'];
      if (isMine) classes.push('mine');
      else if (isClaimed) classes.push('claimed');
      if (isWinner) classes.push('winner');
      gridCells += `<div class="${classes.join(' ')}" data-row="${r}" data-col="${c}" title="${alias}">${alias ? alias.substring(0, 3) : ''}</div>`;
    }
  }

  let html = `
    <div class="card" style="margin-bottom:24px;">
      <div class="card-header">
        <h3>🏈 Squares Grid</h3>
        <div style="display:flex;gap:12px;align-items:center;">
          <span style="color:var(--text-muted);font-size:0.85rem;">${availableCount} available</span>
          <span class="badge badge-${pool.status}">${pool.status}</span>
        </div>
      </div>

      ${pool.status === 'open' && authStore.isLoggedIn ? `
        <div style="background:var(--bg-glass);border:1px solid var(--border-glass);border-radius:var(--radius-sm);padding:12px 16px;margin-bottom:16px;font-size:0.9rem;color:var(--text-secondary);">
          💡 <strong>Click squares</strong> to select them, then proceed to payment. Each square costs <strong>${formatCurrency(pricePerSquare)}</strong>.
        </div>
      ` : ''}

      ${scores.q1 ? `
        <div style="display:flex;gap:24px;margin-bottom:16px;flex-wrap:wrap;">
          ${renderScoreBox('Q1', scores.q1, winners.q1, participantNames)}
          ${renderScoreBox('Q2', scores.q2, winners.q2, participantNames)}
          ${renderScoreBox('Q3', scores.q3, winners.q3, participantNames)}
          ${renderScoreBox('Final', scores.final, winners.final, participantNames)}
        </div>
      ` : ''}

      <div class="squares-container">
        <div style="text-align:center;font-weight:700;margin-bottom:8px;color:var(--accent-teal);">${sanitize(awayTeam)}</div>
        <div class="squares-grid" id="squares-grid">
          <div class="squares-header" style="font-size:0.7rem;color:var(--text-muted);">
            ${sanitize(homeTeam).substring(0, 4)}<br>↓ / →
          </div>
          ${colNums.map(n => `<div class="squares-header">${n}</div>`).join('')}
          ${gridCells}
        </div>
        <div style="text-align:left;font-weight:700;margin-top:8px;color:var(--accent-teal);writing-mode:vertical-lr;position:relative;left:-8px;">${sanitize(homeTeam)}</div>
      </div>

      <div style="margin-top:16px;display:flex;gap:16px;flex-wrap:wrap;font-size:0.85rem;">
        <span><span class="square-cell mine" style="display:inline-block;width:16px;height:16px;font-size:0;"></span> Your squares</span>
        <span><span class="square-cell claimed" style="display:inline-block;width:16px;height:16px;font-size:0;"></span> Claimed</span>
        <span><span class="square-cell" style="display:inline-block;width:16px;height:16px;font-size:0;"></span> Available</span>
        <span><span class="square-cell selected" style="display:inline-block;width:16px;height:16px;font-size:0;"></span> Selected</span>
      </div>
    </div>

    ${payoutType === 'neighboring' ? `
      <div class="card" style="margin-bottom:24px;">
        <h3 style="margin-bottom:12px;">🔲 Neighboring Boxes</h3>
        <p style="color:var(--text-secondary);font-size:0.9rem;">Bonus payouts for squares adjacent to the winning square (up, down, left, right, and diagonals).</p>
      </div>
    ` : ''}

    <!-- Sticky cart bar for selected squares -->
    <div id="squares-cart" style="display:none;position:fixed;bottom:0;left:0;right:0;z-index:1000;background:linear-gradient(135deg,rgba(20,20,40,0.98),rgba(30,30,50,0.98));border-top:2px solid var(--accent-teal);padding:16px 24px;backdrop-filter:blur(20px);">
      <div style="max-width:1200px;margin:0 auto;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;">
        <div>
          <span style="font-size:1.1rem;font-weight:700;" id="cart-count">0 squares</span>
          <span style="color:var(--text-muted);margin:0 8px;">×</span>
          <span style="color:var(--text-secondary);">${formatCurrency(pricePerSquare)} each</span>
          <span style="color:var(--text-muted);margin:0 8px;">=</span>
          <span style="font-size:1.3rem;font-weight:800;background:linear-gradient(135deg,var(--accent-purple),var(--accent-teal));-webkit-background-clip:text;-webkit-text-fill-color:transparent;" id="cart-total">$0.00</span>
        </div>
        <div style="display:flex;gap:12px;align-items:center;">
          <button class="btn btn-secondary btn-sm" id="cart-clear">Clear Selection</button>
          <button class="btn btn-primary btn-lg" id="cart-checkout" style="min-width:200px;">
            Proceed to Payment →
          </button>
        </div>
      </div>
    </div>
  `;

  return html;
}

function renderScoreBox(label, score, winnerId, names) {
  if (!score) return '';
  return `
    <div style="background:var(--bg-glass);border:1px solid var(--border-glass);border-radius:var(--radius-sm);padding:10px 16px;text-align:center;">
      <div style="font-size:0.75rem;color:var(--text-muted);margin-bottom:4px;">${label}</div>
      <div style="font-weight:700;font-size:1.1rem;">${score.away || 0} - ${score.home || 0}</div>
      ${winnerId ? `<div style="font-size:0.8rem;color:var(--accent-football);margin-top:4px;">🏆 ${names[winnerId] || 'Winner'}</div>` : ''}
    </div>
  `;
}

function updateCart(pricePerSquare) {
  const cart = document.getElementById('squares-cart');
  const countEl = document.getElementById('cart-count');
  const totalEl = document.getElementById('cart-total');
  if (!cart) return;

  if (selectedSquares.length === 0) {
    cart.style.display = 'none';
    return;
  }

  cart.style.display = 'block';
  const count = selectedSquares.length;
  const total = count * pricePerSquare;
  countEl.textContent = `${count} square${count !== 1 ? 's' : ''}`;
  totalEl.textContent = formatCurrency(total);
}

export function bindSquaresGrid(pool) {
  const gridEl = document.getElementById('squares-grid');
  if (!gridEl) return;

  selectedSquares = [];
  currentPoolRef = pool;
  const pricePerSquare = pool.entryFee || 0;

  if (pool.status !== 'open') return;
  if (!authStore.isLoggedIn) return;

  // Click to select/deselect squares
  gridEl.addEventListener('click', (e) => {
    const cell = e.target.closest('.square-cell');
    if (!cell) return;
    if (cell.classList.contains('claimed') || cell.classList.contains('mine')) return;

    const row = parseInt(cell.dataset.row);
    const col = parseInt(cell.dataset.col);
    const key = `r${row}c${col}`;

    const existingIdx = selectedSquares.findIndex(s => s.key === key);
    if (existingIdx >= 0) {
      // Deselect
      selectedSquares.splice(existingIdx, 1);
      cell.classList.remove('selected');
    } else {
      // Select
      selectedSquares.push({ key, row, col });
      cell.classList.add('selected');
    }

    updateCart(pricePerSquare);
  });

  // Clear selection
  document.getElementById('cart-clear')?.addEventListener('click', () => {
    selectedSquares = [];
    gridEl.querySelectorAll('.square-cell.selected').forEach(c => c.classList.remove('selected'));
    updateCart(pricePerSquare);
  });

  // Proceed to payment
  document.getElementById('cart-checkout')?.addEventListener('click', () => {
    if (selectedSquares.length === 0) return;
    showPaymentModal(pool, selectedSquares.length, pricePerSquare);
  });
}

function showPaymentModal(pool, squareCount, pricePerSquare) {
  const total = squareCount * pricePerSquare;
  const charityAmount = total * (pool.charityPercent / 100);

  const html = `
    <h2 class="modal-title">Complete Your Purchase</h2>
    <div style="background:var(--bg-glass);border:1px solid var(--border-glass);border-radius:var(--radius-sm);padding:20px;margin-bottom:24px;">
      <div style="display:flex;justify-content:space-between;margin-bottom:12px;">
        <span style="color:var(--text-secondary);">Squares selected</span>
        <span style="font-weight:600;">${squareCount}</span>
      </div>
      <div style="display:flex;justify-content:space-between;margin-bottom:12px;">
        <span style="color:var(--text-secondary);">Price per square</span>
        <span style="font-weight:600;">${formatCurrency(pricePerSquare)}</span>
      </div>
      <div style="border-top:1px solid var(--border-glass);margin:12px 0;"></div>
      <div style="display:flex;justify-content:space-between;margin-bottom:8px;">
        <span style="font-weight:700;font-size:1.1rem;">Total</span>
        <span style="font-weight:800;font-size:1.2rem;background:linear-gradient(135deg,var(--accent-purple),var(--accent-teal));-webkit-background-clip:text;-webkit-text-fill-color:transparent;">${formatCurrency(total)}</span>
      </div>
      <div style="display:flex;justify-content:space-between;">
        <span style="color:var(--accent-teal);font-size:0.85rem;">💝 ${pool.charityPercent}% to charity</span>
        <span style="color:var(--accent-teal);font-size:0.85rem;">${formatCurrency(charityAmount)}</span>
      </div>
    </div>

    <div class="form-group">
      <label class="form-label">Payment Method</label>
      <select class="form-select" id="payment-method">
        <option value="stripe">💳 Pay with Card (Stripe)</option>
        <option value="zelle">📱 Zelle</option>
        <option value="cash">💵 Cash (pay in person)</option>
        <option value="check">📝 Check</option>
      </select>
    </div>

    <div id="payment-method-info" style="margin-bottom:16px;"></div>

    <div class="modal-actions">
      <button class="btn btn-secondary" id="cancel-payment">Cancel</button>
      <button class="btn btn-primary btn-lg" id="confirm-payment" style="min-width:200px;">
        Confirm — ${formatCurrency(total)}
      </button>
    </div>
  `;

  showModal(html);

  const methodSelect = document.getElementById('payment-method');
  const infoEl = document.getElementById('payment-method-info');

  function updateMethodInfo() {
    const method = methodSelect.value;
    const infos = {
      stripe: `<div style="background:rgba(99,91,255,0.1);border:1px solid rgba(99,91,255,0.3);border-radius:var(--radius-sm);padding:12px;font-size:0.85rem;color:var(--text-secondary);">
        💳 You will be charged <strong>${formatCurrency(total)}</strong> via Stripe. Payment is processed immediately.
      </div>`,
      zelle: `<div style="background:rgba(108,92,231,0.1);border:1px solid rgba(108,92,231,0.3);border-radius:var(--radius-sm);padding:12px;font-size:0.85rem;color:var(--text-secondary);">
        📱 Send <strong>${formatCurrency(total)}</strong> via Zelle. Your squares will be <strong>reserved</strong> and confirmed by the admin once payment is received.
      </div>`,
      cash: `<div style="background:rgba(46,213,115,0.1);border:1px solid rgba(46,213,115,0.3);border-radius:var(--radius-sm);padding:12px;font-size:0.85rem;color:var(--text-secondary);">
        💵 Pay <strong>${formatCurrency(total)}</strong> in cash to the pool organizer. Your squares will be <strong>reserved</strong> and confirmed once payment is received.
      </div>`,
      check: `<div style="background:rgba(0,184,148,0.1);border:1px solid rgba(0,184,148,0.3);border-radius:var(--radius-sm);padding:12px;font-size:0.85rem;color:var(--text-secondary);">
        📝 Write a check for <strong>${formatCurrency(total)}</strong>. Your squares will be <strong>reserved</strong> and confirmed once the check clears.
      </div>`
    };
    infoEl.innerHTML = infos[method] || '';
  }

  updateMethodInfo();
  methodSelect.addEventListener('change', updateMethodInfo);

  document.getElementById('cancel-payment').addEventListener('click', closeModal);

  document.getElementById('confirm-payment').addEventListener('click', async () => {
    const method = methodSelect.value;
    const btn = document.getElementById('confirm-payment');
    btn.disabled = true;
    btn.textContent = 'Processing...';

    try {
      const poolRef = doc(db, 'pools', pool.id);
      const snap = await getDoc(poolRef);
      const data = snap.data();
      const currentGrid = data.squaresData?.grid || {};

      // Verify all selected squares are still available
      const conflicted = [];
      for (const sq of selectedSquares) {
        if (currentGrid[sq.key] !== null && currentGrid[sq.key] !== undefined) {
          conflicted.push(sq);
        }
      }

      if (conflicted.length > 0) {
        showToast(`${conflicted.length} square(s) were taken by someone else. Please re-select.`, 'error');
        btn.disabled = false;
        btn.textContent = `Confirm — ${formatCurrency(total)}`;
        closeModal();
        // Remove conflicted squares from selection
        conflicted.forEach(sq => {
          const idx = selectedSquares.findIndex(s => s.key === sq.key);
          if (idx >= 0) selectedSquares.splice(idx, 1);
          const cell = document.querySelector(`[data-row="${sq.row}"][data-col="${sq.col}"]`);
          if (cell) { cell.classList.remove('selected'); cell.classList.add('claimed'); }
        });
        updateCart(pricePerSquare);
        return;
      }

      // Claim all selected squares
      const updates = {};
      for (const sq of selectedSquares) {
        updates[`squaresData.grid.${sq.key}`] = authStore.uid;
      }
      updates[`participantAliases.${authStore.uid}`] = authStore.alias;

      // Add to participants if not already
      await updateDoc(poolRef, {
        ...updates,
        participants: arrayUnion(authStore.uid)
      });

      // Record payment
      const payment = buildPaymentRecord(
        authStore.uid, authStore.alias, pool.id, pool.name,
        total, pool.charityPercent, method, pool.orgId
      );
      payment.squareCount = squareCount;
      payment.squareKeys = selectedSquares.map(s => s.key);
      payment.pricePerSquare = pricePerSquare;
      await addDoc(collection(db, 'payments'), payment);

      closeModal();

      // Update UI — mark selected squares as mine
      selectedSquares.forEach(sq => {
        const cell = document.querySelector(`[data-row="${sq.row}"][data-col="${sq.col}"]`);
        if (cell) {
          cell.classList.remove('selected');
          cell.classList.add('mine');
          cell.textContent = authStore.alias.substring(0, 3);
        }
      });

      selectedSquares = [];
      updateCart(pricePerSquare);

      const statusText = (method === 'stripe') ? '🎉' : '⏳ (pending admin confirmation)';
      showToast(`${squareCount} square${squareCount > 1 ? 's' : ''} claimed! ${statusText}`, 'success');

    } catch (err) {
      console.error('Payment error:', err);
      showToast('Failed to complete purchase. Please try again.', 'error');
      btn.disabled = false;
      btn.textContent = `Confirm — ${formatCurrency(total)}`;
    }
  });
}
