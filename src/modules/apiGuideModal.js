// ====================================================================
// API GUIDE MODAL — Step-by-step tutorial: Cloudflare AI + Pexels
// ====================================================================

let _currentStep = 0; // 0 = overview, 1 = cloudflare, 2 = pexels

export function showApiGuideModal() {
  document.getElementById('api-guide-overlay')?.remove();

  _currentStep = 0;

  const overlay = document.createElement('div');
  overlay.id = 'api-guide-overlay';
  overlay.className = 'api-guide-overlay';
  overlay.innerHTML = _buildHTML();
  document.body.appendChild(overlay);

  requestAnimationFrame(() => overlay.classList.add('visible'));
  _bindEvents(overlay);
  _showStep(0);
}

// ─── Steps data ───────────────────────────────────────────────────────

const STEPS = [
  {
    id: 'overview',
    title: '🔑 Cum obții cheile API gratuit?',
    subtitle: 'Ai nevoie de 2 servicii gratuite pentru a genera videoclipuri.',
    render: _renderOverview,
  },
  {
    id: 'cloudflare',
    title: '☁️ Cloudflare Workers AI',
    subtitle: 'Generează textele AI ale videoclipurilor — gratuit, fără card.',
    render: _renderCloudflare,
  },
  {
    id: 'pexels',
    title: '🎬 Pexels API',
    subtitle: 'Adaugă clipuri video de înaltă calitate — 100% gratuit.',
    render: _renderPexels,
  },
  {
    id: 'done',
    title: '✅ Gata! Poți genera videoclipuri',
    subtitle: 'Pune cheile în sidebar și apasă Generează.',
    render: _renderDone,
  },
];

// ─── HTML Shell ───────────────────────────────────────────────────────

function _buildHTML() {
  return `
    <div class="api-guide-modal" id="api-guide-modal">
      <!-- Close -->
      <button class="api-guide-close" id="api-guide-close" aria-label="Închide">
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>

      <!-- Progress dots -->
      <div class="api-guide-dots" id="api-guide-dots">
        ${STEPS.map((s, i) => `<div class="api-guide-dot" data-step="${i}" id="guide-dot-${i}"></div>`).join('')}
      </div>

      <!-- Dynamic content -->
      <div class="api-guide-content" id="api-guide-content"></div>

      <!-- Navigation -->
      <div class="api-guide-nav">
        <button class="api-guide-btn-back" id="btn-guide-back" style="visibility:hidden;">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"/></svg>
          Înapoi
        </button>
        <button class="api-guide-btn-next" id="btn-guide-next">
          Înainte
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg>
        </button>
      </div>
    </div>
  `;
}

// ─── Step renderers ───────────────────────────────────────────────────

function _renderOverview() {
  return `
    <div class="guide-overview">
      <div class="guide-overview-cards">

        <div class="guide-overview-card" data-goto="1">
          <div class="guide-ov-icon cf-icon">☁️</div>
          <div class="guide-ov-info">
            <div class="guide-ov-name">Cloudflare Workers AI</div>
            <div class="guide-ov-desc">Generare text AI (citate motivaționale)</div>
            <div class="guide-ov-tags">
              <span class="guide-tag free-tag">✅ Gratuit</span>
              <span class="guide-tag">📧 Fără card</span>
              <span class="guide-tag">⚡ ~5 min</span>
            </div>
          </div>
          <div class="guide-ov-arrow">→</div>
        </div>

        <div class="guide-overview-card" data-goto="2">
          <div class="guide-ov-icon pexels-icon">🎬</div>
          <div class="guide-ov-info">
            <div class="guide-ov-name">Pexels API</div>
            <div class="guide-ov-desc">Clipuri video HD fără drepturi de autor</div>
            <div class="guide-ov-tags">
              <span class="guide-tag free-tag">✅ Gratuit</span>
              <span class="guide-tag">📧 Fără card</span>
              <span class="guide-tag">⚡ ~2 min</span>
            </div>
          </div>
          <div class="guide-ov-arrow">→</div>
        </div>

      </div>
      <p class="guide-overview-note">💡 Click pe un serviciu pentru a vedea cum îl configurezi, sau apasă <strong>Înainte</strong> pentru ghidul complet pas cu pas.</p>
    </div>
  `;
}

