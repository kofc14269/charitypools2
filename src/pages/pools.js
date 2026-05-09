// Browse Pools page
import { db, collection, getDocs, query, where, orderBy } from '../firebase.js';
import { formatCurrency, timeRemaining, sportIcon, poolTypeLabel, spinner } from '../utils.js';

export function renderPools() {
  return `
    <div class="page-wrapper">
      <div class="container section">
        <h1 class="fade-in" style="margin-bottom:8px;">Browse Pools</h1>
        <p style="color:var(--text-secondary);margin-bottom:32px;" class="fade-in">Find and join charity pools for your favorite sports.</p>

        <div class="tabs" id="pool-filters">
          <button class="tab active" data-filter="all">All</button>
          <button class="tab" data-filter="football">🏈 Football</button>
          <button class="tab" data-filter="basketball">🏀 Basketball</button>
          <button class="tab" data-filter="baseball">⚾ Baseball</button>
        </div>

        <div id="pools-grid">${spinner()}</div>
      </div>
    </div>
  `;
}

export async function bindPools() {
  // Load pools
  let allPools = [];
  try {
    const snap = await getDocs(query(collection(db, 'pools'), where('status', 'in', ['open', 'in_progress'])));
    allPools = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (err) {
    console.error('Error loading pools:', err);
  }

  renderPoolsGrid(allPools);

  // Filter tabs
  document.getElementById('pool-filters').addEventListener('click', (e) => {
    if (!e.target.classList.contains('tab')) return;
    document.querySelectorAll('#pool-filters .tab').forEach(t => t.classList.remove('active'));
    e.target.classList.add('active');
    const filter = e.target.dataset.filter;
    const filtered = filter === 'all' ? allPools : allPools.filter(p => p.sport === filter);
    renderPoolsGrid(filtered);
  });
}

function renderPoolsGrid(pools) {
  const grid = document.getElementById('pools-grid');
  if (!grid) return;

  if (pools.length === 0) {
    grid.innerHTML = `
      <div class="card" style="text-align:center;padding:48px;">
        <div style="font-size:3rem;margin-bottom:16px;">🎯</div>
        <h3 style="margin-bottom:8px;">No pools available</h3>
        <p style="color:var(--text-secondary);">Check back soon — new pools are added regularly!</p>
      </div>
    `;
    return;
  }

  grid.innerHTML = `
    <div class="grid grid-3">
      ${pools.map(pool => {
        const sport = pool.sport || 'football';
        return `
          <a href="#/pool/${pool.id}" class="pool-card fade-in">
            <div class="pool-card-banner ${sport}"></div>
            <div class="pool-card-body">
              <div class="pool-card-sport ${sport}">${sportIcon(sport)} ${sport}</div>
              <div class="pool-card-name">${pool.name}</div>
              <div class="pool-card-meta">
                <span>${poolTypeLabel(pool.type)}</span>
                <span>👥 ${(pool.participants || []).length}</span>
                <span>${timeRemaining(pool.deadline)}</span>
              </div>
              <p style="color:var(--text-muted);font-size:0.85rem;margin-top:8px;">${pool.charityPercent || 0}% to charity</p>
            </div>
            <div class="pool-card-footer">
              <span class="badge badge-${pool.status}">${pool.status}</span>
              <span class="pool-card-fee">${formatCurrency(pool.entryFee || 0)}</span>
            </div>
          </a>
        `;
      }).join('')}
    </div>
  `;
}
