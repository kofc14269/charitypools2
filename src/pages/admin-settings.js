// Admin Settings page
import { authStore } from '../auth-store.js';
import { db, doc, getDoc, updateDoc } from '../firebase.js';
import { showToast, spinner } from '../utils.js';

export function renderAdminSettings() {
  return `
    <div class="page-wrapper">
      <div class="admin-layout">
        <nav class="admin-sidebar">
          <div class="admin-sidebar-section"><div class="admin-sidebar-title">Management</div></div>
          <a href="#/admin" class="admin-sidebar-link">📊 Dashboard</a>
          <a href="#/admin/pools" class="admin-sidebar-link">🎯 Pools</a>
          <a href="#/admin/users" class="admin-sidebar-link">👥 Users</a>
          <a href="#/admin/payments" class="admin-sidebar-link">💳 Payments</a>
          <a href="#/admin/settings" class="admin-sidebar-link active">⚙️ Settings</a>
        </nav>
        <div class="admin-content" id="settings-content">${spinner()}</div>
      </div>
    </div>
  `;
}

export async function bindAdminSettings() {
  const orgId = authStore.orgId;
  if (!orgId) return;

  let org = {};
  try {
    const snap = await getDoc(doc(db, 'organizations', orgId));
    if (snap.exists()) org = { id: snap.id, ...snap.data() };
  } catch (err) {
    console.error('Load settings error:', err);
  }

  const el = document.getElementById('settings-content');
  el.innerHTML = `
    <h1 style="margin-bottom:8px;">Organization Settings</h1>
    <p style="color:var(--text-secondary);margin-bottom:32px;">Configure your organization and charity details.</p>

    <form id="settings-form">
      <div class="card" style="margin-bottom:24px;">
        <h3 style="margin-bottom:16px;">🏢 Organization</h3>
        <div class="grid grid-2">
          <div class="form-group">
            <label class="form-label">Organization Name</label>
            <input class="form-input" id="org-name" value="${org.name || ''}" required />
          </div>
          <div class="form-group">
            <label class="form-label">URL Slug</label>
            <input class="form-input" id="org-slug" value="${org.slug || ''}" readonly style="opacity:0.6;" />
          </div>
        </div>
      </div>

      <div class="card" style="margin-bottom:24px;">
        <h3 style="margin-bottom:16px;">💝 Charity</h3>
        <div class="grid grid-2">
          <div class="form-group">
            <label class="form-label">Default Charity Name</label>
            <input class="form-input" id="charity-name" value="${org.charityName || ''}" placeholder="e.g. St. Jude Children's Hospital" />
          </div>
          <div class="form-group">
            <label class="form-label">Default Charity Percentage</label>
            <input class="form-input" id="charity-percent" type="number" min="0" max="100" value="${org.charityPercent || 20}" />
          </div>
        </div>
      </div>

      <div class="card" style="margin-bottom:24px;">
        <h3 style="margin-bottom:16px;">💳 Stripe Integration</h3>
        <p style="color:var(--text-secondary);margin-bottom:16px;font-size:0.9rem;">Connect your Stripe account to accept online payments.</p>
        <div class="form-group">
          <label class="form-label">Stripe Account ID</label>
          <input class="form-input" id="stripe-account" value="${org.stripeAccountId || ''}" placeholder="acct_xxxxxxxxxxxx" />
        </div>
        <p style="color:var(--text-muted);font-size:0.8rem;">You'll need to set up Stripe Connect and add your account ID here. <a href="https://stripe.com/connect" target="_blank">Learn more →</a></p>
      </div>

      <div class="card" style="margin-bottom:24px;">
        <h3 style="margin-bottom:16px;">🔔 Notifications</h3>
        <div style="display:flex;align-items:center;justify-content:space-between;padding:12px 0;">
          <div>
            <div style="font-weight:600;">Email Notifications</div>
            <div style="color:var(--text-muted);font-size:0.85rem;">Send email updates to participants</div>
          </div>
          <label class="toggle">
            <input type="checkbox" id="notif-email" ${org.settings?.notificationsEnabled ? 'checked' : ''} />
            <span class="toggle-slider"></span>
          </label>
        </div>
        <div style="display:flex;align-items:center;justify-content:space-between;padding:12px 0;border-top:1px solid var(--border-glass);">
          <div>
            <div style="font-weight:600;">Pool Deadline Reminders</div>
            <div style="color:var(--text-muted);font-size:0.85rem;">Remind participants before deadlines</div>
          </div>
          <label class="toggle">
            <input type="checkbox" id="notif-deadline" ${org.settings?.deadlineReminders !== false ? 'checked' : ''} />
            <span class="toggle-slider"></span>
          </label>
        </div>
        <div style="display:flex;align-items:center;justify-content:space-between;padding:12px 0;border-top:1px solid var(--border-glass);">
          <div>
            <div style="font-weight:600;">Winner Announcements</div>
            <div style="color:var(--text-muted);font-size:0.85rem;">Notify all participants when winners are determined</div>
          </div>
          <label class="toggle">
            <input type="checkbox" id="notif-winners" ${org.settings?.winnerAnnouncements !== false ? 'checked' : ''} />
            <span class="toggle-slider"></span>
          </label>
        </div>
      </div>

      <div class="card" style="margin-bottom:24px;">
        <h3 style="margin-bottom:16px;">📤 Share Your Pools</h3>
        <p style="color:var(--text-secondary);margin-bottom:16px;font-size:0.9rem;">Share this link on your website and social media for people to join your pools.</p>
        <div style="display:flex;gap:8px;">
          <input class="form-input" id="share-link" readonly value="${window.location.origin}${window.location.pathname}#/org/${org.slug || 'your-org'}" style="flex:1;" />
          <button type="button" class="btn btn-primary" id="copy-share-link">Copy</button>
        </div>
      </div>

      <button type="submit" class="btn btn-primary btn-lg">Save Settings</button>
    </form>
  `;

  // Copy share link
  document.getElementById('copy-share-link')?.addEventListener('click', () => {
    const input = document.getElementById('share-link');
    navigator.clipboard.writeText(input.value);
    showToast('Link copied!', 'success');
  });

  // Save
  document.getElementById('settings-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      await updateDoc(doc(db, 'organizations', orgId), {
        name: document.getElementById('org-name').value.trim(),
        charityName: document.getElementById('charity-name').value.trim(),
        charityPercent: parseInt(document.getElementById('charity-percent').value),
        stripeAccountId: document.getElementById('stripe-account').value.trim(),
        settings: {
          notificationsEnabled: document.getElementById('notif-email').checked,
          deadlineReminders: document.getElementById('notif-deadline').checked,
          winnerAnnouncements: document.getElementById('notif-winners').checked
        }
      });
      showToast('Settings saved!', 'success');
    } catch (err) {
      console.error('Save settings error:', err);
      showToast('Failed to save settings', 'error');
    }
  });
}