function _renderCloudflare() {
  return `
    <div class="guide-steps-wrap">

      <div class="guide-step-block">
        <div class="guide-step-num">1</div>
        <div class="guide-step-body">
          <div class="guide-step-title">Creează cont gratuit pe Cloudflare</div>
          <div class="guide-step-desc">Deschide link-ul de mai jos și înregistrează-te cu email-ul tău. Nu este necesar card bancar.</div>
          <a class="guide-link-btn" href="https://dash.cloudflare.com/sign-up" target="_blank" rel="noopener">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
            Deschide dash.cloudflare.com/sign-up
          </a>
        </div>
      </div>

      <div class="guide-step-block">
        <div class="guide-step-num">2</div>
        <div class="guide-step-body">
          <div class="guide-step-title">Găsește Account ID-ul tău</div>
          <div class="guide-step-desc">După login, în bara laterală din stânga click pe <strong>Workers & Pages</strong>. În dreapta paginii vei vedea secțiunea <strong>Account ID</strong> — copiază-l.</div>
          <div class="guide-visual-hint">
            <div class="guide-breadcrumb">
              <span>☁️ Cloudflare Dashboard</span>
              <span class="bc-sep">→</span>
              <span class="bc-active">Workers & Pages</span>
              <span class="bc-sep">→</span>
              <span class="bc-active">Account ID (dreapta)</span>
            </div>
          </div>
          <a class="guide-link-btn" href="https://dash.cloudflare.com/?to=/:account/workers-and-pages" target="_blank" rel="noopener">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
            Deschide Workers &amp; Pages
          </a>
          <div class="guide-paste-hint">
            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 12 20 22 4 22 4 12"/><rect x="2" y="7" width="20" height="5"/><line x1="12" y1="22" x2="12" y2="7"/><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"/><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/></svg>
            Pune-l în câmpul <strong>CF Account ID</strong> din sidebar
          </div>
        </div>
      </div>

      <div class="guide-step-block">
        <div class="guide-step-num">3</div>
        <div class="guide-step-body">
          <div class="guide-step-title">Creează un API Token pentru Workers AI</div>
          <div class="guide-step-desc">Mergi la <strong>My Profile → API Tokens → Create Token</strong>. Selectează template-ul <strong>"Workers AI Read"</strong> sau creează unul cu permisiunea <code>Workers AI — Read</code>.</div>
          <div class="guide-visual-hint">
            <div class="guide-breadcrumb">
              <span>👤 My Profile</span>
              <span class="bc-sep">→</span>
              <span class="bc-active">API Tokens</span>
              <span class="bc-sep">→</span>
              <span class="bc-active">Create Token</span>
              <span class="bc-sep">→</span>
              <span class="bc-active">Workers AI Read</span>
            </div>
          </div>
          <a class="guide-link-btn" href="https://dash.cloudflare.com/profile/api-tokens" target="_blank" rel="noopener">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
            Deschide API Tokens
          </a>
          <div class="guide-paste-hint">
            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 12 20 22 4 22 4 12"/><rect x="2" y="7" width="20" height="5"/><line x1="12" y1="22" x2="12" y2="7"/><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"/><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/></svg>
            Pune token-ul în câmpul <strong>CF API Token</strong> din sidebar
          </div>
        </div>
      </div>

      <div class="guide-free-note">
        🎁 <strong>Planul gratuit Cloudflare</strong> include <strong>10.000 cereri AI/zi</strong> — mai mult decât suficient!
      </div>

    </div>
  `;
}

function _renderPexels() {
  return `
    <div class="guide-steps-wrap">

      <div class="guide-step-block">
        <div class="guide-step-num">1</div>
        <div class="guide-step-body">
          <div class="guide-step-title">Creează cont gratuit pe Pexels</div>
          <div class="guide-step-desc">Deschide link-ul și înregistrează-te cu email-ul (sau contul Google/Facebook). Este complet gratuit și nu necesită card bancar.</div>
          <a class="guide-link-btn pexels-btn" href="https://www.pexels.com/join/" target="_blank" rel="noopener">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
            Deschide pexels.com/join
          </a>
        </div>
      </div>

      <div class="guide-step-block">
        <div class="guide-step-num">2</div>
        <div class="guide-step-body">
          <div class="guide-step-title">Accesează pagina API</div>
          <div class="guide-step-desc">După ce ești logat, mergi la pagina de API Pexels. Vei vedea butonul <strong>"Your API Key"</strong> — click pe el pentru a genera cheia.</div>
          <div class="guide-visual-hint">
            <div class="guide-breadcrumb">
              <span>🎬 Pexels</span>
              <span class="bc-sep">→</span>
              <span class="bc-active">pexels.com/api</span>
              <span class="bc-sep">→</span>
              <span class="bc-active">Your API Key</span>
            </div>
          </div>
          <a class="guide-link-btn pexels-btn" href="https://www.pexels.com/api/new/" target="_blank" rel="noopener">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
            Deschide pexels.com/api/new
          </a>
        </div>
      </div>

      <div class="guide-step-block">
        <div class="guide-step-num">3</div>
        <div class="guide-step-body">
          <div class="guide-step-title">Copiază API Key-ul și pune-l în sidebar</div>
          <div class="guide-step-desc">Completează câmpul cu numele aplicației (ex: <em>ViralClip Studio</em>) și apasă <strong>Generate API Key</strong>. Copiază cheia generată.</div>
          <div class="guide-paste-hint">
            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 12 20 22 4 22 4 12"/><rect x="2" y="7" width="20" height="5"/><line x1="12" y1="22" x2="12" y2="7"/><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"/><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/></svg>
            Pune-o în câmpul <strong>Pexels API Key</strong> din sidebar
          </div>
        </div>
      </div>

      <div class="guide-free-note pexels-note">
        🎁 <strong>Planul gratuit Pexels</strong> permite <strong>200 cereri/oră</strong> și <strong>20.000/lună</strong> — complet gratuit!
      </div>

    </div>
  `;
}

