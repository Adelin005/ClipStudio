import { register, login, forgotPassword } from '../services/authService.js';

// ====================================================================
// AUTH MODAL — Firebase Auth: Login | Register | Forgot Password
// ====================================================================

let _onSuccess = null;

/**
 * Show the auth modal. onSuccess(user) called after successful auth.
 */
export function showAuthModal(onSuccess) {
  _onSuccess = onSuccess;

  document.getElementById('auth-modal-overlay')?.remove();

  const overlay = document.createElement('div');
  overlay.id = 'auth-modal-overlay';
  overlay.className = 'auth-modal-overlay';
  overlay.innerHTML = _buildHTML();
  document.body.appendChild(overlay);

  requestAnimationFrame(() => overlay.classList.add('visible'));

  _bindEvents(overlay);
}

// ─── HTML ─────────────────────────────────────────────────────────────

function _buildHTML() {
  return `
    <div class="auth-modal" id="auth-modal">

      <!-- Glowing blobs -->
      <div class="auth-blob auth-blob-1"></div>
      <div class="auth-blob auth-blob-2"></div>

      <!-- Logo / Header -->
      <div class="auth-modal-header">
        <div class="auth-logo">
          <svg class="auth-logo-icon" xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="url(#auth-logo-g)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <defs>
              <linearGradient id="auth-logo-g" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stop-color="#6366f1"/>
                <stop offset="100%" stop-color="#ec4899"/>
              </linearGradient>
            </defs>
            <path d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14v-4z"/>
            <rect x="3" y="6" width="12" height="12" rx="2" ry="2"/>
          </svg>
          <span class="auth-logo-text">ViralClip<span class="auth-logo-accent">Studio</span></span>
        </div>
        <p class="auth-tagline" id="auth-tagline">Generează videoclipuri virale cu AI ✨</p>
      </div>

      <!-- Tabs (Login / Register) -->
      <div class="auth-tabs" id="auth-tabs">
        <button class="auth-tab active" data-tab="login"    id="tab-login">Conectare</button>
        <button class="auth-tab"        data-tab="register" id="tab-register">Cont Nou</button>
      </div>

      <!-- Forms wrapper -->
      <div class="auth-forms">

        <!-- ── LOGIN ── -->
        <form class="auth-form active" id="form-login" autocomplete="on" novalidate>
          <div class="auth-field">
            <label class="auth-label" for="login-email">Email</label>
            <div class="auth-input-wrap">
              <svg class="auth-input-icon" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
              <input class="auth-input" type="email" id="login-email" placeholder="email@exemplu.com" autocomplete="email" />
            </div>
          </div>
          <div class="auth-field">
            <label class="auth-label" for="login-password">
              Parolă
              <button type="button" class="auth-forgot-link" id="btn-forgot-link">Ai uitat parola?</button>
            </label>
            <div class="auth-input-wrap">
              <svg class="auth-input-icon" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
              <input class="auth-input" type="password" id="login-password" placeholder="Parola ta" autocomplete="current-password" />
              <button type="button" class="auth-toggle-pw" data-target="login-password" aria-label="Arată parola">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
              </button>
            </div>
          </div>
          <div class="auth-error" id="login-error"></div>
          <button type="submit" class="auth-submit" id="btn-login">
            <span class="auth-submit-glow"></span>
            <span id="login-btn-text">Conectează-te</span>
          </button>
          <p class="auth-switch">Nu ai cont?
            <button type="button" class="auth-switch-btn" data-switch="register">Creează unul gratuit →</button>
          </p>
        </form>

        <!-- ── REGISTER ── -->
        <form class="auth-form" id="form-register" autocomplete="on" novalidate>
          <div class="auth-field">
            <label class="auth-label" for="reg-email">Email</label>
            <div class="auth-input-wrap">
              <svg class="auth-input-icon" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
              <input class="auth-input" type="email" id="reg-email" placeholder="email@exemplu.com" autocomplete="email" />
            </div>
          </div>
          <div class="auth-field">
            <label class="auth-label" for="reg-password">Parolă</label>
            <div class="auth-input-wrap">
              <svg class="auth-input-icon" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
              <input class="auth-input" type="password" id="reg-password" placeholder="Cel puțin 6 caractere" autocomplete="new-password" />
              <button type="button" class="auth-toggle-pw" data-target="reg-password" aria-label="Arată parola">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
              </button>
            </div>
          </div>
          <div class="auth-field">
            <label class="auth-label" for="reg-password2">Confirmă Parola</label>
            <div class="auth-input-wrap">
              <svg class="auth-input-icon" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
              <input class="auth-input" type="password" id="reg-password2" placeholder="Repetă parola" autocomplete="new-password" />
            </div>
          </div>
          <div class="auth-error" id="register-error"></div>
          <button type="submit" class="auth-submit" id="btn-register">
            <span class="auth-submit-glow"></span>
            <span id="register-btn-text">Creează Cont Gratuit</span>
          </button>
          <div class="auth-free-badge">
            🆓 Planul Free include <strong>1 video/zi</strong> — fără card bancar
          </div>
          <p class="auth-switch">Ai deja cont?
            <button type="button" class="auth-switch-btn" data-switch="login">Conectează-te →</button>
          </p>
        </form>

        <!-- ── FORGOT PASSWORD ── -->
        <form class="auth-form" id="form-forgot" novalidate>
          <div class="auth-forgot-back">
            <button type="button" class="auth-back-btn" id="btn-back-to-login">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"/></svg>
              Înapoi la conectare
            </button>
          </div>
          <div class="auth-forgot-icon">🔑</div>
          <h3 class="auth-forgot-title">Resetează parola</h3>
          <p class="auth-forgot-desc">Introdu email-ul contului tău și îți trimitem un link de resetare a parolei.</p>

          <div class="auth-field" style="margin-top: 24px;">
            <label class="auth-label" for="forgot-email">Email</label>
            <div class="auth-input-wrap">
              <svg class="auth-input-icon" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
              <input class="auth-input" type="email" id="forgot-email" placeholder="email@exemplu.com" autocomplete="email" />
            </div>
          </div>
          <div class="auth-error" id="forgot-error"></div>

          <!-- Success state (hidden by default) -->
          <div class="auth-forgot-success" id="forgot-success" style="display:none;">
            <div class="auth-forgot-success-icon">📬</div>
            <p>Email trimis cu succes!</p>
            <p class="auth-forgot-success-sub">Verifică inbox-ul (și folderul Spam) pentru link-ul de resetare.</p>
          </div>

          <button type="submit" class="auth-submit" id="btn-forgot-submit">
            <span class="auth-submit-glow"></span>
            <span id="forgot-btn-text">Trimite Link de Resetare</span>
          </button>
        </form>

      </div>
    </div>
  `;
}

