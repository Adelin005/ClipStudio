import { showToast, formatTime } from '../utils/helpers.js';

export function renderMusicLibrary(container, state, onNext, onBack) {
  container.innerHTML = `
    <div class="step-header">
      <h1 class="step-title">Alege Muzica</h1>
      <p class="step-subtitle">Alege muzica de fundal pentru videoclipul tău din biblioteca noastră locală. Poți ajusta volumul.</p>
    </div>
    
    <div class="premium-card">
      <div id="music-loading" style="text-align:center; padding:40px 20px; color:var(--text-muted);">
        <div class="spinner"></div>
        <p style="margin-top: 16px;">Se încarcă biblioteca muzicală...</p>
      </div>
      <div id="music-list-container" style="display:none;">
        <div class="music-list" id="music-list" style="max-height:400px; overflow-y:auto; padding-right:8px;"></div>
      </div>
    </div>
    
    <div class="premium-card" style="margin-top:24px; padding: 24px;">
      <div class="range-group">
        <div class="range-header" style="display:flex; justify-content:space-between; margin-bottom: 12px;">
          <span class="input-label" style="margin:0; display:flex; align-items:center; gap:8px;">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path><path d="M19.07 4.93a10 10 0 0 1 0 14.14"></path></svg>
            Volum Muzică
          </span>
          <span class="range-value" id="vol-value" style="font-weight:700; color:var(--primary);">${Math.round((state.musicVolume || 0.7) * 100)}%</span>
        </div>
        <input type="range" id="music-volume" min="0" max="100" value="${Math.round((state.musicVolume || 0.7) * 100)}" />
      </div>
    </div>
    
    <div class="step-actions">
      <button class="btn btn-outline btn-lg" id="btn-back-3">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
        Înapoi
      </button>
      <button class="btn btn-primary btn-lg" id="btn-next-3">
        Continuă
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
      </button>
    </div>
  `;

  let audioPlayer = null;
  const listContainer = document.getElementById('music-list-container');
  const loadingContainer = document.getElementById('music-loading');
  const list = document.getElementById('music-list');

  async function loadMusic() {
    try {
      if (state.musicTracks.length === 0) {
        const res = await fetch('/assets-manifest.json');
        if (!res.ok) throw new Error('Eroare la încărcarea manifestului de fișiere.');
        
        const text = await res.text();
        let data;
        try {
          if (text.trim().startsWith('<')) throw new Error('Răspuns invalid (HTML)');
          data = JSON.parse(text);
        } catch (e) {
          throw new Error('Eroare la parsarea manifestului (assets-manifest.json lipsește sau e invalid).');
        }
        
        const urls = data.music || [];
        
        state.musicTracks = urls.map(url => ({
          name: decodeURIComponent(url.split('/').pop()),
          url: url
        }));
      }
      
      loadingContainer.style.display = 'none';
      listContainer.style.display = 'block';
      renderList();
    } catch (e) {
      loadingContainer.innerHTML = `<div class="empty-state"><span class="empty-icon">⚠️</span><p>${e.message}</p></div>`;
      showToast(e.message, 'error');
    }
  }

  function renderList() {
    list.innerHTML = '';
    
    if (state.musicTracks.length === 0) {
      list.innerHTML = '<div class="empty-state"><span class="empty-icon">🎵</span><p>Nu am găsit nicio melodie în folderul public/music.</p></div>';
      return;
    }

    state.musicTracks.forEach((t, i) => {
      const item = document.createElement('div');
      item.className = `music-item${state.selectedMusic === i ? ' active' : ''}`;
      item.innerHTML = `
        <button class="music-play-btn" data-idx="${i}">▶</button>
        <div class="music-info">
          <div class="music-name">${t.name}</div>
        </div>
        ${state.selectedMusic === i ? '<div style="color:var(--success); font-weight:bold; font-size:12px;">✓ Selectat</div>' : ''}
      `;
      
      item.addEventListener('click', (e) => {
        if (e.target.closest('.music-play-btn')) {
          if (audioPlayer) { audioPlayer.pause(); }
          audioPlayer = new Audio(t.url);
          audioPlayer.volume = (state.musicVolume || 0.7);
          audioPlayer.play();
          return;
        }
        state.selectedMusic = i;
        renderList();
      });
      list.appendChild(item);
    });

    const soon = document.createElement('div');
    soon.style.textAlign = 'center';
    soon.style.padding = '20px';
    soon.style.color = 'var(--text-muted)';
    soon.style.fontSize = '12px';
    soon.style.fontWeight = '600';
    soon.textContent = 'Coming soon more...';
    list.appendChild(soon);
  }

  document.getElementById('music-volume').addEventListener('input', e => {
    state.musicVolume = e.target.value / 100;
    document.getElementById('vol-value').textContent = e.target.value + '%';
    if (audioPlayer) audioPlayer.volume = state.musicVolume;
  });

  document.getElementById('btn-back-3').addEventListener('click', () => { if (audioPlayer) audioPlayer.pause(); onBack(); });
  document.getElementById('btn-next-3').addEventListener('click', () => { if (audioPlayer) audioPlayer.pause(); onNext(); });
  
  loadMusic();
}
