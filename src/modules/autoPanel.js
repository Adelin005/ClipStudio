import { showToast } from '../utils/helpers.js';
import { runFullAutoGeneration } from '../services/autoGeneratorService.js';
import { saveVideoToHistory } from '../services/historyDB.js';
import { getCurrentUser, getCurrentPlan, getDailyStatus, incrementDailyCount } from '../services/authService.js';
import { showPricingModal } from './pricingModal.js';

// ─── Persistent module-level state (survives navigation) ──────────────────────
let isGenerating = false;
let autoLoopActive = false;
let generationCount = 0;
let targetCount = 1;
let selectedQty = 1;

// Persistent log buffer — survives navigation away and back
const LOG_MAX = 150;
let logBuffer = []; // { time: string, msg: string }[]

// Persistent progress state
let lastProgress = { msg: '', pct: 0 };
let lastBatchVisible = false;

// Bound state reference — updated each time renderAutoPanel is called
let _state = null;

// ─── Entry point ──────────────────────────────────────────────────────────────

export function renderAutoPanel(container, state, onGoToHistory) {
  _state = state;

  const plan      = getCurrentPlan();
  const isPro     = plan.id === 'pro';
  const dailyStatus = getDailyStatus();
  const isRunning = autoLoopActive;
  const totalLabel = targetCount === Infinity ? '∞' : targetCount;

  // Pro users default qty to 10 if still at 1
  if (isPro && selectedQty === 1 && !autoLoopActive) {
    selectedQty = 10;
    targetCount = 10;
  }

  container.innerHTML = `
    <div class="step-header">
      <h1 class="step-title">⚡ Auto Generate</h1>
      <p class="step-subtitle">Generează videoclipuri virale cu AI. Fiecare video e descărcat automat pe device-ul tău.</p>
    </div>

    <!-- Daily Limit Banner -->
    ${_renderDailyBanner(plan, dailyStatus)}

    <!-- Main Auto Controls Card -->
    <div class="premium-card auto-main-card" id="auto-main-card" style="margin-bottom: 24px;">
      <!-- Status row -->
      <div class="auto-status-row" id="auto-status-row">
        <div class="auto-status-indicator" id="auto-indicator">
          <div class="status-dot ${isRunning ? 'active' : 'idle'}" id="status-dot"></div>
          <span id="auto-status-label" style="font-weight:600;">${isRunning ? `Generare activă (${generationCount}/${totalLabel})` : 'Inactiv'}</span>
        </div>
        <div class="auto-counter" id="auto-counter" style="display:${isRunning ? 'flex' : 'none'};">
          <span class="counter-icon">🎬</span>
          <span id="counter-value" style="font-weight:700; color:var(--primary);">${generationCount}</span>
          <span id="counter-of" class="counter-label">/ ${totalLabel} generate</span>
        </div>
      </div>

      <!-- Global batch progress bar -->
      <div id="batch-progress-wrap" style="display:${lastBatchVisible ? 'block' : 'none'}; margin-top:24px;">
        <div class="batch-progress-header" style="display:flex; justify-content:space-between; margin-bottom:8px;">
          <span id="batch-progress-label" style="font-size:14px; font-weight:600; color:var(--text-secondary);">Video ${generationCount} / ${totalLabel}</span>
          <span id="batch-progress-pct" style="font-size:14px; font-weight:700; color:var(--primary);">${targetCount !== Infinity && targetCount > 0 ? Math.round((generationCount / targetCount) * 100) + '%' : ''}</span>
        </div>
        <div class="progress-bar-container">
          <div class="progress-fill batch-fill" id="batch-fill" style="width:${targetCount !== Infinity && targetCount > 0 ? Math.min(100, Math.round((generationCount / targetCount) * 100)) : 100}%;"></div>
        </div>
      </div>

      <!-- Per-video Progress Section -->
      <div class="auto-progress-section" id="auto-progress-section" style="display:${isRunning ? 'block' : 'none'}; margin-top: 24px; padding-top: 24px; border-top: 1px solid var(--border-color);">
        <div class="progress-bar-container" style="margin:0 0 12px 0;">
          <div class="progress-fill" id="auto-progress-fill" style="width:${lastProgress.pct}%; background: linear-gradient(90deg, #ec4899, #8b5cf6);"></div>
        </div>
        <p class="progress-text" id="auto-progress-text" style="font-size:13px; color:var(--text-secondary); text-align:center;">${lastProgress.msg || 'Se inițializează...'}</p>
      </div>

      <!-- Live Log -->
      <div class="auto-log" id="auto-log" style="display:${isRunning || logBuffer.length > 0 ? 'block' : 'none'}; margin-top: 24px;">
        <div class="auto-log-inner" id="auto-log-inner"></div>
      </div>
    </div>

    ${isPro ? _renderProQtySelector() : ''}

    <!-- Action Buttons -->
    <div class="auto-controls" style="display:flex; flex-direction:column; gap:16px;">
      ${isPro ? _renderProAutoGenBtn(isRunning) : ''}

      <div style="display:flex; gap:16px;">
        <button class="btn btn-primary btn-lg" id="btn-generate-once"
          ${(!state.pexelsApiKey || isRunning || !dailyStatus.canGenerate) ? 'disabled' : ''}
          style="flex:1;">
          <span id="btn-once-icon">🚀</span>
          <span id="btn-once-text">Generează 1 Video</span>
        </button>

        <button class="btn btn-secondary btn-lg" id="btn-view-history" style="flex:1;">
          📚 Istoric
        </button>
      </div>

      ${!isPro ? _renderUpgradeBanner(plan) : ''}
    </div>

    <!-- Info card -->
    <div class="premium-card auto-niche-info" style="margin-top: 32px; background: rgba(0,0,0,0.2);">
      <h3 class="section-title">🤖 Cum funcționează?</h3>
      <ol class="auto-how-list" style="margin-top: 16px; padding-left: 20px; color: var(--text-secondary); font-size: 14px; line-height: 1.8;">
        <li>${isPro ? 'Alege câte videoclipuri vrei (sau ∞ non-stop)' : 'Apasă butonul de generare'}</li>
        <li>${isPro ? 'Pornește Auto-Generate sau generează 1 video' : 'AI generează un videoclip unic automat'}</li>
        <li>AI generează automat citate unice motivaționale + clipuri luxury</li>
        <li>Fiecare video e <strong>descărcat automat</strong> pe device-ul tău</li>
        ${isPro ? '<li>La final se oprește singur (sau apasă <strong>Stop</strong> oricând)</li>' : ''}
      </ol>
      <div class="niche-tags" style="margin-top:20px; display:flex; flex-wrap:wrap; gap:10px;">
        <span class="niche-tag" style="background:rgba(212,175,55,0.15);color:#FFD700;border:1px solid rgba(212,175,55,0.3); padding:6px 12px; border-radius:100px; font-size:12px; font-weight:600;">💎 Luxury Lifestyle</span>
        <span class="niche-tag" style="background:rgba(16,185,129,0.15);color:#10b981;border:1px solid rgba(16,185,129,0.3); padding:6px 12px; border-radius:100px; font-size:12px; font-weight:600;">💰 Money Motivation</span>
        <span class="niche-tag" style="background:rgba(124,58,237,0.15);color:#a78bfa;border:1px solid rgba(124,58,237,0.3); padding:6px 12px; border-radius:100px; font-size:12px; font-weight:600;">📈 Financial Mindset</span>
      </div>
    </div>

    ${!state.pexelsApiKey ? `
    <div style="background:rgba(245,158,11,0.1);border:1px solid rgba(245,158,11,0.3);border-radius:var(--radius-md);padding:16px;margin-top:24px;color:#fcd34d;">
      ⚠️ <strong>Pexels API Key</strong> lipsă. Adaugă-l în sidebar-ul din stânga pentru a putea genera videoclipuri.
    </div>` : ''}
  `;

  // Restore log buffer into DOM
  _restoreLog();

  // Update hint for current selected qty (Pro only)
  if (isPro) updateQtyHint(selectedQty);

  // Lock qty selector if running
  if (isRunning) setQtyLocked(true);

  // ── Pro Quantity selector events ──
  if (isPro) {
    document.querySelectorAll('.qty-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        if (autoLoopActive) return;
        document.querySelectorAll('.qty-btn').forEach(b => b.classList.remove('qty-btn-active'));
        btn.classList.add('qty-btn-active');
        const raw = btn.dataset.qty;
        selectedQty = raw === 'inf' ? Infinity : parseInt(raw);
        targetCount = selectedQty;
        updateQtyHint(selectedQty);
      });
    });
  }

  // ── Button events ──
  document.getElementById('btn-view-history').addEventListener('click', onGoToHistory);

  document.getElementById('btn-generate-once').addEventListener('click', () => {
    const status = getDailyStatus();
    if (!status.canGenerate) {
      _showLimitModal(getCurrentPlan());
      return;
    }
    if (!autoLoopActive) {
      targetCount = 1;
      startAutoLoop(1);
    }
  });

  if (isPro) {
    document.getElementById('btn-autogen')?.addEventListener('click', () => {
      if (autoLoopActive) {
        stopAutoLoop('manual');
      } else {
        targetCount = selectedQty;
        startAutoLoop(selectedQty);
      }
    });
  }
}

