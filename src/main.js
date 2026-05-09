// CharityPools — Main Entry Point
import './style.css';
import { router } from './router.js';
import { authStore } from './auth-store.js';
import { renderNavbar, bindNavbar, renderFooter } from './components/layout.js';

// Pages
import { renderLanding, bindLanding } from './pages/landing.js';
import { renderLogin, bindLogin, renderRegister, bindRegister, renderForgotPassword, bindForgotPassword } from './pages/auth.js';
import { renderDashboard, bindDashboard } from './pages/dashboard.js';
import { renderPools, bindPools } from './pages/pools.js';
import { renderPoolDetail, bindPoolDetail } from './pages/pool-detail.js';
import { renderAdmin, bindAdmin } from './pages/admin-dashboard.js';
import { renderAdminPools, bindAdminPools } from './pages/admin-pools.js';
import { renderAdminUsers, bindAdminUsers } from './pages/admin-users.js';
import { renderAdminPayments, bindAdminPayments } from './pages/admin-payments.js';
import { renderAdminSettings, bindAdminSettings } from './pages/admin-settings.js';

const app = document.getElementById('app');

// Page renderer helper
function renderPage(renderFn, bindFn, options = {}) {
  return async (params) => {
    const content = options.noLayout
      ? renderFn(params)
      : `${renderNavbar()}${renderFn(params)}${options.noFooter ? '' : renderFooter()}`;
    app.innerHTML = content;
    bindNavbar();
    if (bindFn) await bindFn(params);
  };
}

// Route definitions
router
  .on('/', renderPage(renderLanding, bindLanding))
  .on('/login', renderPage(renderLogin, bindLogin, { noLayout: true }))
  .on('/register', renderPage(renderRegister, bindRegister, { noLayout: true }))
  .on('/forgot-password', renderPage(renderForgotPassword, bindForgotPassword, { noLayout: true }))
  .on('/dashboard', renderPage(renderDashboard, bindDashboard))
  .on('/pools', renderPage(renderPools, bindPools))
  .on('/pool/:id', renderPage(renderPoolDetail, bindPoolDetail))
  .on('/join/:orgSlug/:poolId', async (params) => {
    // Shareable pool join link — redirect to pool detail
    router.navigate(`/pool/${params.poolId}`);
  })
  .on('/org/:slug', renderPage(renderPools, bindPools)) // Org-specific pool listing
  .on('/admin', renderPage(renderAdmin, bindAdmin, { noFooter: true }))
  .on('/admin/pools', renderPage(renderAdminPools, bindAdminPools, { noFooter: true }))
  .on('/admin/pools/:id', renderPage(renderAdminPools, bindAdminPools, { noFooter: true }))
  .on('/admin/users', renderPage(renderAdminUsers, bindAdminUsers, { noFooter: true }))
  .on('/admin/payments', renderPage(renderAdminPayments, bindAdminPayments, { noFooter: true }))
  .on('/admin/settings', renderPage(renderAdminSettings, bindAdminSettings, { noFooter: true }))
  .on('*', renderPage(() => `
    <div class="page-wrapper">
      <div class="container section" style="text-align:center;padding:100px 24px;">
        <h1 style="font-size:4rem;margin-bottom:16px;">404</h1>
        <p style="color:var(--text-secondary);margin-bottom:32px;">Page not found</p>
        <a href="#/" class="btn btn-primary">Go Home</a>
      </div>
    </div>
  `, null));

// Navigation guard — protect auth-required routes
router.guard((path) => {
  const publicPaths = ['/', '/login', '/register', '/forgot-password'];
  const adminPaths = ['/admin', '/admin/pools', '/admin/users', '/admin/payments', '/admin/settings'];

  // Allow public paths and join/org links
  if (publicPaths.includes(path) || path.startsWith('/join/') || path.startsWith('/org/')) return true;

  // Require login
  if (!authStore.isLoggedIn) {
    return '/login';
  }

  // Admin routes require admin role
  if (adminPaths.some(p => path.startsWith(p)) && !authStore.isAdmin) {
    return '/dashboard';
  }

  return true;
});

// Initialize
async function init() {
  app.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:center;min-height:100vh;">
      <div style="text-align:center;">
        <div class="spinner"></div>
        <p style="color:var(--text-secondary);margin-top:16px;">Loading CharityPools...</p>
      </div>
    </div>
  `;

  await authStore.init();

  // Re-render on auth state change
  authStore.subscribe(() => {
    router.resolve();
  });

  router.start();
}

init();
