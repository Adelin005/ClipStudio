import './styles/main.css';
import { renderAutoPanel } from './modules/autoPanel.js';
import { renderHistoryPanel } from './modules/historyPanel.js';
import { showToast } from './utils/helpers.js';
import { showAuthModal } from './modules/authModal.js';
import { showPricingModal } from './modules/pricingModal.js';
import { showApiGuideModal } from './modules/apiGuideModal.js';
import { getCurrentUser, logout, getCurrentPlan, PLANS, onAuthChange } from './services/authService.js';
import { resolveApiKeys } from './config/devKeys.js';

// Global app state
const state = {
  currentStep: 1,
  niche: null,
  aiMode: null,
  promptText: '',
  // User's own keys (Basic/Pro) — read from localStorage
  pexelsApiKey: localStorage.getItem('viralclip_pexels_key') || '',
  cfAccountId:  localStorage.getItem('viralclip_cf_account') || '',
  cfApiToken:   localStorage.getItem('viralclip_cf_token') || '',
  videos: [],
  musicTracks: [],
  selectedMusic: null,
  musicVolume: 0.7,
  textSettings: null,
  totalDuration: 15,
  segmentDuration: 1.5,
};

/**
 * Returns the effective API keys for the current user:
 * Free plan → developer's keys (auto, no input needed)
 * Basic/Pro → user's own keys from the sidebar
 */
export function getEffectiveKeys() {
  const plan = getCurrentPlan();
  return resolveApiKeys(plan, {
    pexelsApiKey: state.pexelsApiKey,
    cfAccountId:  state.cfAccountId,
    cfApiToken:   state.cfApiToken,
  });
}

// ── API Key inputs (only active for Basic/Pro users) ──
function initApiKeyInputs() {
  const plan           = getCurrentPlan();
  const isFreePlan     = plan.id === 'free';
  const apiWrapper     = document.querySelector('.api-keys-wrapper');
  const apiHelpBtn     = document.getElementById('btn-api-help');
  const freeApiNotice  = document.getElementById('free-api-notice');
  const apiFieldGroups = document.querySelectorAll('.api-field-group');

  if (isFreePlan) {
    // Hide manual input fields for free users
    apiFieldGroups.forEach(g => g.style.display = 'none');
    if (apiHelpBtn) apiHelpBtn.style.display = 'none';
    if (freeApiNotice) freeApiNotice.style.display = 'flex';
  } else {
    apiFieldGroups.forEach(g => g.style.display = 'block');
    if (apiHelpBtn) apiHelpBtn.style.display = '';
    if (freeApiNotice) freeApiNotice.style.display = 'none';

    const pexelsKeyInput = document.getElementById('pexels-api-key');
    if (pexelsKeyInput) {
      pexelsKeyInput.value = state.pexelsApiKey;
      pexelsKeyInput.addEventListener('input', (e) => {
        state.pexelsApiKey = e.target.value.trim();
        localStorage.setItem('viralclip_pexels_key', state.pexelsApiKey);
      });
    }
    const cfAccountIdInput = document.getElementById('cf-account-id');
    if (cfAccountIdInput) {
      cfAccountIdInput.value = state.cfAccountId;
      cfAccountIdInput.addEventListener('input', (e) => {
        state.cfAccountId = e.target.value.trim();
        localStorage.setItem('viralclip_cf_account', state.cfAccountId);
      });
    }
    const cfApiTokenInput = document.getElementById('cf-api-token');
    if (cfApiTokenInput) {
      cfApiTokenInput.value = state.cfApiToken;
      cfApiTokenInput.addEventListener('input', (e) => {
        state.cfApiToken = e.target.value.trim();
        localStorage.setItem('viralclip_cf_token', state.cfApiToken);
      });
    }
  }
}

const mainContent = document.getElementById('main-content');

// ─── Navigation ───────────────────────────────────────────────────────

function goToStep(step) {
  state.currentStep = step;
  document.querySelectorAll('.nav-step').forEach(btn => {
    const s = parseInt(btn.dataset.step);
    btn.classList.toggle('active', s === step);
    btn.classList.toggle('completed', s < step);
  });
  renderStep();
}

function renderStep() {
  mainContent.innerHTML = '';
  const panel = document.createElement('div');
  panel.className = 'step-panel active';
  mainContent.appendChild(panel);

  // Resolve the correct API keys per plan before rendering
  const effectiveKeys = getEffectiveKeys();
  const stateWithKeys = { ...state, ...effectiveKeys };

  switch (state.currentStep) {
    case 1:
      renderAutoPanel(panel, stateWithKeys, () => goToStep(2));
      break;
    case 2:
      renderHistoryPanel(panel);
      break;
  }
}

// Sidebar nav clicks
document.querySelectorAll('.nav-step').forEach(btn => {
  btn.addEventListener('click', () => {
    if (btn.id === 'nav-step-settings') return;
    const step = parseInt(btn.dataset.step);
    if (!isNaN(step)) goToStep(step);
  });
});

