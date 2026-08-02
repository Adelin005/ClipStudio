import { showToast } from '../utils/helpers.js';
import { fetchPexelsVideos } from '../services/pexelsService.js';
import { generateScript, generateVoiceover, getAudioDuration } from '../services/aiService.js';

export function renderNicheSelector(container, state, onSelect) {
  container.innerHTML = `
    <div class="step-header">
      <h1 class="step-title">Alege Sursa Video</h1>
      <p class="step-subtitle">Alege între videoclipuri Luxury pre-generate sau folosește Custom Video AI pentru a genera un videoclip din orice prompt.</p>
    </div>
    
    <div class="niche-grid" id="mode-grid">
      
      <!-- Luxury Mode -->
      <div class="niche-card ${state.aiMode === 'luxury' ? 'selected' : ''}" data-mode="luxury">
        <span class="niche-icon">💎</span>
        <h3 class="niche-title">Luxury Videos</h3>
        <p class="niche-desc">Folosește colecția noastră locală de videoclipuri premium cu mașini sport, vile și călătorii. Gratuit și offline.</p>
      </div>

      <!-- Custom AI Mode -->
      <div class="niche-card ${state.aiMode === 'custom' ? 'selected' : ''}" data-mode="custom">
        <span class="niche-icon">🤖</span>
        <h3 class="niche-title">Custom Video AI</h3>
        <p class="niche-desc">Scrie un prompt, iar AI-ul nostru va căuta și îmbina videoclipurile perfecte de pe internet pentru tine.</p>
      </div>

    </div>

    <!-- Custom AI Prompt Input -->
    <div id="custom-prompt-container" style="display: ${state.aiMode === 'custom' ? 'block' : 'none'}; max-width: 640px; margin: 40px auto 0;">
      <div class="prompt-area">
        <label class="input-label">Prompt pentru AI:</label>
        <textarea id="ai-prompt" class="form-input" rows="3" placeholder="Ex: ocean waves crashing on rocks, cinematic, 4k..." style="resize: vertical;">${state.promptText || ''}</textarea>
      </div>
      
      <!-- Container pentru revizuirea scriptului AI -->
      <div id="script-review-container" style="display: none; margin-top: 24px; padding: 24px; border-radius: var(--radius-lg); background: rgba(0,0,0,0.3); border: 1px solid var(--border-color);">
        <h4 class="section-title" style="color: var(--primary);">Revizuiește Scriptul AI</h4>
        <div id="script-scenes-list" style="display: flex; flex-direction: column; gap: 16px;"></div>
        <button class="btn btn-primary btn-block" id="btn-approve-script" style="margin-top: 24px;">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
          Aprobă & Generează
        </button>
      </div>
    </div>
    
    <div class="duration-selector" id="duration-selector" style="display:${state.aiMode ? 'block' : 'none'};">
      <h3 class="section-title" style="margin-bottom: 16px; color: var(--text-secondary);">Alege Durata Clipului</h3>
      <div class="duration-btns">
        <button class="btn btn-outline dur-btn ${state.totalDuration === 10 ? 'active' : ''}" data-dur="10">10s</button>
        <button class="btn btn-outline dur-btn ${state.totalDuration === 15 ? 'active' : ''}" data-dur="15">15s</button>
        <button class="btn btn-outline dur-btn ${state.totalDuration === 20 ? 'active' : ''}" data-dur="20">20s</button>
      </div>
    </div>

    <div class="step-actions">
      <div id="loading-container" style="display: none; align-items: center; gap: 12px; color: var(--primary);">
        <div class="spinner"></div>
        <span id="loading-text" style="font-weight: 600; font-size: 15px;">Se procesează...</span>
      </div>
      <div style="flex:1"></div>
      <button class="btn btn-primary btn-lg" id="btn-next-1" ${(!state.aiMode || !state.totalDuration) ? 'disabled' : ''}>
        Continuă
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
      </button>
    </div>
  `;

  const grid = document.getElementById('mode-grid');
  const durSelector = document.getElementById('duration-selector');
  const customContainer = document.getElementById('custom-prompt-container');
  const promptInput = document.getElementById('ai-prompt');
  const btnNext = document.getElementById('btn-next-1');
  const loadingContainer = document.getElementById('loading-container');
  const loadingText = document.getElementById('loading-text');

  grid.querySelectorAll('.niche-card').forEach(card => {
    card.addEventListener('click', () => {
      grid.querySelectorAll('.niche-card').forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
      state.aiMode = card.dataset.mode;
      
      if (state.aiMode === 'custom') {
        customContainer.style.display = 'block';
        durSelector.style.display = 'none'; // Hide duration for custom
        state.niche = null;
      } else {
        customContainer.style.display = 'none';
        durSelector.style.display = 'block'; // Show duration for luxury
        state.niche = 'luxury'; // fallback so older code using state.niche still works for luxury
      }

      checkNextButton();
    });
  });

  if (promptInput) {
    promptInput.addEventListener('input', (e) => {
      state.promptText = e.target.value;
      checkNextButton();
    });
  }

  const durBtns = document.querySelectorAll('.dur-btn');
  durBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      durBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.totalDuration = parseInt(btn.dataset.dur, 10);
      checkNextButton();
    });
  });

  function checkNextButton() {
    let isValid = false;
    if (state.aiMode === 'luxury' && state.totalDuration) {
      isValid = true;
    } else if (state.aiMode === 'custom' && state.promptText && state.promptText.trim() !== '') {
      isValid = true; // Duration is dynamic for custom AI
    }
    btnNext.disabled = !isValid;
  }

  btnNext.addEventListener('click', async () => {
    btnNext.style.display = 'none';
    loadingContainer.style.display = 'flex';
    
    try {
      state.videos = [];
      const segmentDuration = state.segmentDuration || 1.5;
      const neededSegments = Math.ceil(state.totalDuration / segmentDuration);

      if (state.aiMode === 'luxury') {
        loadingText.textContent = 'Se generează fundalul din fișiere locale...';
        
        const res = await fetch('/assets-manifest.json');
        if (!res.ok) throw new Error('Eroare la citirea manifestului de fișiere locale.');
        
        const text = await res.text();
        let data;
        try {
          if (text.trim().startsWith('<')) throw new Error('Răspuns invalid (HTML)');
          data = JSON.parse(text);
        } catch (e) {
          throw new Error('Eroare la parsarea manifestului (assets-manifest.json lipsește sau e invalid).');
        }
        
        const allUrls = data.videos?.['luxury'] || [];
        
        if (allUrls.length === 0) {
          throw new Error('Nu există videoclipuri disponibile pentru nișa luxury.');
        }

        allUrls.sort(() => 0.5 - Math.random());
        const toTake = Math.min(allUrls.length, neededSegments * 2); 
        
        for (let i = 0; i < toTake; i++) {
          const url = allUrls[i];
          state.videos.push({ 
            name: url.split('/').pop(), 
            url: url, 
            duration: 10, 
            type: 'local-auto' 
          });
        }
        showToast('✨ Am selectat clipurile luxury locale!');

      } else if (state.aiMode === 'custom') {
        if (!state.groqApiKey) throw new Error("Te rog să introduci cheia Groq în meniul din stânga.");
        if (!state.elevenLabsApiKey) throw new Error("Te rog să introduci cheia ElevenLabs în meniul din stânga.");
        
        loadingText.textContent = 'AI-ul scrie scenariul...';
        const scenes = await generateScript(state.promptText, state.groqApiKey);
        
        // Show review UI
        btnNext.style.display = 'none';
        loadingContainer.style.display = 'none';
        
        const reviewContainer = document.getElementById('script-review-container');
        const scenesList = document.getElementById('script-scenes-list');
        reviewContainer.style.display = 'block';
        scenesList.innerHTML = '';
        
        scenes.forEach((scene, i) => {
          const div = document.createElement('div');
          div.style.cssText = "background: rgba(255,255,255,0.05); padding: 10px; border-radius: 6px;";
          div.innerHTML = `
            <div style="font-size: 12px; color: var(--text-muted); margin-bottom: 5px;">Scena ${i+1}</div>
            <textarea class="form-input scene-text-input" rows="2" style="width:100%; margin-bottom:8px; font-size: 13px;" title="Text Voiceover">${scene.text}</textarea>
            <input type="text" class="form-input scene-query-input" value="${scene.searchQuery}" style="width:100%; font-size: 12px; font-family: monospace;" title="Căutare Pexels">
          `;
          scenesList.appendChild(div);
        });

        document.getElementById('btn-approve-script').onclick = async () => {
          reviewContainer.style.display = 'none';
          loadingContainer.style.display = 'flex';
          
          // Gathers edited text
          const textInputs = scenesList.querySelectorAll('.scene-text-input');
          const queryInputs = scenesList.querySelectorAll('.scene-query-input');
          
          const editedScenes = [];
          for(let i=0; i<textInputs.length; i++) {
            editedScenes.push({
              text: textInputs[i].value.trim(),
              searchQuery: queryInputs[i].value.trim()
            });
          }

          try {
            for (let i = 0; i < editedScenes.length; i++) {
              const scene = editedScenes[i];
              loadingText.textContent = `Se generează vocea și video pentru scena ${i + 1}/${editedScenes.length}...`;
              
              const audioBlob = await generateVoiceover(scene.text, state.elevenLabsApiKey);
              const duration = await getAudioDuration(audioBlob);
              
              const fetchedVideos = await fetchPexelsVideos(scene.searchQuery, state.pexelsApiKey, 1);
              if (fetchedVideos.length === 0) {
                console.warn("Nu s-au găsit videoclipuri pentru:", scene.searchQuery);
                continue;
              }
              
              const v = fetchedVideos[0];
              state.videos.push({
                ...v,
                duration: duration + 0.5,
                sceneText: scene.text,
                audioBlob: audioBlob
              });
            }
            
            if (state.videos.length === 0) throw new Error("Nu s-a putut genera nicio scenă.");
            
            showToast('🤖 AI a creat povestea și a găsit videoclipurile!');
            onSelect();
          } catch(err) {
            btnNext.style.display = 'flex';
            loadingContainer.style.display = 'none';
            showToast(err.message, 'error');
          }
        };
        return; // wait for user approval, onSelect is called inside the approve handler
      }

      onSelect();
      
    } catch (e) {
      btnNext.style.display = 'flex';
      loadingContainer.style.display = 'none';
      showToast(e.message, 'error');
    }
  });
}
