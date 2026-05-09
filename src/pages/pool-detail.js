// Pool Detail page — renders squares, bracket, or picks depending on pool type
import { authStore } from '../auth-store.js';
import { db, doc, getDoc, updateDoc, arrayUnion, setDoc, collection } from '../firebase.js';
import { formatCurrency, formatDate, timeRemaining, sportIcon, poolTypeLabel, showToast, showModal, closeModal, sharePool, spinner, sanitize } from '../utils.js';
import { buildPaymentRecord } from '../stripe.js';
import { renderSquaresGrid, bindSquaresGrid } from '../components/squares.js';
import { renderBracket, bindBracket } from '../components/bracket.js';
import { renderPickem, bindPickem } from '../components/pickem.js';

let currentPool = null;

export function renderPoolDetail() {
  return `
    <div class="page-wrapper">
      <div class="container section" id="pool-detail">${spinner()}</div>
    </div>
  `;
}

export async function bindPoolDetail(params) {
  const poolId = params.id;
  if (!poolId) return;

  try {
    const snap = await getDoc(doc(db, 'pools', poolId));
    if (!snap.exists()) {
      document.getElementById('pool-detail').innerHTML = `
        <div class="card" style="text-align:center;padding:48px;">
          <h2>Pool Not Found</h2>
          <p style="color:var(--text-secondary);margin-top:8px;">This pool doesn't exist or has been removed.</p>
          <a href="#/pools" class="btn btn-primary" style="margin-top:24px;">Browse Pools</a>
        </div>
      `;
      return;
    }

    currentPool = { id: snap.id, ...snap.data() };
    const pool = currentPool;
    const sport = pool.sport || 'football';
    const isParticipant = (pool.participants || []).includes(authStore.uid);
    const isAdmin = authStore.isAdmin && authStore.orgId === pool.orgId;

    // Load org info
    let orgName = '';
    if (pool.orgId) {
      const orgSnap = await getDoc(doc(db, 'organizations', pool.orgId));
      if (orgSnap.exists()) orgName = orgSnap.data().name;
    }

    const detail = document.getElementById('pool-detail');
    detail.innerHTML = `
      <div class="fade-in">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:16px;margin-bottom:32px;">
          <div>
            <div class="pool-card-sport ${sport}" style="margin-bottom:8px;">${sportIcon(sport)} ${sport} • ${poolTypeLabel(pool.type)}</div>
            <h1 style="font-size:2rem;margin-bottom:8px;">${sanitize(pool.name)}</h1>
            ${orgName ? `<p style="color:var(--text-muted);font-size:0.9rem;">Organized by ${sanitize(orgName)}</p>` : ''}
          </div>
          <div style="display:flex;gap:12px;align-items:center;flex-wrap:wrap;">
            <span class="badge badge-${pool.status}">${pool.status}</span>
            <button class="btn btn-secondary btn-sm" id="share-pool-btn">📤 Share</button>
            ${pool.type !== 'squares' && !isParticipant && pool.status === 'open' ? `<button class="btn btn-primary" id="join-pool-btn">Join Pool — ${formatCurrency(pool.entryFee)}</button>` : ''}
            ${pool.type !== 'squares' && isParticipant ? '<span style="color:var(--accent-football);font-weight:600;">✓ Joined</span>' : ''}
          </div>
        </div>

        <div class="grid grid-4" style="margin-bottom:32px;">
          <div class="stat-card">
            <div class="stat-card-value">${formatCurrency(pool.entryFee || 0)}</div>
            <div class="stat-card-label">Entry Fee</div>
          </div>
          <div class="stat-card">
            <div class="stat-card-value">${pool.charityPercent || 0}%</div>
            <div class="stat-card-label">To Charity</div>
          </div>
          <div class="stat-card">
            <div class="stat-card-value">${(pool.participants || []).length}</div>
            <div class="stat-card-label">Participants</div>
          </div>
          <div class="stat-card">
            <div class="stat-card-value">${timeRemaining(pool.deadline)}</div>
            <div class="stat-card-label">Deadline</div>
          </div>
        </div>

        ${pool.rules ? `
          <div class="card" style="margin-bottom:24px;">
            <h3 style="margin-bottom:12px;">📋 Rules</h3>
            <p style="color:var(--text-secondary);white-space:pre-wrap;">${sanitize(pool.rules)}</p>
          </div>
        ` : ''}

        <div id="pool-content"></div>
      </div>
    `;

    // Render pool-type-specific content
    const contentEl = document.getElementById('pool-content');
    if (pool.type === 'squares') {
      contentEl.innerHTML = renderSquaresGrid(pool);
      bindSquaresGrid(pool);
    } else if (pool.type === 'bracket') {
      contentEl.innerHTML = renderBracket(pool);
      bindBracket(pool);
    } else {
      contentEl.innerHTML = renderPickem(pool);
      bindPickem(pool);
    }

    // Share button
    document.getElementById('share-pool-btn')?.addEventListener('click', () => {
      sharePool(pool, pool.orgSlug || 'pool');
    });

    // Join button
    document.getElementById('join-pool-btn')?.addEventListener('click', () => {
      showJoinModal(pool);
    });

  } catch (err) {
    console.error('Pool detail error:', err);
    document.getElementById('pool-detail').innerHTML = '<p style="color:var(--text-muted);">Error loading pool details.</p>';
  }
}