// Mobile API Settings toggle
const mobileSettingsBtn = document.getElementById('nav-step-settings');
const sidebarFooter = document.getElementById('sidebar-footer');
if (mobileSettingsBtn && sidebarFooter) {
  mobileSettingsBtn.addEventListener('click', () => {
    sidebarFooter.classList.toggle('show-mobile');
    mobileSettingsBtn.classList.toggle('active');
  });
  document.addEventListener('click', (e) => {
    if (sidebarFooter.classList.contains('show-mobile') &&
        !sidebarFooter.contains(e.target) &&
        !mobileSettingsBtn.contains(e.target)) {
      sidebarFooter.classList.remove('show-mobile');
      mobileSettingsBtn.classList.remove('active');
    }
  });
}

// ─── User Widget ──────────────────────────────────────────────────────

function updateSidebarUser() {
  const user    = getCurrentUser();
  const plan    = getCurrentPlan();
  const widget  = document.getElementById('sidebar-user');
  const avatar  = document.getElementById('user-avatar');
  const name    = document.getElementById('user-name');
  const badge   = document.getElementById('user-plan-badge');
  const logoutBtn = document.getElementById('btn-logout');

  if (!user || !widget) return;

  widget.style.display = 'flex';
  if (logoutBtn) logoutBtn.style.display = 'flex';

  // Avatar letter
  if (avatar) {
    avatar.textContent = (user.displayName || user.email)[0].toUpperCase();
    // Color based on plan
    const planColors = { free: '#71717a', basic: '#3b82f6', pro: '#f59e0b' };
    avatar.style.background = planColors[user.plan] || planColors.free;
  }

  if (name)  name.textContent = user.displayName || user.email.split('@')[0];
  if (badge) {
    badge.textContent = plan.badge;
    badge.style.color = plan.color;
  }

  // Update API fields visibility based on plan
  initApiKeyInputs();
}

function initUserWidget() {
  // Upgrade button
  const btnUpgrade = document.getElementById('btn-upgrade');
  if (btnUpgrade) {
    btnUpgrade.addEventListener('click', () => {
      showPricingModal((planId) => {
        updateSidebarUser();
        // Re-render current step to apply new plan restrictions
        renderStep();
      });
    });
  }

  // API Help button
  const btnApiHelp = document.getElementById('btn-api-help');
  if (btnApiHelp) {
    btnApiHelp.addEventListener('click', () => showApiGuideModal());
  }

  // Logout button
  const btnLogout = document.getElementById('btn-logout');
  if (btnLogout) {
    btnLogout.addEventListener('click', async () => {
      await logout();
      // onAuthChange will fire automatically and show auth modal
      showToast('Te-ai deconectat. La revedere! 👋', 'success');
    });
  }
}

// ─── Auth Guard ───────────────────────────────────────────────────────

let _appBooted = false; // prevent double init

function boot() {
  initUserWidget();

  // Check for PayPal return token
  const urlParams = new URLSearchParams(window.location.search);
  const checkoutStatus = urlParams.get('checkout');
  const token = urlParams.get('token');

  if (checkoutStatus === 'success' && token) {
    // Clean up URL immediately so we don't trigger it again on reload
    window.history.replaceState({}, document.title, window.location.pathname);
    
    showToast('Procesăm plata, te rugăm să aștepți...', 'info');
    
    // Call backend to capture the order
    fetch('/.netlify/functions/capture-paypal-order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token })
    })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        showToast('Plată reușită! Planul tău a fost actualizat. 🎉', 'success');
        // The auth listener will automatically pick up the new plan from Firestore
      } else {
        throw new Error(data.error || 'Eroare necunoscută la validarea plății.');
      }
    })
    .catch(err => {
      console.error('Capture error:', err);
      showToast('Eroare la validarea plății: ' + err.message, 'error');
    });
  } else if (checkoutStatus === 'cancel') {
    window.history.replaceState({}, document.title, window.location.pathname);
    showToast('Plata a fost anulată.', 'info');
  }

  // onAuthChange fires immediately with current Firebase user (or null)
  // Firebase persists session across page reloads automatically
  onAuthChange((user) => {
    if (user) {
      // User is logged in (existing session or just logged in)
      updateSidebarUser();
      if (!_appBooted) {
        _appBooted = true;
        goToStep(1);
      } else {
        // Re-render current step to reflect plan changes
        renderStep();
      }
    } else {
      // Not logged in — show auth modal
      if (!document.getElementById('auth-modal-overlay')) {
        document.getElementById('sidebar-user').style.display = 'none';
        const logoutBtn = document.getElementById('btn-logout');
        if (logoutBtn) logoutBtn.style.display = 'none';

        showAuthModal((loggedInUser) => {
          showToast(`Bun venit, ${loggedInUser.displayName}! 👋`, 'success');
          updateSidebarUser();
          _appBooted = true;
          goToStep(1);
        });
      }
    }
  });
}

boot();
