// Admin Dashboard
import { authStore } from '../auth-store.js';
import { db, collection, getDocs, query, where } from '../firebase.js';
import { formatCurrency, spinner } from '../utils.js';

export function renderAdmin() {
  return `
    <div class="page-wrapper">
      <div class="admin-layout">
        <nav class="admin-sidebar">
          <div class="admin-sidebar-section">
            <div class="admin-sidebar-title">Management</div>
          </div>
          <a href="#/admin" class="admin-sidebar-link ${location.hash === '#/admin' ? 'active' : ''}">📊 Dashboard</a>
          <a href="#/admin/pools" class="admin-sidebar-link ${location.hash === '#/admin/pools' ? 'active' : ''}">🎯 Pools</a>
          <a href="#/admin/users" class="admin-sidebar-link ${location.hash === '#/admin/users' ? 'active' : ''}">👥 Users</a>
          <a href="#/admin/payments" class="admin-sidebar-link ${location.hash === '#/admin/payments' ? 'active' : ''}">💳 Payments</a>
          <a href="#/admin/settings" class="admin-sidebar-link ${location.hash === '#/admin/settings' ? 'active' : ''}">⚙️ Settings</a>
        </nav>
        <div class="admin-content" id="admin-content">
          <h1 style="margin-bottom:8px;">Admin Dashboard</h1>
          <p style="color:var(--text-secondary);margin-bottom:32px;">Manage your organization's charity pools.</p>

          <div class="grid grid-4" id="admin-stats" style="margin-bottom:32px;">
            <div class="stat-card"><div class="stat-card-value">—</div><div class="stat-card-label">Total Pools</div></div>
            <div class="stat-card"><div class="stat-card-value">—</div><div class="stat-card-label">Participants</div></div>
            <div class="stat-card"><div class="stat-card-value">—</div><div class="stat-card-label">Revenue</div></div>
            <div class="stat-card"><div class="stat-card-value">—</div><div class="stat-card-label">Charity Total</div></div>
          </div>

          <div class="grid grid-2">
            <div class="card">
              <h3 style="margin-bottom:16px;">Active Pools</h3>
              <div id="admin-active-pools">${spinner()}</div>
            </div>
            <div class="card">
              <h3 style="margin-bottom:16px;">Recent Payments</h3>
              <div id="admin-recent-payments">${spinner()}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

export async function bindAdmin() {
  const orgId = authStore.orgId;
  if (!orgId) return;

  try {
    // Pools
    const poolsSnap = await getDocs(query(collection(db, 'pools'), where('orgId', '==', orgId)));
    const pools = poolsSnap.docs.map(d => ({ id: d.id, ...d.data() }));

    // Payments
    const paymentsSnap = await getDocs(query(collection(db, 'payments'), where('orgId', '==', orgId)));
    const payments = paymentsSnap.docs.map(d => ({ id: d.id, ...d.data() }));

    // Users
    const usersSnap = await getDocs(query(collection(db, 'users'), where('orgId', '==', orgId)));
    const users = usersSnap.docs.map(d => ({ id: d.id, ...d.data() }));

    const totalRevenue = payments.reduce((s, p) => s + (p.amount || 0), 0);
    const totalCharity = payments.reduce((s, p) => s + (p.charityAmount || 0), 0);
    const uniqueParticipants = new Set(pools.flatMap(p => p.participants || [])).size;

    const statsEl = document.getElementById('admin-stats');
    if (statsEl) {
      statsEl.innerHTML = `
        <div class="stat-card"><div class="stat-card-value">${pools.length}</div><div class="stat-card-label">Total Pools</div></div>
        <div class="stat-card"><div class="stat-card-value">${uniqueParticipants}</div><div class="stat-card-label">Participants</div></div>
        <div class="stat-card"><div class="stat-card-value">${formatCurrency(totalRevenue)}</div><div class="stat-card-label">Revenue</div></div>
        <div class="stat-card"><div class="stat-card-value" style="color:var(--accent-teal);">${formatCurrency(totalCharity)}</div><div class="stat-card-label">Charity Total</div></div>
      `;
    }

    // Active pools list
    const activePoolsEl = document.getElementById('admin-active-pools');
    const activePools = pools.filter(p => p.status !== 'completed');
    if (activePoolsEl) {
      activePoolsEl.innerHTML = activePools.length === 0
        ? '<p style="color:var(--text-muted);">No active pools.</p>'
        : activePools.map(p => `
          <a href="#/admin/pools/${p.id}" style="display:flex;justify-content:space-between;align-items:center;padding:12px 0;border-bottom:1px solid var(--border-glass);color:var(--text-primary);">
            <span style="font-weight:600;">${p.name}</span>
            <span class="badge badge-${p.status}">${p.status}</span>
          </a>
        `).join('');
    }

    // Recent payments
    const recentPaymentsEl = document.getElementById('admin-recent-payments');
    const recent = payments.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 5);
    if (recentPaymentsEl) {
      recentPaymentsEl.innerHTML = recent.length === 0
        ? '<p style="color:var(--text-muted);">No payments yet.</p>'
        : recent.map(p => `
          <div style="display:flex;justify-content:space-between;align-items:center;padding:12px 0;border-bottom:1px solid var(--border-glass);">
            <div>
              <span style="font-weight:600;">${p.alias || 'User'}</span>
              <span style="color:var(--text-muted);margin-left:8px;font-size:0.85rem;">${p.poolName || ''}</span>
            </div>
            <span style="font-weight:700;color:var(--accent-football);">${formatCurrency(p.amount)}</span>
          </div>
        `).join('');
    }
  } catch (err) {
    console.error('Admin load error:', err);
  }
}
