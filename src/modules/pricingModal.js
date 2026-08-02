import { getCurrentUser, PLANS } from '../services/authService.js';
import { showToast } from '../utils/helpers.js';

// ====================================================================
// PRICING MODAL — Premium plan cards with upgrade flow
// ====================================================================

let _onUpgrade = null;

/**
 * Show the pricing modal.
 * onUpgrade(planId) is called after a successful plan change.
 */
export function showPricingModal(onUpgrade) {
  _onUpgrade = onUpgrade;

  document.getElementById('pricing-modal-overlay')?.remove();

  const currentUser = getCurrentUser();
  const currentPlan = currentUser?.plan || 'free';

  const overlay = document.createElement('div');
  overlay.id    = 'pricing-modal-overlay';
  overlay.className = 'pricing-modal-overlay';
  overlay.innerHTML = _buildHTML(currentPlan);
  document.body.appendChild(overlay);

  requestAnimationFrame(() => overlay.classList.add('visible'));

  _bindEvents(overlay, currentPlan);
}

// ─── HTML ─────────────────────────────────────────────────────────────

function _buildHTML(currentPlan) {
  return `
    <div class="pricing-modal" id="pricing-modal">
      <!-- Close -->
      <button class="pricing-close" id="pricing-close" aria-label="Închide">
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>

      <!-- Header -->
      <div class="pricing-header">
        <div class="pricing-header-badge">✨ Planuri de Abonament</div>
        <h2 class="pricing-title">Alege planul tău</h2>
        <p class="pricing-subtitle">Generează videoclipuri virale și crește-ți prezența pe TikTok & Instagram</p>
      </div>

      <!-- Cards -->
      <div class="pricing-cards">

        <!-- FREE -->
        <div class="pricing-card ${currentPlan === 'free' ? 'pricing-card-current' : ''}" id="plan-card-free">
          <div class="pricing-card-header">
            <div class="pricing-plan-icon">🆓</div>
            <div class="pricing-plan-name">Free</div>
            <div class="pricing-plan-price">
              <span class="pricing-amount">0€</span>
              <span class="pricing-period">Lifetime</span>
            </div>
          </div>
          <ul class="pricing-features">
            <li class="feat-ok">✅ 1 video generat pe zi</li>
            <li class="feat-ok">✅ Calitate Full HD (1080p)</li>
            <li class="feat-ok">✅ Citate AI motivaționale</li>
            <li class="feat-no">❌ Auto-Generate</li>
            <li class="feat-no">❌ Selector cantitate</li>
          </ul>
          ${currentPlan === 'free'
            ? '<div class="pricing-current-badge">Planul tău actual</div>'
            : '<button class="pricing-btn pricing-btn-outline" data-plan="free">Continuă Free</button>'}
        </div>

        <!-- BASIC -->
        <div class="pricing-card ${currentPlan === 'basic' ? 'pricing-card-current' : ''}" id="plan-card-basic">
          <div class="pricing-card-header">
            <div class="pricing-plan-icon">⚡</div>
            <div class="pricing-plan-name">Basic</div>
            <div class="pricing-plan-price">
              <span class="pricing-amount">10€</span>
              <span class="pricing-period">Lifetime</span>
            </div>
          </div>
          <ul class="pricing-features">
            <li class="feat-ok">✅ 3 videoclipuri pe zi</li>
            <li class="feat-ok">✅ Calitate Full HD (1080p)</li>
            <li class="feat-ok">✅ Citate AI motivaționale</li>
            <li class="feat-ok">✅ Prioritate la generare</li>
            <li class="feat-no">❌ Auto-Generate</li>
            <li class="feat-no">❌ Selector cantitate</li>
          </ul>
          ${currentPlan === 'basic'
            ? '<div class="pricing-current-badge">Planul tău actual</div>'
            : `<button class="pricing-btn ${currentPlan === 'pro' ? 'pricing-btn-outline' : 'pricing-btn-blue'}" data-plan="basic">
                ${currentPlan === 'pro' ? 'Downgrade la Basic' : '⚡ Upgrade la Basic'}
               </button>`}
        </div>

        <!-- PRO — HIGHLIGHTED -->
        <div class="pricing-card pricing-card-pro ${currentPlan === 'pro' ? 'pricing-card-current' : ''}" id="plan-card-pro">
          <div class="pricing-pro-badge">🔥 POPULAR</div>
          <div class="pricing-card-header">
            <div class="pricing-plan-icon">👑</div>
            <div class="pricing-plan-name">Pro</div>
            <div class="pricing-plan-price">
              <span class="pricing-amount">20€</span>
              <span class="pricing-period">Lifetime</span>
            </div>
          </div>
          <ul class="pricing-features">
            <li class="feat-ok">✅ <strong>Generări INFINITE</strong> pe zi</li>
            <li class="feat-ok">✅ Calitate Full HD (1080p)</li>
            <li class="feat-ok">✅ Citate AI motivaționale</li>
            <li class="feat-ok">✅ <strong>Auto-Generate On/Off</strong></li>
            <li class="feat-ok">✅ <strong>Selector cantitate</strong> (1,3,5,10,∞)</li>
            <li class="feat-ok">✅ Prioritate maximă</li>
          </ul>
          ${currentPlan === 'pro'
            ? '<div class="pricing-current-badge">Planul tău actual</div>'
            : '<button class="pricing-btn pricing-btn-pro" data-plan="pro">👑 Upgrade la Pro</button>'}
        </div>

      </div>

      <p class="pricing-note">💡 Plătești o singură dată și ai acces pe viață la planul ales.</p>
    </div>
  `;
}

