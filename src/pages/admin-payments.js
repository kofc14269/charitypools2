// Admin Payments page
import { authStore } from '../auth-store.js';
import { db, collection, getDocs, doc, updateDoc, query, where } from '../firebase.js';
import { formatCurrency, formatDate, showToast, spinner, sanitize } from '../utils.js';
import { paymentMethodLabel } from '../stripe.js';

export function renderAdminPayments() {
  return `
    <div class="page-wrapper">
      <div class="admin-layout">
        <nav class="admin-sidebar">
          <div class="admin-sidebar-section"><div class="admin-sidebar-title">Management</div></div>
          <a href="#/admin" class="admin-sidebar-link">📊 Dashboard</a>
          <a href="#/admin/pools" class="admin-sidebar-link">🎯 Pools</a>
          <a href="#/admin/users" class="admin-sidebar-link">👥 Users</a>
          <a href="#/admin/payments" class="admin-sidebar-link active">💳 Payments</a>
          <a href="#/admin/settings" class="admin-sidebar-link">⚙️ Settings</a>
        </nav>
        <div class="admin-content">
          <h1 style="margin-bottom:8px;">Payment Tracking</h1>
          <p style="color:var(--text-secondary);margin-bottom:32px;">Track all payments, charity contributions, and outstanding balances.</p>

          <div class="grid grid-4" id="payment-stats" style="margin-bottom:32px;">
            <div class="stat-card"><div class="stat-card-value">—</div><div class="stat-card-label">Total Collected</div></div>
            <div class="stat-card"><div class="stat-card-value">—</div><div class="stat-card-label">Charity Portion</div></div>
            <div class="stat-card"><div class="stat-card-value">—</div><div class="stat-card-label">Pool Prize Money</div></div>
            <div class="stat-card"><div class="stat-card-value">—</div><div class="stat-card-label">Pending</div></div>
          </div>

          <div class="tabs" id="payment-tabs">
            <button class="tab active" data-tab="all">All</button>
            <button class="tab" data-tab="completed">Completed</button>
            <button class="tab" data-tab="pending">Pending</button>
          </div>

          <div id="payments-table">${spinner()}</div>
        </div>
      </div>
    </div>
  `;
}

