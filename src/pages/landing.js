// Landing page
import { sportIcon } from '../utils.js';

export function renderLanding() {
  return `
    <section class="hero">
      <h1 class="hero-title fade-in">
        Sports Pools <span class="gradient-text">for a Cause</span>
      </h1>
      <p class="hero-subtitle fade-in">
        Join charity pools for Super Bowl, March Madness, and more. Every entry supports your favorite cause.
      </p>
      <div class="hero-actions fade-in">
        <a href="#/register" class="btn btn-primary btn-lg">Get Started</a>
        <a href="#/pools" class="btn btn-secondary btn-lg">Browse Pools</a>
      </div>
    </section>

    <section class="section">
      <div class="container">
        <h2 style="text-align:center;margin-bottom:48px;font-size:2rem;">How It Works</h2>
        <div class="grid grid-3">
          <div class="card fade-in" style="text-align:center;padding:40px 24px;">
            <div style="font-size:3rem;margin-bottom:16px;">📝</div>
            <h3 style="margin-bottom:8px;">1. Sign Up</h3>
            <p style="color:var(--text-secondary);">Create your account with an alias name. Quick and easy registration.</p>
          </div>
          <div class="card fade-in" style="text-align:center;padding:40px 24px;">
            <div style="font-size:3rem;margin-bottom:16px;">🎯</div>
            <h3 style="margin-bottom:8px;">2. Join a Pool</h3>
            <p style="color:var(--text-secondary);">Pick your squares, fill your bracket, or make your picks. Pay securely online or in person.</p>
          </div>
          <div class="card fade-in" style="text-align:center;padding:40px 24px;">
            <div style="font-size:3rem;margin-bottom:16px;">🏆</div>
            <h3 style="margin-bottom:8px;">3. Win & Give</h3>
            <p style="color:var(--text-secondary);">Track results in real-time. A portion of every pool goes to charity.</p>
          </div>
        </div>
      </div>
    </section>

    <section class="section" style="background:var(--bg-secondary);">
      <div class="container">
        <h2 style="text-align:center;margin-bottom:48px;font-size:2rem;">Pool Types</h2>
        <div class="grid grid-3">
          ${poolTypeCard('football', 'Super Bowl Squares', '10×10 grid, quarter payouts, score changes, neighboring boxes, and more.')}
          ${poolTypeCard('basketball', 'March Madness Bracket', 'Full 64-team bracket. Pick winners, earn points, climb the leaderboard.')}
          ${poolTypeCard('baseball', "Pick'em & More", 'Weekly pick pools, over/under, confidence pools for every sport.')}
        </div>
      </div>
    </section>

    <section class="section">
      <div class="container" style="text-align:center;">
        <h2 style="margin-bottom:16px;font-size:2rem;">For Organizations</h2>
        <p style="color:var(--text-secondary);max-width:600px;margin:0 auto 32px;font-size:1.1rem;">
          Run charity pools for your club, church, workplace, or community group. Full admin controls, payment tracking, and shareable links.
        </p>
        <a href="#/register" class="btn btn-primary btn-lg">Create Your Organization</a>
      </div>
    </section>
  `;
}

function poolTypeCard(sport, title, desc) {
  return `
    <div class="pool-card fade-in">
      <div class="pool-card-banner ${sport}"></div>
      <div class="pool-card-body">
        <div class="pool-card-sport ${sport}">${sportIcon(sport)} ${sport}</div>
        <div class="pool-card-name">${title}</div>
        <p style="color:var(--text-secondary);font-size:0.9rem;">${desc}</p>
      </div>
    </div>
  `;
}

export function bindLanding() {
  // Intersection observer for fade-in animations
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.style.opacity = '1';
        entry.target.style.transform = 'translateY(0)';
      }
    });
  }, { threshold: 0.1 });

  document.querySelectorAll('.fade-in').forEach(el => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(20px)';
    el.style.transition = 'opacity 0.6s ease-out, transform 0.6s ease-out';
    observer.observe(el);
  });
}
