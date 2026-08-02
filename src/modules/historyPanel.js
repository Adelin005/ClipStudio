import { getAllHistoryVideos, deleteVideoFromHistory, clearHistory } from '../services/historyDB.js';
import { showToast } from '../utils/helpers.js';

export function renderHistoryPanel(container) {
  container.innerHTML = `
    <div class="step-header">
      <h1 class="step-title">📚 Istoric Video</h1>
      <p class="step-subtitle">Toate videoclipurile generate automat. Descarcă sau șterge după nevoie.</p>
    </div>
    <div id="history-toolbar" style="display:flex;gap:12px;align-items:center;margin-bottom:24px;flex-wrap:wrap;">
      <button class="btn btn-outline" id="btn-refresh-history" style="gap:8px; padding: 10px 16px;">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M23 4v6h-6M1 20v-6h6"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
        Reîncarcă
      </button>
      <button class="btn" id="btn-clear-history" style="gap:8px; padding: 10px 16px; color:var(--danger); background:rgba(239,68,68,0.1); border:1px solid rgba(239,68,68,0.3);">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
        Șterge Tot
      </button>
      <span id="history-count" style="font-size:14px;font-weight:600;color:var(--text-secondary);margin-left:auto;"></span>
    </div>
    <div id="history-grid" class="history-video-grid">
      <div class="empty-state">
        <span class="empty-icon">🎬</span>
        <p style="margin-top: 16px;">Se încarcă istoricul...</p>
      </div>
    </div>
  `;

  document.getElementById('btn-refresh-history').addEventListener('click', () => loadHistory());
  document.getElementById('btn-clear-history').addEventListener('click', async () => {
    if (!confirm('Ești sigur că vrei să ștergi tot istoricul?')) return;
    await clearHistory();
    showToast('Istoricul a fost șters.', 'success');
    loadHistory();
  });

  loadHistory();
}

async function loadHistory() {
  const grid = document.getElementById('history-grid');
  const countEl = document.getElementById('history-count');
  if (!grid) return;

  try {
    const videos = await getAllHistoryVideos();
    countEl && (countEl.textContent = `${videos.length} video${videos.length !== 1 ? 'uri' : ''}`);

    if (videos.length === 0) {
      grid.innerHTML = `
        <div class="empty-state" style="grid-column:1/-1;">
          <span class="empty-icon">🎬</span>
          <p style="color:var(--text-muted);font-size:15px;">Niciun video generat încă.</p>
          <p style="color:var(--text-muted);font-size:13px;margin-top:8px;">Apasă <strong>⚡ Auto Mode</strong> pentru a genera primul tău video.</p>
        </div>`;
      return;
    }

    grid.innerHTML = '';
    videos.forEach(entry => {
      const card = document.createElement('div');
      card.className = 'history-card';
      card.innerHTML = `
        <div class="history-card-thumb" id="thumb-${entry.id}">
          <div class="history-thumb-inner">
            <span style="font-size:40px;">🎬</span>
          </div>
          <div class="history-card-badge">${entry.scenesCount || 0} scene</div>
        </div>
        <div class="history-card-body">
          <div class="history-card-title">${escapeHtml(entry.prompt || 'Video Luxury')}</div>
          <div class="history-card-meta">
            <span>📅 ${formatDate(entry.createdAt)}</span>
            <span>💾 ${formatMB(entry.size)}</span>
          </div>
          <div class="history-card-actions">
            <button class="btn btn-primary btn-sm" data-id="${entry.id}" data-action="download">
              📥 Descarcă
            </button>
            <button class="btn btn-sm" data-id="${entry.id}" data-action="delete" style="background:rgba(239,68,68,0.1);border:1px solid rgba(239,68,68,0.3);color:var(--danger);">
              🗑️
            </button>
          </div>
        </div>
      `;

      // Thumbnail: creem un URL temporar din blob
      if (entry.blob) {
        try {
          const url = URL.createObjectURL(entry.blob);
          const thumb = card.querySelector(`#thumb-${entry.id} .history-thumb-inner`);
          const vid = document.createElement('video');
          vid.src = url;
          vid.muted = true;
          vid.playsInline = true;
          vid.style.cssText = 'width:100%;height:100%;object-fit:cover;';
          vid.addEventListener('loadeddata', () => {
            vid.currentTime = 0.5;
            thumb.innerHTML = '';
            thumb.appendChild(vid);
          });
          vid.load();
        } catch (e) {
          // thumb fallback ok
        }
      }

      // Download
      card.querySelector('[data-action="download"]').addEventListener('click', () => {
        if (!entry.blob) return showToast('Blob-ul nu mai e disponibil.', 'error');
        const url = URL.createObjectURL(entry.blob);
        const a = document.createElement('a');
        a.href = url;
        const ext = entry.blob.type.includes('mp4') ? 'mp4' : 'webm';
        a.download = `clipstudio_auto_${entry.id}.${ext}`;
        document.body.appendChild(a);
        a.click();
        setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 1000);
      });

      // Delete
      card.querySelector('[data-action="delete"]').addEventListener('click', async () => {
        await deleteVideoFromHistory(entry.id);
        showToast('Video șters din istoric.', 'success');
        card.style.animation = 'fadeOut 0.3s ease forwards';
        setTimeout(() => { card.remove(); loadHistory(); }, 300);
      });

      grid.appendChild(card);
    });
  } catch (e) {
    console.error('Eroare la încărcarea istoricului:', e);
    grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1;"><span class="empty-icon">❌</span><p>Eroare la încărcarea istoricului.</p></div>`;
  }
}

function escapeHtml(str) {
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function formatDate(ts) {
  if (!ts) return '—';
  const d = new Date(ts);
  return d.toLocaleDateString('ro-RO', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function formatMB(bytes) {
  if (!bytes) return '?';
  return (bytes / 1048576).toFixed(1) + ' MB';
}
