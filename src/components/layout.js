// Shared layout components
import { authStore } from '../auth-store.js';
import { router } from '../router.js';
import { auth, signOut } from '../firebase.js';
import { showToast } from '../utils.js';

export function renderNavbar() {
  const isLogged = authStore.isLoggedIn;
  const isAdmin = authStore.isAdmin;
  const alias = authStore.alias;

  return `
    <nav class="navbar" id="main-navbar">
      <a href="#/" class="navbar-brand">
        <img src="/favicon.svg" alt="CharityPools logo" />
        CharityPools
      </a>
      <ul class="navbar-links" id="navbar-links">
        ${isLogged ? `
          <li><a href="#/dashboard" class="${location.hash === '#/dashboard' ? 'active' : ''}">Dashboard</a></li>
          <li><a href="#/pools" class="${location.hash === '#/pools' ? 'active' : ''}">Pools</a></li>
          ${isAdmin ? `<li><a href="#/admin" class="${location.hash.startsWith('#/admin') ? 'active' : ''}">Admin</a></li>` : ''}
        ` : ''}
      </ul>
      <div class="navbar-actions">
        ${isLogged ? `
          <span style="color:var(--text-secondary);font-size:0.9rem;">👤 ${alias}</span>
          <button class="btn btn-secondary btn-sm" id="btn-logout">Logout</button>
        ` : `
          <a href="#/login" class="btn btn-secondary btn-sm">Login</a>
          <a href="#/register" class="btn btn-primary btn-sm">Sign Up</a>
        `}
        <button class="navbar-hamburger" id="navbar-hamburger">☰</button>
      </div>
    </nav>
  `;
}

export function bindNavbar() {
  const logoutBtn = document.getElementById('btn-logout');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      await signOut(auth);
      showToast('Logged out successfully', 'success');
      router.navigate('/');
    });
  }

  const hamburger = document.getElementById('navbar-hamburger');
  const links = document.getElementById('navbar-links');
  if (hamburger && links) {
    hamburger.addEventListener('click', () => {
      links.style.display = links.style.display === 'flex' ? 'none' : 'flex';
    });
  }
}

export function renderFooter() {
  return `
    <footer class="footer">
      <div class="footer-links">
        <a href="#/">Home</a>
        <a href="#/pools">Pools</a>
        <a href="#/about">About</a>
      </div>
      <p>© ${new Date().getFullYear()} CharityPools — Every game supports a great cause.</p>
    </footer>
  `;
}