export async function bindAdminPayments() {
  const orgId = authStore.orgId;
  if (!orgId) return;

  let payments = [];
  try {
    const snap = await getDocs(query(collection(db, 'payments'), where('orgId', '==', orgId)));
    payments = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (err) {
    console.error('Load payments error:', err);
  }

  // Stats
  const total = payments.reduce((s, p) => s + (p.amount || 0), 0);
  const charity = payments.reduce((s, p) => s + (p.charityAmount || 0), 0);
  const pool = payments.reduce((s, p) => s + (p.poolAmount || 0), 0);
  const pending = payments.filter(p => p.status === 'pending').reduce((s, p) => s + (p.amount || 0), 0);

  const statsEl = document.getElementById('payment-stats');
  if (statsEl) {
    statsEl.innerHTML = `
      <div class="stat-card"><div class="stat-card-value">${formatCurrency(total)}</div><div class="stat-card-label">Total Collected</div></div>
      <div class="stat-card"><div class="stat-card-value" style="color:var(--accent-teal);">${formatCurrency(charity)}</div><div class="stat-card-label">Charity Portion</div></div>
      <div class="stat-card"><div class="stat-card-value" style="color:var(--accent-football);">${formatCurrency(pool)}</div><div class="stat-card-label">Pool Prize Money</div></div>
      <div class="stat-card"><div class="stat-card-value" style="color:var(--accent-basketball);">${formatCurrency(pending)}</div><div class="stat-card-label">Pending</div></div>
    `;
  }

  renderPaymentsTable(payments, 'all');

  // Tabs
  document.getElementById('payment-tabs').addEventListener('click', (e) => {
    if (!e.target.classList.contains('tab')) return;
    document.querySelectorAll('#payment-tabs .tab').forEach(t => t.classList.remove('active'));
    e.target.classList.add('active');
    renderPaymentsTable(payments, e.target.dataset.tab);
  });
}

function renderPaymentsTable(payments, filter) {
  const filtered = filter === 'all' ? payments : payments.filter(p => p.status === filter);
  const el = document.getElementById('payments-table');
  if (!el) return;

  if (filtered.length === 0) {
    el.innerHTML = '<p style="color:var(--text-muted);padding:24px 0;">No payments found.</p>';
    return;
  }

  el.innerHTML = `
    <table class="data-table">
      <thead>
        <tr><th>User</th><th>Pool</th><th>Squares</th><th>Amount</th><th>Charity</th><th>Method</th><th>Status</th><th>Date</th><th>Actions</th></tr>
      </thead>
      <tbody>
        ${filtered.sort((a, b) => {
          const aliasA = (a.alias || '').toLowerCase();
          const aliasB = (b.alias || '').toLowerCase();
          if (aliasA < aliasB) return -1;
          if (aliasA > aliasB) return 1;
          return new Date(b.createdAt) - new Date(a.createdAt); // secondary sort by date
        }).map(p => `
          <tr>
            <td style="font-weight:600;">${sanitize(p.alias || '—')}</td>
            <td style="color:var(--text-secondary);">${sanitize(p.poolName || '—')}</td>
            <td style="text-align:center;">${p.squareCount || '—'}</td>
            <td style="font-weight:700;">${formatCurrency(p.amount || 0)}</td>
            <td style="color:var(--accent-teal);">${formatCurrency(p.charityAmount || 0)}</td>
            <td>${paymentMethodLabel(p.method)}</td>
            <td><span class="badge ${p.status === 'completed' ? 'badge-open' : p.status === 'rejected' ? 'badge-completed' : 'badge-locked'}">${p.status}</span></td>
            <td style="color:var(--text-muted);font-size:0.85rem;">${formatDate(p.createdAt)}</td>
            <td>
              ${p.status === 'pending' ? `
                <div style="display:flex;gap:6px;">
                  <button class="btn btn-sm btn-primary mark-paid-btn" data-id="${p.id}" title="Confirm payment received">✓ Confirm</button>
                  <button class="btn btn-sm btn-danger reject-btn" data-id="${p.id}" data-pool="${p.poolId}" data-user="${p.userId}" data-squares='${JSON.stringify(p.squareKeys || [])}' title="Reject and release squares">✕</button>
                </div>
              ` : ''}
            </td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;

  document.querySelectorAll('.mark-paid-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      try {
        await updateDoc(doc(db, 'payments', btn.dataset.id), { status: 'completed' });
        showToast('Payment confirmed ✓', 'success');
        const p = payments.find(p => p.id === btn.dataset.id);
        if (p) p.status = 'completed';
        renderPaymentsTable(payments, document.querySelector('#payment-tabs .tab.active')?.dataset.tab || 'all');
      } catch (err) {
        showToast('Failed to update payment', 'error');
      }
    });
  });

  // Reject & release squares
  document.querySelectorAll('.reject-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (!confirm('Reject this payment and release the squares back to available?')) return;
      try {
        // Mark payment as rejected
        await updateDoc(doc(db, 'payments', btn.dataset.id), { status: 'rejected' });

        // Release squares on the pool grid
        const squareKeys = JSON.parse(btn.dataset.squares || '[]');
        if (squareKeys.length > 0 && btn.dataset.pool) {
          const poolRef = doc(db, 'pools', btn.dataset.pool);
          const updates = {};
          squareKeys.forEach(key => {
            updates[`squaresData.grid.${key}`] = null;
          });
          await updateDoc(poolRef, updates);
        }

        showToast('Payment rejected, squares released', 'info');
        const p = payments.find(p => p.id === btn.dataset.id);
        if (p) p.status = 'rejected';
        renderPaymentsTable(payments, document.querySelector('#payment-tabs .tab.active')?.dataset.tab || 'all');
      } catch (err) {
        console.error('Reject error:', err);
        showToast('Failed to reject payment', 'error');
      }
    });
  });
}