// ─── Events ──────────────────────────────────────────────────────────

function _bindEvents(overlay, currentPlan) {
  // Close button
  document.getElementById('pricing-close').addEventListener('click', _dismiss);
  // Click outside
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) _dismiss();
  });

  // Upgrade buttons
  overlay.querySelectorAll('[data-plan]').forEach(btn => {
    btn.addEventListener('click', () => {
      const planId = btn.dataset.plan;
      if (planId === currentPlan) { _dismiss(); return; }
      _doUpgrade(planId);
    });
  });
}

async function _doUpgrade(planId) {
  const currentUser = getCurrentUser();
  if (!currentUser) {
    showToast('Te rugăm să te conectezi mai întâi.', 'error');
    return;
  }

  const btn = document.querySelector(`.pricing-btn[data-plan="${planId}"]`);
  if (btn) {
    btn.innerHTML = `<span style="opacity:0.7">Se încarcă...</span>`;
    btn.disabled = true;
  }

  try {
    const res = await fetch('/.netlify/functions/create-paypal-order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        planId: planId,
        uid: currentUser.uid
      })
    });

    const data = await res.json();

    if (data.url) {
      window.location.href = data.url; // Redirect to PayPal
    } else {
      throw new Error(data.error || 'Eroare la procesarea plății.');
    }
  } catch (err) {
    console.error(err);

    // Fallback pentru testare pe Localhost (când Netlify Functions nu rulează)
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      showToast('Localhost Mock: Simulăm plata către PayPal...', 'info');
      setTimeout(async () => {
        try {
          const { doc, setDoc } = await import('firebase/firestore');
          const { db } = await import('../services/authService.js');
          setDoc(doc(db, 'users', currentUser.uid), { plan: planId }, { merge: true }).catch(err => {
            console.warn('Eroare mock Firestore (baza de date probabil nu e activa):', err);
          });
          showToast('Mock reușit! Plan actualizat.', 'success');
          _dismiss();
        } catch (e) {
          showToast('Mock Error: ' + e.message, 'error');
          if (btn) {
            btn.innerHTML = `Eroare`;
            btn.disabled = false;
          }
        }
      }, 1500);
      return;
    }

    showToast(`Eroare PayPal: ${err.message || 'Verifică consola pentru detalii.'}`, 'error');
    if (btn) {
      btn.innerHTML = `Eroare`;
      btn.disabled = false;
    }
  }
}

function _dismiss() {
  const overlay = document.getElementById('pricing-modal-overlay');
  if (!overlay) return;
  overlay.classList.remove('visible');
  setTimeout(() => overlay.remove(), 350);
}