// ─── Sub-render helpers ───────────────────────────────────────────────────────

function _renderDailyBanner(plan, status) {
  if (plan.dailyLimit === Infinity) return ''; // Pro — no limit banner

  const color     = status.canGenerate ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)';
  const border    = status.canGenerate ? 'rgba(16,185,129,0.3)'  : 'rgba(239,68,68,0.3)';
  const textColor = status.canGenerate ? '#10b981'               : '#ef4444';
  const icon      = status.canGenerate ? '📊' : '🚫';
  const limitText = status.canGenerate
    ? `Ai generat <strong>${status.count}/${status.limit}</strong> video${status.limit > 1 ? 'uri' : ''} astăzi. Mai poți genera <strong>${status.remaining}</strong>.`
    : `Ai atins limita zilnică de <strong>${status.limit}</strong> video${status.limit > 1 ? 'uri' : ''}. Revino mâine sau <strong>upgrade</strong> planul.`;

  return `
    <div class="daily-limit-banner" style="background:${color};border:1px solid ${border};border-radius:var(--radius-md);padding:14px 20px;margin-bottom:24px;display:flex;align-items:center;justify-content:space-between;gap:12px;">
      <div style="display:flex;align-items:center;gap:12px;">
        <span style="font-size:20px;">${icon}</span>
        <span style="font-size:14px;color:${textColor};">${limitText}</span>
      </div>
      ${!status.canGenerate ? `<button class="btn-upgrade-inline" id="btn-upgrade-inline" style="white-space:nowrap;">👑 Upgrade</button>` : ''}
    </div>
  `;
}

