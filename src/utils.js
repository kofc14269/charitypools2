// Utility functions

// Toast notifications
export function showToast(message, type = 'info', duration = 4000) {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <span>${getToastIcon(type)}</span>
    <span>${message}</span>
  `;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.animation = 'toastOut 0.3s ease-in forwards';
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

function getToastIcon(type) {
  const icons = { success: '✓', error: '✕', info: 'ℹ', warning: '⚠' };
  return icons[type] || icons.info;
}

// Modal
export function showModal(content) {
  const overlay = document.getElementById('modal-overlay');
  overlay.innerHTML = '';
  overlay.classList.remove('hidden');
  const modal = document.createElement('div');
  modal.className = 'modal fade-in';
  if (typeof content === 'string') {
    modal.innerHTML = content;
  } else {
    modal.appendChild(content);
  }
  overlay.appendChild(modal);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeModal();
  });
}

export function closeModal() {
  document.getElementById('modal-overlay').classList.add('hidden');
}

// Format currency
export function formatCurrency(amount) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
}

// Format date
export function formatDate(date) {
  if (!date) return '';
  const d = date.toDate ? date.toDate() : new Date(date);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function formatDateTime(date) {
  if (!date) return '';
  const d = date.toDate ? date.toDate() : new Date(date);
  return d.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
}

// Time remaining
export function timeRemaining(deadline) {
  if (!deadline) return '';
  const d = deadline.toDate ? deadline.toDate() : new Date(deadline);
  const now = new Date();
  const diff = d - now;
  if (diff <= 0) return 'Closed';
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  if (days > 0) return `${days}d ${hours}h left`;
  const mins = Math.floor((diff % 3600000) / 60000);
  return `${hours}h ${mins}m left`;
}

// Generate a share URL
export function getShareUrl(poolId, orgSlug) {
  const base = window.location.origin + window.location.pathname;
  return `${base}#/join/${orgSlug}/${poolId}`;
}

// Copy to clipboard
export async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    showToast('Link copied to clipboard!', 'success');
  } catch {
    showToast('Failed to copy link', 'error');
  }
}

// Share via Web Share API or fallback
export async function sharePool(pool, orgSlug) {
  const url = getShareUrl(pool.id, orgSlug);
  const shareData = {
    title: `Join ${pool.name} on CharityPools!`,
    text: `Join this charity pool — ${pool.charityPercent}% goes to charity! Entry: ${formatCurrency(pool.entryFee)}`,
    url
  };
  if (navigator.share) {
    try { await navigator.share(shareData); } catch { /* user cancelled */ }
  } else {
    copyToClipboard(url);
  }
}

// Debounce
export function debounce(fn, ms = 300) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
}

// Sanitize input
export function sanitize(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// Loading spinner HTML
export function spinner() {
  return '<div class="spinner"></div>';
}

// Sport icons
export function sportIcon(sport) {
  const icons = { football: '🏈', basketball: '🏀', baseball: '⚾' };
  return icons[sport] || '🎯';
}

// Pool type labels
export function poolTypeLabel(type) {
  const labels = { squares: 'Squares', bracket: 'Bracket', pickem: "Pick'em", overunder: 'Over/Under', confidence: 'Confidence' };
  return labels[type] || type;
}
