// Auth pages — Login & Register
import { auth, db, createUserWithEmailAndPassword, signInWithEmailAndPassword, sendPasswordResetEmail, updateProfile, doc, setDoc, getDoc, serverTimestamp, googleProvider, signInWithPopup } from '../firebase.js';
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
          <button class="btn btn-primary btn-block btn-lg" type="submit" id="login-submit" style="margin-bottom:16px;">Log In</button>
          
          <div class="auth-divider">or</div>
          
          <button class="btn btn-secondary btn-block btn-lg" type="button" id="google-login-btn">
            <svg viewBox="0 0 24 24" width="24" height="24" style="margin-right:8px;"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.16v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.16C1.43 8.55 1 10.22 1 12s.43 3.45 1.16 4.93l3.68-2.84z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.16 7.07l3.68 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
            Continue with Google
          </button>
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

  document.getElementById('google-login-btn').addEventListener('click', handleGoogleAuth);
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
          <button class="btn btn-primary btn-block btn-lg" type="submit" id="reg-submit" style="margin-bottom:16px;">Create Account</button>
          
          <div class="auth-divider">or</div>
          
          <button class="btn btn-secondary btn-block btn-lg" type="button" id="google-reg-btn">
            <svg viewBox="0 0 24 24" width="24" height="24" style="margin-right:8px;"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.16v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.16C1.43 8.55 1 10.22 1 12s.43 3.45 1.16 4.93l3.68-2.84z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.16 7.07l3.68 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
            Continue with Google
          </button>
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

  document.getElementById('google-reg-btn').addEventListener('click', handleGoogleAuth);
}

async function handleGoogleAuth() {
  try {
    const cred = await signInWithPopup(auth, googleProvider);
    
    // Check if user document exists
    const userDoc = await getDoc(doc(db, 'users', cred.user.uid));
    
    if (!userDoc.exists()) {
      // First time Google login - create profile
      await setDoc(doc(db, 'users', cred.user.uid), {
        alias: cred.user.displayName || 'GoogleUser',
        email: cred.user.email,
        role: 'participant',
        orgId: null,
        pools: [],
        createdAt: serverTimestamp()
      });
    }

    await authStore.refreshProfile();
    showToast('Welcome to CharityPools, ' + authStore.alias + '!', 'success');
    router.navigate(authStore.isAdmin ? '/admin' : '/dashboard');
  } catch (err) {
    if (err.code !== 'auth/popup-closed-by-user' && err.code !== 'auth/cancelled-popup-request') {
      console.error(err);
      showToast('Google login failed.', 'error');
    }
  }
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