function _renderProQtySelector() {
  return `
    <!-- Pro Quantity Selector -->
    <div class="premium-card qty-selector-card pro-qty-card" id="qty-selector-card" style="margin-bottom: 24px;">
      <h3 class="section-title">📦 Câte videoclipuri generezi?</h3>
      <div class="qty-options pro-qty-options">
        <button class="qty-btn pro-qty-btn${selectedQty === 1   ? ' qty-btn-active' : ''}" data-qty="1"   id="qty-1">
          <span class="qty-num">1</span><span class="qty-label">video</span>
        </button>
        <button class="qty-btn pro-qty-btn${selectedQty === 3   ? ' qty-btn-active' : ''}" data-qty="3"   id="qty-3">
          <span class="qty-num">3</span><span class="qty-label">video</span>
        </button>
        <button class="qty-btn pro-qty-btn${selectedQty === 5   ? ' qty-btn-active' : ''}" data-qty="5"   id="qty-5">
          <span class="qty-num">5</span><span class="qty-label">video</span>
        </button>
        <button class="qty-btn pro-qty-btn${selectedQty === 10  ? ' qty-btn-active' : ''}" data-qty="10"  id="qty-10">
          <span class="qty-num">10</span><span class="qty-label">video</span>
        </button>
        <button class="qty-btn pro-qty-btn pro-qty-inf${selectedQty === Infinity ? ' qty-btn-active' : ''}" data-qty="inf" id="qty-inf">
          <span class="qty-num">∞</span><span class="qty-label">non-stop</span>
        </button>
      </div>
      <p class="qty-hint" id="qty-hint" style="margin-top: 16px; font-size: 14px; color: var(--text-secondary); text-align: center;"></p>
    </div>
  `;
}

function _renderProAutoGenBtn(isRunning) {
  return `
    <button class="btn-autogen pro-autogen-btn${isRunning ? ' running' : ''}" id="btn-autogen"
      ${!_state?.pexelsApiKey ? 'disabled title="Adaugă Pexels API Key în sidebar"' : ''}
      style="width:100%; padding: 20px; font-size: 18px;">
      <span class="btn-autogen-glow"></span>
      <div class="pro-autogen-inner">
        <span class="pro-autogen-label">Auto-Generate</span>
        <div class="pro-autogen-toggle ${isRunning ? 'on' : 'off'}" id="pro-autogen-toggle">
          <span class="pro-toggle-dot"></span>
        </div>
        <span class="pro-autogen-status" id="pro-autogen-status">${isRunning ? '● ON' : '○ OFF'}</span>
      </div>
    </button>
  `;
}

