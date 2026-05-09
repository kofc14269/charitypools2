// Simple hash-based SPA Router
export class Router {
  constructor() {
    this.routes = {};
    this.currentRoute = null;
    this.beforeEach = null;
    window.addEventListener('hashchange', () => this.resolve());
  }

  on(path, handler) {
    this.routes[path] = handler;
    return this;
  }

  guard(fn) {
    this.beforeEach = fn;
    return this;
  }

  navigate(path) {
    window.location.hash = path;
  }

  resolve() {
    const hash = window.location.hash.slice(1) || '/';
    const { handler, params } = this.matchRoute(hash);

    if (this.beforeEach) {
      const result = this.beforeEach(hash, params);
      if (result === false) return;
      if (typeof result === 'string') {
        this.navigate(result);
        return;
      }
    }

    this.currentRoute = hash;
    if (handler) {
      handler(params);
    } else if (this.routes['*']) {
      this.routes['*']({ path: hash });
    }
  }

  matchRoute(hash) {
    // Exact match first
    if (this.routes[hash]) return { handler: this.routes[hash], params: {} };

    // Pattern matching with :params
    for (const [pattern, handler] of Object.entries(this.routes)) {
      const patternParts = pattern.split('/');
      const hashParts = hash.split('/');
      if (patternParts.length !== hashParts.length) continue;

      const params = {};
      let match = true;
      for (let i = 0; i < patternParts.length; i++) {
        if (patternParts[i].startsWith(':')) {
          params[patternParts[i].slice(1)] = hashParts[i];
        } else if (patternParts[i] !== hashParts[i]) {
          match = false;
          break;
        }
      }
      if (match) return { handler, params };
    }
    return { handler: null, params: {} };
  }

  start() {
    this.resolve();
  }
}

export const router = new Router();
