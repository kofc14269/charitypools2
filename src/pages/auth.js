// Auth pages — Login & Register
import { auth, db, createUserWithEmailAndPassword, signInWithEmailAndPassword, sendPasswordResetEmail, updateProfile, doc, setDoc, serverTimestamp } from '../firebase.js';
import { showToast } from '../utils.js';
import { router } from '../router.js';
import { authStore } from '../auth-store.js';

export function renderLogin() {
  return `
    <div class="auth-page">
      <div class="auth-card fade-in">
        <div style="text-align:center;margin-bottom:24px;">
          <img src="/favicon.svg" alt="CharityPools" style="width:48px;height:48px;margin-bottom:12px;" />
        </div>
        <h1 class="auth-title">Welcome Back</h1>
        <p class="auth-subtitle">Log in to your CharityPools account</p>
        <form id="login-form">
          <div class="form-group">
            <label class="form-label" for="login-email">Email</label>
            <input class="form-input" id="login-email" type="email" placeholder="you@example.com" required />
          </div>
          <div class="form-group">
            <label class="form-label" for="login-password">Password</label>
            <input class="form-input" id="login-password" type="password" placeholder="••••••••" required />
          </div>
          <div style="text-align:right;margin-bottom:16px;">
            <a href="#/forgot-password" style="font-size:0.85rem;color:var(--accent-teal);">Forgot password?</a>
          </div>
          <button class="btn btn-primary btn-block btn-lg" type="submit" id="login-submit">Log In</button>
        </form>
        <p class="auth-footer">Don't have an account? <a href="#/register">Sign up</a></p>
      </div>
    </div>
  `;
}

export function bindLogin() {
  document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('login-submit');
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;
    btn.disabled = true;
    btn.textContent = 'Logging in...';
    try {
      await signInWithEmailAndPassword(auth, email, password);
      await authStore.refreshProfile();
      showToast('Welcome back, ' + authStore.alias + '!', 'success');
      router.navigate(authStore.isAdmin ? '/admin' : '/dashboard');
    } catch (err) {
      showToast(friendlyError(err.code), 'error');
      btn.disabled = false;
      btn.textContent = 'Log In';
    }
  });
}

export function renderRegister() {
  return `
    <div class="auth-page">
      <div class="auth-card fade-in">
        <div style="text-align:center;margin-bottom:24px;">
          <img src="/favicon.svg" alt="CharityPools" style="width:48px;height:48px;margin-bottom:12px;" />
        </div>
        <h1 class="auth-title">Create Account</h1>
        <p class="auth-subtitle">Join CharityPools and start playing for a cause</p>
        <form id="register-form">
          <div class="form-group">
            <label class="form-label" for="reg-alias">Alias / Display Name</label>
            <input class="form-input" id="reg-alias" type="text" placeholder="CoolGuy42" required minlength="2" maxlength="30" />
          </div>
          <div class="form-group">
            <label class="form-label" for="reg-email">Email</label>
            <input class="form-input" id="reg-email" type="email" placeholder="you@example.com" required />
          </div>
          <div class="form-group">
            <label class="form-label" for="reg-password">Password</label>
            <input class="form-input" id="reg-password" type="password" placeholder="Min 6 characters" required minlength="6" />
          </div>
          <div class="form-group">
            <label class="form-label" for="reg-org">Organization Name <span style="color:var(--text-muted);">(optional — create one if you're an admin)</span></label>
            <input class="form-input" id="reg-org" type="text" placeholder="e.g. St. Bernard Council" />
          </div>
          <div class="form-group">
            <label style="display:flex;align-items:center;gap:8px;cursor:pointer;color:var(--text-secondary);font-size:0.9rem;">
              <input type="checkbox" id="reg-is-admin" />
              Register as an organization admin
            </label>
          </div>
          <button class="btn btn-primary btn-block btn-lg" type="submit" id="reg-submit">Create Account</button>
        </form>
        <p class="auth-footer">Already have an account? <a href="#/login">Log in</a></p>
      </div>
    </div>
  `;
}

