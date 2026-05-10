// User Dashboard
import { authStore } from '../auth-store.js';
import { db, collection, getDocs, query, where } from '../firebase.js';
import { formatCurrency, formatDate, timeRemaining, sportIcon, poolTypeLabel, spinner } from '../utils.js';

export function renderDashboard() {
  return `
    <div class="page-wrapper">
      <div class="container section">
        <h1 class="fade-in" style="margin-bottom:8px;">Welcome, ${authStore.alias} 👋</h1>
        <p style="color:var(--text-secondary);margin-bottom:40px;" class="fade-in">Here's your pool activity at a glance.</p>

        <div class="grid grid-4 fade-in" id="dashboard-stats">
          <div class="stat-card"><div class="stat-card-value">—</div><div class="stat-card-label">Active Pools</div></div>
          <div class="stat-card"><div class="stat-card-value">—</div><div class="stat-card-label">Total Spent</div></div>
          <div class="stat-card"><div class="stat-card-value">—</div><div class="stat-card-label">Winnings</div></div>
          <div class="stat-card"><div class="stat-card-value">—</div><div class="stat-card-label">Charity Donated</div></div>
        </div>

        <div style="margin-top:48px;">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:24px;">
            <h2>My Pools</h2>
            <a href="#/pools" class="btn btn-secondary btn-sm">Browse More Pools</a>
          </div>
          <div id="my-pools-list">${spinner()}</div>
        </div>

        <div style="margin-top:48px;">
          <h2 style="margin-bottom:24px;">Recent Activity</h2>
          <div id="recent-activity">${spinner()}</div>
        </div>
      </div>
    </div>
  `;
}

export async function bindDashboard() {
  await loadDashboardData();
}

async function loadDashboardData() {
  const uid = authStore.uid;
  if (!uid) return;

  try {
    // Load user's pools
    const poolsSnap = await getDocs(query(collection(db, 'pools'), where('participants', 'array-contains', uid)));
    const pools = poolsSnap.docs.map(d => ({ id: d.id, ...d.data() }));

    // Load user's payments
    const paymentsSnap = await getDocs(query(collection(db, 'payments'), where('userId', '==', uid)));
    const payments = paymentsSnap.docs.map(d => ({ id: d.id, ...d.data() }));

    // Stats
    const activePools = pools.filter(p => p.status !== 'completed').length;
    const totalSpent = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
    const totalCharity = payments.reduce((sum, p) => sum + (p.charityAmount || 0), 0);

    // Load winnings
    const winningsSnap = await getDocs(query(collection(db, 'winnings'), where('userId', '==', uid)));
    const totalWinnings = winningsSnap.docs.reduce((sum, d) => sum + (d.data().amount || 0), 0);

    const statsEl = document.getElementById('dashboard-stats');
    if (statsEl) {
      statsEl.innerHTML = `
        <div class="stat-card"><div class="stat-card-value">${activePools}</div><div class="stat-card-label">Active Pools</div></div>
        <div class="stat-card"><div class="stat-card-value">${formatCurrency(totalSpent)}</div><div class="stat-card-label">Total Spent</div></div>
        <div class="stat-card"><div class="stat-card-value" style="color:var(--accent-football);">${formatCurrency(totalWinnings)}</div><div class="stat-card-label">Winnings</div></div>
        <div class="stat-card"><div class="stat-card-value" style="color:var(--accent-teal);">${formatCurrency(totalCharity)}</div><div class="stat-card-label">Charity Donated</div></div>
      `;
    }

    // Pools list
    const poolsListEl = document.getElementById('my-pools-list');
    if (poolsListEl) {
      if (pools.length === 0) {
        poolsListEl.innerHTML = `
          <div class="card" style="text-align:center;padding:48px;">
            <div style="font-size:3rem;margin-bottom:16px;">🎯</div>
            <h3 style="margin-bottom:8px;">You haven't joined any pools yet</h3>
            <p style="color:var(--text-secondary);margin-bottom:24px;">Browse available public pools and join your first one!</p>
            <a href="#/pools" class="btn btn-primary">Browse Pools</a>
          </div>
        `;
      } else {
        poolsListEl.innerHTML = `<div class="grid grid-3">${pools.map(p => poolCard(p)).join('')}</div>`;
      }
    }

    // Recent activity
    const activityEl = document.getElementById('recent-activity');
    if (activityEl) {
      const allActivity = [
        ...payments.map(p => ({ type: 'payment', ...p })),
      ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 5);

      if (allActivity.length === 0) {
        activityEl.innerHTML = '<p style="color:var(--text-muted);">No recent activity.</p>';
      } else {
        activityEl.innerHTML = allActivity.map(a => `
          <div class="card" style="margin-bottom:8px;padding:16px 20px;display:flex;align-items:center;justify-content:space-between;">
            <div>
              <span style="font-weight:600;">${a.type === 'payment' ? '💳 Payment' : '🏆 Win'}</span>
              <span style="color:var(--text-secondary);margin-left:8px;">${a.poolName || 'Pool'}</span>
            </div>
            <div style="font-weight:700;${a.type === 'win' ? 'color:var(--accent-football);' : ''}">${formatCurrency(a.amount)}</div>
          </div>
        `).join('');
      }
    }
  } catch (err) {
    console.error('Dashboard load error:', err);
    const poolsListEl = document.getElementById('my-pools-list');
    if (poolsListEl) poolsListEl.innerHTML = '<p style="color:var(--text-muted);">Unable to load pools. Please check your connection.</p>';
  }
}

function poolCard(pool) {
  const sport = pool.sport || 'football';
  return `
    <a href="#/pool/${pool.id}" class="pool-card">
      <div class="pool-card-banner ${sport}"></div>
      <div class="pool-card-body">
        <div class="pool-card-sport ${sport}">${sportIcon(sport)} ${sport}</div>
        <div class="pool-card-name">${pool.name}</div>
        <div class="pool-card-meta">
          <span>${poolTypeLabel(pool.type)}</span>
          <span>${timeRemaining(pool.deadline)}</span>
        </div>
      </div>
      <div class="pool-card-footer">
        <span class="badge badge-${pool.status}">${pool.status}</span>
        <span class="pool-card-fee">${formatCurrency(pool.entryFee)}</span>
      </div>
    </a>
  `;
}