// ─── Events ──────────────────────────────────────────────────────────

function _bindEvents(overlay) {
  // Tab switching
  overlay.querySelectorAll('.auth-tab').forEach(tab => {
    tab.addEventListener('click', () => _switchTab(tab.dataset.tab));
  });

  // Switch text links (login/register)
  overlay.querySelectorAll('.auth-switch-btn').forEach(btn => {
    btn.addEventListener('click', () => _switchTab(btn.dataset.switch));
  });

  // "Ai uitat parola?" link
  document.getElementById('btn-forgot-link')?.addEventListener('click', () => {
    _switchToForgot();
  });

  // Back to login from forgot
  document.getElementById('btn-back-to-login')?.addEventListener('click', () => {
    _switchTab('login');
  });

  // Password visibility toggles
  overlay.querySelectorAll('.auth-toggle-pw').forEach(btn => {
    btn.addEventListener('click', () => {
      const input = document.getElementById(btn.dataset.target);
      if (!input) return;
      input.type = input.type === 'password' ? 'text' : 'password';
    });
  });

  // Login form
  document.getElementById('form-login').addEventListener('submit', async (e) => {
    e.preventDefault();
    await _handleLogin();
  });

  // Register form
  document.getElementById('form-register').addEventListener('submit', async (e) => {
    e.preventDefault();
    await _handleRegister();
  });

  // Forgot password form
  document.getElementById('form-forgot').addEventListener('submit', async (e) => {
    e.preventDefault();
    await _handleForgot();
  });
}

// ─── Tab / Form switching ────────────────────────────────────────────