function _renderUpgradeBanner(plan) {
  const isPaid = plan.id !== 'free';
  const msg = isPaid
    ? `⚡ Planul <strong>Basic</strong>: ${plan.dailyLimit} video/zi. Upgrade la <strong>Pro</strong> pentru generări infinite + Auto-Generate.`
    : `🆓 Planul <strong>Free</strong>: 1 video/zi. Upgrade pentru mai multe generări și Auto-Generate.`;

  return `
    <div class="upgrade-banner" id="upgrade-banner-inline">
      <span>${msg}</span>
      <button class="upgrade-banner-btn" id="btn-upgrade-banner">👑 Upgrade</button>
    </div>
  `;
}

function _showLimitModal(plan) {
  showPricingModal(() => {
    // After upgrade, re-render the panel
    renderAutoPanel(
      document.querySelector('.step-panel.active'),
      _state,
      () => {}
    );
  });
  showToast(`🚫 Limita zilnică de ${plan.dailyLimit} video${plan.dailyLimit > 1 ? 'uri' : ''} atinsă. Upgrade planul!`, 'error');
}

// ─── Event delegation for dynamic buttons ────────────────────────────────────

document.addEventListener('click', (e) => {
  if (e.target.closest('#btn-upgrade-inline') || e.target.closest('#btn-upgrade-banner')) {
    showPricingModal((planId) => {
      const panel = document.querySelector('.step-panel.active');
      if (panel) renderAutoPanel(panel, _state, () => {});
      // update sidebar badge
      const event = new CustomEvent('plan-changed', { detail: { planId } });
      document.dispatchEvent(event);
    });
  }
});

// ─── Restore log from buffer into DOM ────────────────────────────────────────

function _restoreLog() {
  const inner = document.getElementById('auto-log-inner');
  if (!inner) return;
  inner.innerHTML = '';
  logBuffer.forEach(({ time, msg }) => {
    const line = document.createElement('div');
    line.className = 'auto-log-line';
    line.innerHTML = `<span class="log-time">${time}</span> ${msg}`;
    inner.appendChild(line);
  });
  inner.scrollTop = inner.scrollHeight;
}

// ─── Qty hint ────────────────────────────────────────────────────────────────

function updateQtyHint(qty) {
  const hint = document.getElementById('qty-hint');
  if (!hint) return;
  if (qty === Infinity) {
    hint.innerHTML = 'Va genera videoclipuri <strong>non-stop</strong> și le va descărca automat până apeși Stop.';
  } else {
    hint.innerHTML = `Va genera <strong>${qty} videoclip${qty > 1 ? 'uri' : ''}</strong>, le va descărca automat și se va opri singur.`;
  }
}

// ─── Auto Loop ───────────────────────────────────────────────────────────────

async function startAutoLoop(qty) {
  autoLoopActive = true;
  generationCount = 0;
  lastBatchVisible = qty !== Infinity;

  updateAutoGenBtn(true);
  updateStatusUI(true, qty);
  updateCounterUI(0, qty);
  showBatchProgress(qty !== Infinity, 0, qty);
  setQtyLocked(true);

  const qtyLabel = qty === Infinity ? 'non-stop' : `${qty} videoclipuri`;
  showToast(`🤖 Auto-Generate pornit! Se generează ${qtyLabel}.`, 'success');
  addLog(`🟢 Auto-Generate activat. Target: ${qtyLabel}`);

  while (autoLoopActive) {
    if (generationCount >= qty) {
      stopAutoLoop('done');
      break;
    }

    await generateOneVideo(true, qty);

    if (autoLoopActive && generationCount < qty) {
      addLog('⏳ Se pregătește următorul video...');
      await sleep(600);
    }
  }
}

function stopAutoLoop(reason) {
  autoLoopActive = false;
  lastBatchVisible = false;
  setQtyLocked(false);
  updateAutoGenBtn(false);
  updateStatusUI(false);

  const once = document.getElementById('btn-generate-once');
  if (once && _state?.pexelsApiKey) once.disabled = false;

  if (reason === 'done') {
    const n = generationCount;
    const msg = `✅ Gata! ${n} videoclip${n !== 1 ? 'uri' : ''} generat${n !== 1 ? 'e' : ''} și descărcat${n !== 1 ? 'e' : ''}!`;
    showToast(msg, 'success');
    addLog(`🏁 ${msg}`);
    setTimeout(() => {
      showProgressSection(false);
      showBatchProgress(false);
      lastBatchVisible = false;
    }, 5000);
  } else {
    showToast('⏹ Auto-Generate oprit.', 'success');
    addLog('🔴 Oprit de utilizator.');
    setTimeout(() => {
      showProgressSection(false);
      showBatchProgress(false);
    }, 3000);
  }
}

