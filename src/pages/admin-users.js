// Admin User Management
import { authStore } from '../auth-store.js';
import { db, collection, getDocs, doc, updateDoc, setDoc, query, where, serverTimestamp } from '../firebase.js';
import { showToast, showModal, closeModal, sanitize, spinner, formatDate } from '../utils.js';

export function renderAdminUsers() {
  return `
    <div class="page-wrapper">
      <div class="admin-layout">
        <nav class="admin-sidebar">
          <div class="admin-sidebar-section"><div class="admin-sidebar-title">Management</div></div>
          <a href="#/admin" class="admin-sidebar-link">📊 Dashboard</a>
          <a href="#/admin/pools" class="admin-sidebar-link">🎯 Pools</a>
          <a href="#/admin/users" class="admin-sidebar-link active">👥 Users</a>
          <a href="#/admin/payments" class="admin-sidebar-link">💳 Payments</a>
          <a href="#/admin/settings" class="admin-sidebar-link">⚙️ Settings</a>
        </nav>
        <div class="admin-content">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:32px;">
            <h1>Manage Users</h1>
            <button class="btn btn-primary" id="add-user-btn">+ Add User</button>
          </div>
          <div id="users-list">${spinner()}</div>
        </div>
      </div>
    </div>
  `;
}

export async function bindAdminUsers() {
  await loadUsers();
  document.getElementById('add-user-btn').addEventListener('click', showAddUserModal);
}

async function loadUsers() {
  const orgId = authStore.orgId;
  try {
    // Get all users in org + participants in org's pools
    const usersSnap = await getDocs(query(collection(db, 'users'), where('orgId', '==', orgId)));
    const orgUsers = usersSnap.docs.map(d => ({ id: d.id, ...d.data() }));

    // Also get participants from pools
    const poolsSnap = await getDocs(query(collection(db, 'pools'), where('orgId', '==', orgId)));
    const participantIds = new Set();
    poolsSnap.docs.forEach(d => (d.data().participants || []).forEach(p => participantIds.add(p)));

    // Load any participants not in org
    const allUserIds = new Set(orgUsers.map(u => u.id));
    const extraIds = [...participantIds].filter(id => !allUserIds.has(id));
    const extraUsers = [];
    for (const uid of extraIds.slice(0, 20)) { // limit to avoid large reads
      try {
        const snap = await getDocs(query(collection(db, 'users'), where('__name__', '==', uid)));
        snap.docs.forEach(d => extraUsers.push({ id: d.id, ...d.data(), external: true }));
      } catch { /* skip */ }
    }

    const allUsers = [...orgUsers, ...extraUsers];

    const listEl = document.getElementById('users-list');
    if (allUsers.length === 0) {
      listEl.innerHTML = '<p style="color:var(--text-muted);">No users found.</p>';
      return;
    }

    listEl.innerHTML = `
      <table class="data-table">
        <thead>
          <tr><th>Alias</th><th>Email</th><th>Role</th><th>Joined</th><th>Actions</th></tr>
        </thead>
        <tbody>
          ${allUsers.map(u => `
            <tr>
              <td style="font-weight:600;">${sanitize(u.alias || 'No alias')}</td>
              <td style="color:var(--text-secondary);">${sanitize(u.email || '—')}</td>
              <td><span class="badge ${u.role === 'admin' ? 'badge-locked' : 'badge-open'}">${u.role || 'participant'}</span></td>
              <td style="color:var(--text-muted);">${formatDate(u.createdAt)}</td>
              <td>
                <button class="btn btn-secondary btn-sm edit-user-btn" data-id="${u.id}" data-alias="${sanitize(u.alias || '')}" data-role="${u.role || 'participant'}" data-email="${sanitize(u.email || '')}">Edit</button>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;

    document.querySelectorAll('.edit-user-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        showEditUserModal(btn.dataset.id, btn.dataset.alias, btn.dataset.role, btn.dataset.email);
      });
    });
  } catch (err) {
    console.error('Load users error:', err);
  }
}

function showAddUserModal() {
  const html = `
    <h2 class="modal-title">Add User</h2>
    <p style="color:var(--text-secondary);margin-bottom:20px;">Add a user manually (for offline participants who haven't registered yet).</p>
    <form id="add-user-form">
      <div class="form-group">
        <label class="form-label">Alias / Display Name</label>
        <input class="form-input" id="new-alias" required placeholder="e.g. JohnDoe" />
      </div>
      <div class="form-group">
        <label class="form-label">Email (optional)</label>
        <input class="form-input" id="new-email" type="email" placeholder="user@email.com" />
      </div>
      <div class="form-group">
        <label class="form-label">Role</label>
        <select class="form-select" id="new-role">
          <option value="participant">Participant</option>
          <option value="admin">Admin</option>
        </select>
      </div>
      <div class="modal-actions">
        <button type="button" class="btn btn-secondary" onclick="document.getElementById('modal-overlay').classList.add('hidden')">Cancel</button>
        <button type="submit" class="btn btn-primary">Add User</button>
      </div>
    </form>
  `;
  showModal(html);

  document.getElementById('add-user-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const alias = document.getElementById('new-alias').value.trim();
    const email = document.getElementById('new-email').value.trim();
    const role = document.getElementById('new-role').value;
    const manualId = 'manual_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 5);

    try {
      await setDoc(doc(db, 'users', manualId), {
        alias, email, role, orgId: authStore.orgId,
        pools: [], manual: true, createdAt: serverTimestamp()
      });
      closeModal();
      showToast(`User "${alias}" added!`, 'success');
      await loadUsers();
    } catch (err) {
      showToast('Failed to add user', 'error');
    }
  });
}

function showEditUserModal(userId, alias, role, email) {
  const html = `
    <h2 class="modal-title">Edit User</h2>
    <form id="edit-user-form">
      <div class="form-group">
        <label class="form-label">Alias</label>
        <input class="form-input" id="edit-alias" value="${alias}" required />
      </div>
      <div class="form-group">
        <label class="form-label">Email</label>
        <input class="form-input" id="edit-email" value="${email}" />
      </div>
      <div class="form-group">
        <label class="form-label">Role</label>
        <select class="form-select" id="edit-role">
          <option value="participant" ${role === 'participant' ? 'selected' : ''}>Participant</option>
          <option value="admin" ${role === 'admin' ? 'selected' : ''}>Admin</option>
        </select>
      </div>
      <div class="modal-actions">
        <button type="button" class="btn btn-secondary" onclick="document.getElementById('modal-overlay').classList.add('hidden')">Cancel</button>
        <button type="submit" class="btn btn-primary">Save Changes</button>
      </div>
    </form>
  `;
  showModal(html);

  document.getElementById('edit-user-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      await updateDoc(doc(db, 'users', userId), {
        alias: document.getElementById('edit-alias').value.trim(),
        role: document.getElementById('edit-role').value
      });
      closeModal();
      showToast('User updated!', 'success');
      await loadUsers();
    } catch (err) {
      showToast('Failed to update user', 'error');
    }
  });
}