function _switchTab(tab) {
  // Show/hide tabs bar depending on screen
  const tabsEl   = document.getElementById('auth-tabs');
  const taglineEl = document.getElementById('auth-tagline');

  if (tab === 'forgot') {
    _switchToForgot();
    return;
  }

  // Show tabs
  if (tabsEl) tabsEl.style.display = 'flex';
  if (taglineEl) taglineEl.style.display = '';

  document.querySelectorAll('.auth-tab').forEach(t => t.classList.toggle('active', t.dataset.tab === tab));
  document.querySelectorAll('.auth-form').forEach(f => f.classList.toggle('active', f.id === `form-${tab}`));
}

function _switchToForgot() {
  const tabsEl   = document.getElementById('auth-tabs');
  const taglineEl = document.getElementById('auth-tagline');

  // Hide tabs bar (forgot has its own back button)
  if (tabsEl) tabsEl.style.display = 'none';
  if (taglineEl) taglineEl.style.display = 'none';

  document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.auth-form').forEach(f => f.classList.toggle('active', f.id === 'form-forgot'));

  // Pre-fill forgot email if login email exists
  const loginEmail  = document.getElementById('login-email')?.value;
  const forgotEmail = document.getElementById('forgot-email');
  if (forgotEmail && loginEmail) forgotEmail.value = loginEmail;
}

// ─── Form handlers ───────────────────────────────────────────────────

async function _handleLogin() {
  const email    = document.getElementById('login-email').value;
  const password = document.getElementById('login-password').value;
  const errEl    = document.getElementById('login-error');
  const btnText  = document.getElementById('login-btn-text');
  const btn      = document.getElementById('btn-login');

  errEl.textContent = '';
  if (!email || !password) { errEl.textContent = 'Completează toate câmpurile.'; return; }

  btnText.textContent = 'Se verifică...';
  btn.disabled = true;

  const result = await login(email, password);

  if (result.ok) {
    _dismiss();
    _onSuccess?.(result.user);
  } else {
    errEl.textContent = result.error;
    btnText.textContent = 'Conectează-te';
    btn.disabled = false;
  }
}

async function _handleRegister() {
  const email  = document.getElementById('reg-email').value;
  const pw     = document.getElementById('reg-password').value;
  const pw2    = document.getElementById('reg-password2').value;
  const errEl  = document.getElementById('register-error');
  const btnText = document.getElementById('register-btn-text');
  const btn     = document.getElementById('btn-register');

  errEl.textContent = '';
  if (!email || !pw || !pw2) { errEl.textContent = 'Completează toate câmpurile.'; return; }
  if (pw !== pw2) { errEl.textContent = 'Parolele nu se potrivesc.'; return; }
  if (pw.length < 6) { errEl.textContent = 'Parola trebuie să aibă cel puțin 6 caractere.'; return; }

  btnText.textContent = 'Se creează contul...';
  btn.disabled = true;

  const result = await register(email, pw);

  if (result.ok) {
    _dismiss();
    _onSuccess?.(result.user);
  } else {
    errEl.textContent = result.error;
    btnText.textContent = 'Creează Cont Gratuit';
    btn.disabled = false;
  }
}

async function _handleForgot() {
  const email   = document.getElementById('forgot-email').value;
  const errEl   = document.getElementById('forgot-error');
  const btnText = document.getElementById('forgot-btn-text');
  const btn     = document.getElementById('btn-forgot-submit');
  const success = document.getElementById('forgot-success');

  errEl.textContent = '';
  if (!email) { errEl.textContent = 'Introdu adresa de email.'; return; }

  btnText.textContent = 'Se trimite...';
  btn.disabled = true;

  const result = await forgotPassword(email);

  if (result.ok) {
    // Show success message, hide button
    btn.style.display = 'none';
    if (success) success.style.display = 'block';
  } else {
    errEl.textContent = result.error;
    btnText.textContent = 'Trimite Link de Resetare';
    btn.disabled = false;
  }
}

// ─── Dismiss ─────────────────────────────────────────────────────────

function _dismiss() {
  const overlay = document.getElementById('auth-modal-overlay');
  if (!overlay) return;
  overlay.classList.remove('visible');
  setTimeout(() => overlay.remove(), 350);
}