export function bindRegister() {
  const isAdminCheckbox = document.getElementById('reg-is-admin');
  const orgInput = document.getElementById('reg-org');
  isAdminCheckbox.addEventListener('change', () => {
    orgInput.required = isAdminCheckbox.checked;
    orgInput.parentElement.style.display = isAdminCheckbox.checked ? 'block' : 'block';
    if (isAdminCheckbox.checked) orgInput.focus();
  });

  document.getElementById('register-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('reg-submit');
    const alias = document.getElementById('reg-alias').value.trim();
    const email = document.getElementById('reg-email').value.trim();
    const password = document.getElementById('reg-password').value;
    const isAdmin = isAdminCheckbox.checked;
    const orgName = orgInput.value.trim();

    if (isAdmin && !orgName) {
      showToast('Organization name is required for admins', 'error');
      return;
    }

    btn.disabled = true;
    btn.textContent = 'Creating account...';

    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(cred.user, { displayName: alias });

      let orgId = null;
      if (isAdmin && orgName) {
        // Create organization
        const orgSlug = orgName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
        orgId = orgSlug + '-' + Date.now().toString(36);
        await setDoc(doc(db, 'organizations', orgId), {
          name: orgName,
          slug: orgSlug,
          adminUids: [cred.user.uid],
          createdAt: serverTimestamp(),
          charityName: '',
          charityPercent: 20,
          stripeAccountId: '',
          settings: { notificationsEnabled: true }
        });
      }

      // Create user profile
      await setDoc(doc(db, 'users', cred.user.uid), {
        alias,
        email,
        role: isAdmin ? 'admin' : 'participant',
        orgId: orgId,
        pools: [],
        createdAt: serverTimestamp()
      });

      await authStore.refreshProfile();
      showToast('Welcome to CharityPools, ' + alias + '!', 'success');
      router.navigate(isAdmin ? '/admin' : '/dashboard');
    } catch (err) {
      showToast(friendlyError(err.code), 'error');
      btn.disabled = false;
      btn.textContent = 'Create Account';
    }
  });
}

export function renderForgotPassword() {
  return `
    <div class="auth-page">
      <div class="auth-card fade-in">
        <div style="text-align:center;margin-bottom:24px;">
          <img src="/favicon.svg" alt="CharityPools" style="width:48px;height:48px;margin-bottom:12px;" />
        </div>
        <h1 class="auth-title">Reset Password</h1>
        <p class="auth-subtitle">Enter your email and we'll send you a link to reset your password.</p>
        <form id="forgot-form">
          <div class="form-group">
            <label class="form-label" for="forgot-email">Email</label>
            <input class="form-input" id="forgot-email" type="email" placeholder="you@example.com" required />
          </div>
          <button class="btn btn-primary btn-block btn-lg" type="submit" id="forgot-submit">Send Reset Link</button>
        </form>
        <div id="forgot-success" style="display:none;text-align:center;padding:24px 0;">
          <div style="font-size:3rem;margin-bottom:16px;">📧</div>
          <h3 style="margin-bottom:8px;">Check Your Email</h3>
          <p style="color:var(--text-secondary);margin-bottom:24px;">If an account exists with that email, we've sent a password reset link. Check your inbox and spam folder.</p>
          <a href="#/login" class="btn btn-primary">Back to Login</a>
        </div>
        <p class="auth-footer"><a href="#/login">← Back to Login</a></p>
      </div>
    </div>
  `;
}

export function bindForgotPassword() {
  document.getElementById('forgot-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('forgot-submit');
    const email = document.getElementById('forgot-email').value.trim();
    btn.disabled = true;
    btn.textContent = 'Sending...';
    try {
      await sendPasswordResetEmail(auth, email);
    } catch (err) {
      // Don't reveal whether the email exists — always show success
      console.log('Reset email attempt:', err.code);
    }
    // Always show success to prevent email enumeration
    document.getElementById('forgot-form').style.display = 'none';
    document.getElementById('forgot-success').style.display = 'block';
    document.querySelector('.auth-footer').style.display = 'none';
  });
}

function friendlyError(code) {
  const msgs = {
    'auth/email-already-in-use': 'This email is already registered.',
    'auth/invalid-email': 'Please enter a valid email address.',
    'auth/weak-password': 'Password must be at least 6 characters.',
    'auth/user-not-found': 'No account found with this email.',
    'auth/wrong-password': 'Incorrect password.',
    'auth/too-many-requests': 'Too many attempts. Please try again later.',
    'auth/invalid-credential': 'Invalid email or password.'
  };
  return msgs[code] || 'An error occurred. Please try again.';
}
