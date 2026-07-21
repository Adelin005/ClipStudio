import { showToast } from '../utils/helpers.js';
import { runFullAutoGeneration } from '../services/autoGeneratorService.js';
import { saveVideoToHistory } from '../services/historyDB.js';
import { sendTelegramVideo, sendTelegramMessage, testTelegramConnection } from '../services/telegramService.js';

const AUTO_INTERVAL_MS = 30 * 60 * 1000; // 30 minute

let autoTimerId = null;
let countdownId = null;
let nextAutoAt = null;
let isGenerating = false;

export function renderAutoPanel(container, state, onGoToHistory) {
  const telegramChatId = localStorage.getItem('clipstudio_telegram_chatid') || '';

  container.innerHTML = `
    <div class="step-header">
      <h1 class="step-title">⚡ Auto Mode</h1>
      <p class="step-subtitle">AI generează automat prompturi, texte motivaționale despre bani și exportă videoclipuri luxury la fiecare 30 de minute.</p>
    </div>

    <!-- Status Card -->
    <div class="auto-status-card" id="auto-status-card">
      <div class="auto-status-header">
        <div class="auto-status-indicator" id="auto-indicator">
          <div class="status-dot idle"></div>
          <span id="auto-status-label">Inactiv</span>
        </div>
        <div class="auto-timer-display" id="auto-timer-display" style="display:none;">
          <span class="timer-label">Următor video în</span>
          <span class="timer-value" id="timer-countdown">30:00</span>
        </div>
      </div>

      <!-- Progress -->
      <div class="auto-progress-section" id="auto-progress-section" style="display:none;">
        <div class="progress-bar" style="margin:0;">
          <div class="progress-fill" id="auto-progress-fill" style="width:0%;"></div>
        </div>
        <p class="progress-text" id="auto-progress-text">Se inițializează...</p>
      </div>

      <!-- Log live -->
      <div class="auto-log" id="auto-log" style="display:none;">
        <div class="auto-log-inner" id="auto-log-inner"></div>
      </div>
    </div>

    <!-- Controls -->
    <div class="auto-controls">
      <button class="btn btn-primary btn-lg" id="btn-generate-now" ${!state.pexelsApiKey ? 'disabled title="Adaugă Pexels API Key în sidebar"' : ''}>
        <span id="btn-gen-icon">🚀</span>
        <span id="btn-gen-text">Generează Acum</span>
      </button>
      <button class="btn btn-secondary btn-lg" id="btn-toggle-auto" ${!state.pexelsApiKey ? 'disabled' : ''}>
        <span id="btn-auto-icon">▶</span>
        <span id="btn-auto-text">Pornește Auto (30min)</span>
      </button>
      <button class="btn btn-secondary" id="btn-view-history" style="gap:8px;">
        📚 Vezi Istoric
      </button>
    </div>

    <!-- Nișa info -->
    <div class="auto-niche-info">
      <h3>🎯 Nișă configurată</h3>
      <div class="niche-tags" style="margin-top:12px;justify-content:flex-start;">
        <span class="niche-tag" style="background:rgba(212,175,55,0.15);color:#FFD700;border:1px solid rgba(212,175,55,0.3);">💎 Luxury Lifestyle</span>
        <span class="niche-tag" style="background:rgba(16,185,129,0.15);color:#10b981;border:1px solid rgba(16,185,129,0.3);">💰 Money Motivation</span>
        <span class="niche-tag" style="background:rgba(124,58,237,0.15);color:#a78bfa;border:1px solid rgba(124,58,237,0.3);">📈 Financial Mindset</span>
        <span class="niche-tag" style="background:rgba(245,158,11,0.15);color:#f59e0b;border:1px solid rgba(245,158,11,0.3);">🚗 Success Symbols</span>
      </div>
      <p style="font-size:13px;color:var(--text-muted);margin-top:12px;">
        AI-ul generează automat prompturi și texte motivaționale în română despre bani, investiții și libertate financiară.
        Videoclipurile sunt exportate în format vertical (9:16) gata de TikTok/Reels.
      </p>
    </div>

    <!-- Telegram Settings -->
    <div class="auto-telegram-card">
      <h3>📤 Telegram Bot</h3>
      <p style="font-size:13px;color:var(--text-muted);margin-bottom:16px;">
        Introdu Chat ID-ul tău pentru a primi automat fiecare video pe Telegram.
        <br><small>Obții Chat ID scriind <code style="background:rgba(255,255,255,0.1);padding:2px 6px;border-radius:4px;">/start</code> la <a href="https://t.me/userinfobot" target="_blank" style="color:var(--accent-light);">@userinfobot</a></small>
      </p>
      <div style="display:flex;gap:8px;align-items:center;">
        <input type="text" id="telegram-chat-id" class="form-input" style="flex:1;"
          placeholder="Ex: 123456789 sau @canalul_tau"
          value="${telegramChatId}" />
        <button class="btn btn-secondary" id="btn-test-telegram" style="white-space:nowrap;">
          🔗 Testează
        </button>
      </div>
      <p id="telegram-status" style="font-size:12px;margin-top:8px;color:var(--text-muted);"></p>
    </div>

    ${!state.pexelsApiKey ? `
    <div style="background:rgba(245,158,11,0.1);border:1px solid rgba(245,158,11,0.3);border-radius:12px;padding:16px;margin-top:20px;">
      ⚠️ <strong>Pexels API Key</strong> lipsă. Adaugă-l în sidebar-ul din stânga pentru a putea genera videoclipuri.
    </div>` : ''}
  `;

  // === Event Listeners ===
  const btnGenNow = document.getElementById('btn-generate-now');
  const btnToggleAuto = document.getElementById('btn-toggle-auto');
  const btnViewHistory = document.getElementById('btn-view-history');
  const chatIdInput = document.getElementById('telegram-chat-id');
  const btnTestTelegram = document.getElementById('btn-test-telegram');
  const telegramStatus = document.getElementById('telegram-status');

  chatIdInput.addEventListener('input', e => {
    localStorage.setItem('clipstudio_telegram_chatid', e.target.value.trim());
  });

  btnTestTelegram.addEventListener('click', async () => {
    const chatId = chatIdInput.value.trim();
    if (!chatId) { telegramStatus.textContent = '❌ Introdu mai întâi Chat ID-ul.'; return; }
    btnTestTelegram.disabled = true;
    btnTestTelegram.textContent = '⏳...';
    telegramStatus.textContent = 'Se testează conexiunea...';
    try {
      await testTelegramConnection(chatId);
      telegramStatus.style.color = 'var(--success)';
      telegramStatus.textContent = '✅ Conexiune reușită! Verifică Telegramul.';
    } catch (e) {
      telegramStatus.style.color = 'var(--danger)';
      telegramStatus.textContent = '❌ Eroare: ' + e.message;
    }
    btnTestTelegram.disabled = false;
    btnTestTelegram.textContent = '🔗 Testează';
  });

  btnViewHistory.addEventListener('click', onGoToHistory);

  btnGenNow.addEventListener('click', () => {
    generateOneVideo(state);
  });

  btnToggleAuto.addEventListener('click', () => {
    if (autoTimerId) {
      stopAutoTimer();
    } else {
      startAutoTimer(state);
    }
  });

  // Restorăm starea timer-ului dacă era activ
  if (autoTimerId && nextAutoAt) {
    updateTimerUI(true);
  }
}

