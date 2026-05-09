// Auth state management
import { auth, db, onAuthStateChanged, doc, getDoc } from './firebase.js';

class AuthStore {
  constructor() {
    this.user = null;
    this.profile = null;
    this.loading = true;
    this.listeners = [];
  }

  init() {
    return new Promise((resolve) => {
      onAuthStateChanged(auth, async (user) => {
        this.user = user;
        if (user) {
          try {
            const snap = await getDoc(doc(db, 'users', user.uid));
            this.profile = snap.exists() ? { id: snap.id, ...snap.data() } : null;
          } catch (e) {
            console.error('Error loading profile:', e);
            this.profile = null;
          }
        } else {
          this.profile = null;
        }
        this.loading = false;
        this.notify();
        resolve(this.user);
      });
    });
  }

  get isLoggedIn() { return !!this.user; }
  get isAdmin() { return this.profile?.role === 'admin' || this.profile?.role === 'superadmin'; }
  get orgId() { return this.profile?.orgId || null; }
  get alias() { return this.profile?.alias || 'User'; }
  get uid() { return this.user?.uid || null; }

  subscribe(fn) {
    this.listeners.push(fn);
    return () => { this.listeners = this.listeners.filter(l => l !== fn); };
  }

  notify() {
    this.listeners.forEach(fn => fn(this));
  }

  async refreshProfile() {
    if (!this.user) return;
    const snap = await getDoc(doc(db, 'users', this.user.uid));
    this.profile = snap.exists() ? { id: snap.id, ...snap.data() } : null;
    this.notify();
  }
}

export const authStore = new AuthStore();