function showJoinModal(pool) {
  const html = `
    <h2 class="modal-title">Join ${sanitize(pool.name)}</h2>
    <p style="color:var(--text-secondary);margin-bottom:24px;">Entry fee: <strong>${formatCurrency(pool.entryFee)}</strong> • ${pool.charityPercent}% goes to charity</p>
    <div class="form-group">
      <label class="form-label">Payment Method</label>
      <select class="form-select" id="payment-method">
        <option value="stripe">💳 Pay with Card (Stripe)</option>
        <option value="cash">💵 Cash (pay in person)</option>
        <option value="check">📝 Check</option>
        <option value="other">📋 Other</option>
      </select>
    </div>
    <div id="stripe-card-element" style="margin-bottom:16px;display:none;">
      <p style="color:var(--text-muted);font-size:0.85rem;">Stripe card form will appear here when configured.</p>
    </div>
    <div class="modal-actions">
      <button class="btn btn-secondary" id="cancel-join">Cancel</button>
      <button class="btn btn-primary" id="confirm-join">Confirm & Join</button>
    </div>
  `;
  showModal(html);

  const methodSelect = document.getElementById('payment-method');
  const stripeEl = document.getElementById('stripe-card-element');
  methodSelect.addEventListener('change', () => {
    stripeEl.style.display = methodSelect.value === 'stripe' ? 'block' : 'none';
  });

  document.getElementById('cancel-join').addEventListener('click', closeModal);
  document.getElementById('confirm-join').addEventListener('click', async () => {
    const method = methodSelect.value;
    const btn = document.getElementById('confirm-join');
    btn.disabled = true;
    btn.textContent = 'Joining...';

    try {
      // Add user to pool
      await updateDoc(doc(db, 'pools', pool.id), {
        participants: arrayUnion(authStore.uid)
      });

      // Record payment
      const payment = buildPaymentRecord(
        authStore.uid, authStore.alias, pool.id, pool.name,
        pool.entryFee, pool.charityPercent, method, pool.orgId
      );
      const { addDoc } = await import('../firebase.js');
      await addDoc(collection(db, 'payments'), payment);

      closeModal();
      showToast('You joined the pool! 🎉', 'success');

      // Refresh the page
      await authStore.refreshProfile();
      await bindPoolDetail({ id: pool.id });
    } catch (err) {
      console.error('Join error:', err);
      showToast('Failed to join pool. Please try again.', 'error');
      btn.disabled = false;
      btn.textContent = 'Confirm & Join';
    }
  });
}