// === Generare Video ===
async function generateOneVideo(state) {
  if (isGenerating) { showToast('Deja se generează un video...', 'error'); return; }
  isGenerating = true;

  updateGenerateBtn(true);
  showProgressSection(true);
  addLog('🚀 Pornire generare automată...');

  try {
    const result = await runFullAutoGeneration({
      groqApiKey: state.groqApiKey,
      pexelsApiKey: state.pexelsApiKey,
      onProgress: (msg, pct) => {
        updateProgress(msg, pct);
        addLog(msg);
      }
    });

    addLog('✅ Video generat cu succes!');
    updateProgress('✅ Salvare în istoric...', 95);

    // Salvare în IndexedDB
    const id = Date.now().toString();
    await saveVideoToHistory({
      id,
      blob: result.blob,
      prompt: result.prompt,
      scenesCount: result.scenes.length,
      size: result.blob.size,
      createdAt: Date.now(),
    });

    updateProgress('✅ Gata! Video salvat în istoric.', 100);
    addLog(`💾 Salvat în istoric (${(result.blob.size / 1048576).toFixed(1)} MB)`);

    // Telegram
    const chatId = localStorage.getItem('clipstudio_telegram_chatid') || '';
    if (chatId) {
      addLog('📤 Se trimite pe Telegram...');
      try {
        const caption = `🎬 <b>Video nou generat!</b>\n\n💡 Prompt: ${result.prompt}\n📦 Dimensiune: ${(result.blob.size / 1048576).toFixed(1)} MB\n💰 Texte: money motivation`;
        await sendTelegramVideo(chatId, result.blob, caption);
        addLog('✅ Trimis pe Telegram!');
        showToast('Video trimis pe Telegram! 📤', 'success');
      } catch (telErr) {
        addLog('⚠️ Telegram: ' + telErr.message);
        showToast('Video generat! (Telegram: ' + telErr.message + ')', 'error');
      }
    } else {
      showToast('Video generat și salvat în istoric! 🎉', 'success');
    }

  } catch (e) {
    console.error('[AutoGen] Eroare:', e);
    addLog('❌ Eroare: ' + e.message);
    updateProgress('❌ ' + e.message, 0);
    showToast('Eroare generare: ' + e.message, 'error');
  }

  isGenerating = false;
  updateGenerateBtn(false);
  setTimeout(() => showProgressSection(false), 4000);
}