// ─── Single video generation ─────────────────────────────────────────────────

async function generateOneVideo(isLoop, totalTarget) {
  if (isGenerating && !isLoop) {
    showToast('Deja se generează un video...', 'error');
    return;
  }

  // Daily limit check (only for non-Pro)
  const plan = getCurrentPlan();
  if (plan.dailyLimit !== Infinity) {
    const status = getDailyStatus();
    if (!status.canGenerate) {
      _showLimitModal(plan);
      if (isLoop) stopAutoLoop('manual');
      return;
    }
  }

  isGenerating = true;

  if (!isLoop) updateGenerateOnceBtn(true);
  showProgressSection(true);

  const videoNum = generationCount + 1;
  const targetLabel = totalTarget === Infinity ? '∞' : totalTarget;
  addLog(`🚀 Generare video #${videoNum}${isLoop ? ` din ${targetLabel}` : ''}...`);

  try {
    const result = await runFullAutoGeneration({
      cfAccountId: _state.cfAccountId,
      cfApiToken:  _state.cfApiToken,
      pexelsApiKey: _state.pexelsApiKey,
      onProgress: (msg, pct) => {
        lastProgress = { msg, pct };
        updateProgress(msg, pct);
      }
    });

    lastProgress = { msg: '💾 Se salvează și descarcă...', pct: 95 };
    updateProgress(lastProgress.msg, lastProgress.pct);

    // Save to IndexedDB
    const id = Date.now().toString();
    await saveVideoToHistory({
      id,
      blob: result.blob,
      prompt: result.prompt,
      scenesCount: result.scenes.length,
      size: result.blob.size,
      createdAt: Date.now(),
    });

    // Auto-download
    const ext = result.blob.type.includes('mp4') ? 'mp4' : 'webm';
    autoDownloadBlob(result.blob, `viralclip_${String(videoNum).padStart(3, '0')}_${id}.${ext}`);

    // Increment daily counter
    incrementDailyCount();

    generationCount++;
    updateCounterUI(generationCount, totalTarget);
    updateBatchFill(generationCount, totalTarget);

    const sizeMB = (result.blob.size / 1048576).toFixed(1);
    addLog(`✅ Video #${generationCount} descărcat (${sizeMB} MB) — "${result.prompt.substring(0, 55)}..."`);

    lastProgress = { msg: `✅ Video #${generationCount} descărcat!`, pct: 100 };
    updateProgress(lastProgress.msg, lastProgress.pct);

    if (!isLoop) showToast('Video generat și descărcat! 🎉', 'success');

    // Refresh daily banner (non-Pro)
    const plan = getCurrentPlan();
    if (plan.dailyLimit !== Infinity) {
      const status = getDailyStatus();
      const bannerEl = document.querySelector('.daily-limit-banner');
      if (bannerEl) {
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = _renderDailyBanner(plan, status);
        bannerEl.replaceWith(tempDiv.firstElementChild);
      }

      // Disable generate-once if limit reached
      if (!status.canGenerate) {
        const once = document.getElementById('btn-generate-once');
        if (once) once.disabled = true;
      }
    }

  } catch (e) {
    console.error('[AutoGen] Eroare:', e);
    addLog('❌ Eroare: ' + e.message);
    lastProgress = { msg: '❌ ' + e.message, pct: 0 };
    updateProgress(lastProgress.msg, lastProgress.pct);
    if (!isLoop) showToast('Eroare: ' + e.message, 'error');
    if (isLoop) await sleep(2000);
  }

  isGenerating = false;
  if (!isLoop) {
    updateGenerateOnceBtn(false);
    setTimeout(() => {
      showProgressSection(false);
      lastProgress = { msg: '', pct: 0 };
    }, 4000);
  }
}

// ─── Auto-Download ────────────────────────────────────────────────────────────

function autoDownloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

// ─── UI Helpers ──────────────────────────────────────────────────────────────