function _renderDone() {
  return `
    <div class="guide-done-wrap">
      <div class="guide-done-icon">🚀</div>
      <h3 class="guide-done-title">Ești pregătit!</h3>
      <p class="guide-done-desc">Pune cheile obținute în secțiunea <strong>Setări API</strong> din sidebar-ul din stânga și apasă butonul <strong>Generează 1 Video</strong>.</p>

      <div class="guide-done-checklist">
        <div class="guide-done-item">
          <span class="guide-done-check">☁️</span>
          <div>
            <strong>CF Account ID</strong>
            <span class="guide-done-where">→ sidebar → câmpul CF Account ID</span>
          </div>
        </div>
        <div class="guide-done-item">
          <span class="guide-done-check">🔑</span>
          <div>
            <strong>CF API Token</strong>
            <span class="guide-done-where">→ sidebar → câmpul CF API Token</span>
          </div>
        </div>
        <div class="guide-done-item">
          <span class="guide-done-check">🎬</span>
          <div>
            <strong>Pexels API Key</strong>
            <span class="guide-done-where">→ sidebar → câmpul Pexels API Key</span>
          </div>
        </div>
      </div>

      <button class="guide-done-btn" id="btn-guide-done">
        <span>✨ Am înțeles, închidem</span>
      </button>
    </div>
  `;
}

// ─── Step navigation ──────────────────────────────────────────────────

function _showStep(idx) {
  _currentStep = idx;
  const step    = STEPS[idx];
  const content = document.getElementById('api-guide-content');
  const dots    = document.querySelectorAll('.api-guide-dot');
  const btnBack = document.getElementById('btn-guide-back');
  const btnNext = document.getElementById('btn-guide-next');

  // Animate out
  if (content) {
    content.style.opacity = '0';
    content.style.transform = 'translateX(20px)';
    setTimeout(() => {
      content.innerHTML = step.render();
      content.style.transition = 'opacity 0.25s ease, transform 0.25s ease';
      content.style.opacity = '1';
      content.style.transform = 'translateX(0)';

      // Bind inner events
      _bindStepEvents(content, idx);
    }, 150);
  }

  // Dots
  dots.forEach((d, i) => d.classList.toggle('active', i === idx));

  // Back button
  if (btnBack) btnBack.style.visibility = idx === 0 ? 'hidden' : 'visible';

  // Next button
  if (btnNext) {
    const isLast = idx === STEPS.length - 1;
    btnNext.style.display = isLast ? 'none' : 'flex';
    btnNext.textContent = '';
    if (!isLast) {
      btnNext.innerHTML = `Înainte <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg>`;
    }
  }
}

function _bindStepEvents(content, idx) {
  // Overview card shortcuts
  content.querySelectorAll('[data-goto]').forEach(card => {
    card.addEventListener('click', () => _showStep(parseInt(card.dataset.goto)));
  });

  // Done button
  content.querySelector('#btn-guide-done')?.addEventListener('click', _dismiss);
}

// ─── Events ──────────────────────────────────────────────────────────

function _bindEvents(overlay) {
  document.getElementById('api-guide-close').addEventListener('click', _dismiss);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) _dismiss(); });

  document.getElementById('btn-guide-next').addEventListener('click', () => {
    if (_currentStep < STEPS.length - 1) _showStep(_currentStep + 1);
  });

  document.getElementById('btn-guide-back').addEventListener('click', () => {
    if (_currentStep > 0) _showStep(_currentStep - 1);
  });

  // Dot navigation
  overlay.querySelectorAll('.api-guide-dot').forEach(dot => {
    dot.addEventListener('click', () => _showStep(parseInt(dot.dataset.step)));
  });
}

function _dismiss() {
  const overlay = document.getElementById('api-guide-overlay');
  if (!overlay) return;
  overlay.classList.remove('visible');
  setTimeout(() => overlay.remove(), 300);
}