// === Timer ===
function startAutoTimer(state) {
  nextAutoAt = Date.now() + AUTO_INTERVAL_MS;
  autoTimerId = setInterval(() => {
    generateOneVideo(state);
    nextAutoAt = Date.now() + AUTO_INTERVAL_MS;
  }, AUTO_INTERVAL_MS);

  // Countdown
  countdownId = setInterval(updateCountdown, 1000);
  updateTimerUI(true);
  showToast('⏱️ Auto Mode pornit! Fiecare 30 min se generează un video.', 'success');
}

function stopAutoTimer() {
  if (autoTimerId) { clearInterval(autoTimerId); autoTimerId = null; }
  if (countdownId) { clearInterval(countdownId); countdownId = null; }
  nextAutoAt = null;
  updateTimerUI(false);
  showToast('Auto Mode oprit.', 'success');
}

function updateCountdown() {
  if (!nextAutoAt) return;
  const timerEl = document.getElementById('timer-countdown');
  if (!timerEl) return;
  const remaining = Math.max(0, nextAutoAt - Date.now());
  const m = Math.floor(remaining / 60000);
  const s = Math.floor((remaining % 60000) / 1000);
  timerEl.textContent = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function updateTimerUI(active) {
  const timerDisplay = document.getElementById('auto-timer-display');
  const dot = document.querySelector('.status-dot');
  const label = document.getElementById('auto-status-label');
  const btnAutoIcon = document.getElementById('btn-auto-icon');
  const btnAutoText = document.getElementById('btn-auto-text');

  if (!dot) return;

  if (active) {
    if (timerDisplay) timerDisplay.style.display = 'flex';
    dot.className = 'status-dot active';
    if (label) label.textContent = 'Auto activ';
    if (btnAutoIcon) btnAutoIcon.textContent = '⏹';
    if (btnAutoText) btnAutoText.textContent = 'Oprește Auto';
    updateCountdown();
  } else {
    if (timerDisplay) timerDisplay.style.display = 'none';
    dot.className = 'status-dot idle';
    if (label) label.textContent = 'Inactiv';
    if (btnAutoIcon) btnAutoIcon.textContent = '▶';
    if (btnAutoText) btnAutoText.textContent = 'Pornește Auto (30min)';
  }
}

// === UI Helpers ===
function updateGenerateBtn(loading) {
  const icon = document.getElementById('btn-gen-icon');
  const text = document.getElementById('btn-gen-text');
  const btn = document.getElementById('btn-generate-now');
  if (!btn) return;
  btn.disabled = loading;
  if (icon) icon.textContent = loading ? '⏳' : '🚀';
  if (text) text.textContent = loading ? 'Se generează...' : 'Generează Acum';
}

function showProgressSection(show) {
  const el = document.getElementById('auto-progress-section');
  const logEl = document.getElementById('auto-log');
  if (el) el.style.display = show ? 'block' : 'none';
  if (logEl) logEl.style.display = show ? 'block' : 'none';
  if (!show) {
    const fill = document.getElementById('auto-progress-fill');
    if (fill) fill.style.width = '0%';
    const logInner = document.getElementById('auto-log-inner');
    if (logInner) logInner.innerHTML = '';
  }
}

function updateProgress(msg, pct) {
  const fill = document.getElementById('auto-progress-fill');
  const text = document.getElementById('auto-progress-text');
  if (fill) fill.style.width = `${Math.max(0, Math.min(100, pct))}%`;
  if (text) text.textContent = msg;
}

function addLog(msg) {
  const inner = document.getElementById('auto-log-inner');
  if (!inner) return;
  const line = document.createElement('div');
  line.className = 'auto-log-line';
  const time = new Date().toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  line.innerHTML = `<span class="log-time">${time}</span> ${msg}`;
  inner.appendChild(line);
  inner.scrollTop = inner.scrollHeight;
}