function updateAutoGenBtn(active) {
  const btn    = document.getElementById('btn-autogen');
  const toggle = document.getElementById('pro-autogen-toggle');
  const status = document.getElementById('pro-autogen-status');
  if (!btn) return;
  if (active) {
    btn.classList.add('running');
    if (toggle) { toggle.classList.remove('off'); toggle.classList.add('on'); }
    if (status) status.textContent = '● ON';
  } else {
    btn.classList.remove('running');
    if (toggle) { toggle.classList.remove('on'); toggle.classList.add('off'); }
    if (status) status.textContent = '○ OFF';
  }
}

function updateStatusUI(active, qty) {
  const dot     = document.getElementById('status-dot');
  const label   = document.getElementById('auto-status-label');
  const counter = document.getElementById('auto-counter');
  if (!dot) return;
  if (active) {
    dot.className = 'status-dot active';
    const qtyLabel = qty === Infinity ? '∞' : qty;
    if (label)   label.textContent = `Generare activă (0/${qtyLabel})`;
    if (counter) counter.style.display = 'flex';
  } else {
    dot.className = 'status-dot idle';
    if (label)   label.textContent = 'Inactiv';
    if (counter) counter.style.display = 'none';
  }
}

function updateCounterUI(current, total) {
  const val   = document.getElementById('counter-value');
  const of    = document.getElementById('counter-of');
  const label = document.getElementById('auto-status-label');
  const totalLabel = total === Infinity ? '∞' : total;
  if (val)   val.textContent = current;
  if (of)    of.textContent = `/ ${totalLabel} generate`;
  if (label && autoLoopActive) label.textContent = `Generare activă (${current}/${totalLabel})`;
}

function showBatchProgress(show, current = 0, total = 10) {
  const wrap = document.getElementById('batch-progress-wrap');
  if (!wrap) return;
  wrap.style.display = show ? 'block' : 'none';
  if (show) updateBatchFill(current, total);
}

function updateBatchFill(current, total) {
  const fill  = document.getElementById('batch-fill');
  const label = document.getElementById('batch-progress-label');
  const pct   = document.getElementById('batch-progress-pct');
  if (total === Infinity || total === 0) {
    if (fill)  fill.style.width = '100%';
    if (label) label.textContent = `Video ${current} / ∞`;
    if (pct)   pct.textContent = '';
    return;
  }
  const percent = Math.min(100, Math.round((current / total) * 100));
  if (fill)  fill.style.width = `${percent}%`;
  if (label) label.textContent = `Video ${current} / ${total}`;
  if (pct)   pct.textContent = `${percent}%`;
}

function setQtyLocked(locked) {
  document.querySelectorAll('.qty-btn').forEach(btn => {
    btn.disabled = locked;
    btn.style.opacity = locked ? '0.4' : '';
    btn.style.cursor  = locked ? 'not-allowed' : '';
  });
  const once = document.getElementById('btn-generate-once');
  if (once) once.disabled = locked;
}

function updateGenerateOnceBtn(loading) {
  const icon = document.getElementById('btn-once-icon');
  const text = document.getElementById('btn-once-text');
  const btn  = document.getElementById('btn-generate-once');
  if (!btn) return;
  btn.disabled = loading;
  if (icon) icon.textContent = loading ? '⏳' : '🚀';
  if (text) text.textContent = loading ? 'Se generează...' : 'Generează 1 Video';
}

function showProgressSection(show) {
  const el    = document.getElementById('auto-progress-section');
  const logEl = document.getElementById('auto-log');
  if (el)    el.style.display = show ? 'block' : 'none';
  if (logEl) logEl.style.display = (show || logBuffer.length > 0) ? 'block' : 'none';
  if (!show) {
    const fill = document.getElementById('auto-progress-fill');
    if (fill) fill.style.width = '0%';
  }
}

function updateProgress(msg, pct) {
  const fill = document.getElementById('auto-progress-fill');
  const text = document.getElementById('auto-progress-text');
  if (fill) fill.style.width = `${Math.max(0, Math.min(100, pct))}%`;
  if (text) text.textContent = msg;
}

function addLog(msg) {
  const time = new Date().toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  logBuffer.push({ time, msg });
  if (logBuffer.length > LOG_MAX) logBuffer.shift();

  const inner = document.getElementById('auto-log-inner');
  if (!inner) return;

  const line = document.createElement('div');
  line.className = 'auto-log-line';
  line.innerHTML = `<span class="log-time">${time}</span> ${msg}`;
  inner.appendChild(line);
  inner.scrollTop = inner.scrollHeight;
  while (inner.children.length > LOG_MAX) inner.removeChild(inner.firstChild);
}

function sleep(ms) {
  return new Promise(res => setTimeout(res, ms));
}
