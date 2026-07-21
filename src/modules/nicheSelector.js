import { showToast } from '../utils/helpers.js';
import { fetchPexelsVideos } from '../services/pexelsService.js';
import { generateScript, generateVoiceover, getAudioDuration } from '../services/aiService.js';

export function renderNicheSelector(container, state, onSelect) {
  container.innerHTML = `
    <div class="step-header">
      <h1 class="step-title">Alege Sursa Video</h1>
      <p class="step-subtitle">Alege între videoclipuri Luxury pre-generate sau folosește Custom Video AI pentru a genera un videoclip din orice prompt.</p>
    </div>
    
    <div class="niche-grid" id="mode-grid" style="grid-template-columns: repeat(2, 1fr); max-width: 800px; margin: 0 auto;">
      
      <!-- Luxury Mode -->
      <div class="niche-card ${state.aiMode === 'luxury' ? 'selected' : ''}" data-mode="luxury" style="display: flex; flex-direction: column; align-items: center; text-align: center;">
        <span class="niche-icon" style="font-size: 3rem;">💎</span>
        <h3 class="niche-title" style="font-size: 1.5rem; margin-top: 15px;">Luxury Videos</h3>
        <p class="niche-desc" style="margin-top: 10px;">Folosește colecția noastră locală de videoclipuri premium cu mașini sport, vile și călătorii. Gratuit și offline.</p>
      </div>

      <!-- Custom AI Mode -->
      <div class="niche-card ${state.aiMode === 'custom' ? 'selected' : ''}" data-mode="custom" style="display: flex; flex-direction: column; align-items: center; text-align: center; border-color: var(--primary-color);">
        <span class="niche-icon" style="font-size: 3rem;">🤖</span>
        <h3 class="niche-title" style="font-size: 1.5rem; margin-top: 15px;">Custom Video AI</h3>
        <p class="niche-desc" style="margin-top: 10px;">Scrie un prompt, iar AI-ul nostru va căuta și îmbina videoclipurile perfecte de pe internet pentru tine.</p>
      </div>

    </div>

    <!-- Custom AI Prompt Input -->
    <div id="custom-prompt-container" style="display: ${state.aiMode === 'custom' ? 'block' : 'none'}; max-width: 600px; margin: 30px auto 0;">
      <h3 style="margin-bottom: 10px; font-size: 1.1rem; color: var(--text-color);">Prompt pentru AI:</h3>
      <textarea id="ai-prompt" class="form-input" rows="3" placeholder="Ex: ocean waves crashing on rocks, cinematic, 4k..." style="width: 100%; resize: vertical;">${state.promptText || ''}</textarea>
      
      <!-- Container pentru revizuirea scriptului AI -->
      <div id="script-review-container" style="display: none; margin-top: 20px; background: rgba(0,0,0,0.2); border: 1px solid var(--border-color); border-radius: 8px; padding: 15px;">
        <h4 style="margin-bottom: 15px; color: var(--primary-color);">Revizuiește Scriptul AI</h4>
        <div id="script-scenes-list" style="display: flex; flex-direction: column; gap: 15px;"></div>
        <button class="btn btn-primary btn-block" id="btn-approve-script" style="margin-top: 20px;">✅ Aprobă & Generează Vocea</button>
      </div>
    </div>
    
    <div class="duration-selector" id="duration-selector" style="display:${state.aiMode ? 'block' : 'none'}; margin-top:40px; text-align:center;">
      <h3 style="margin-bottom: 15px; font-size: 1.2rem; color: var(--text-color);">Alege Durata Clipului</h3>
      <div style="display:flex; gap:15px; justify-content:center;">
        <button class="btn btn-outline dur-btn ${state.totalDuration === 10 ? 'active' : ''}" data-dur="10">10s</button>
        <button class="btn btn-outline dur-btn ${state.totalDuration === 15 ? 'active' : ''}" data-dur="15">15s</button>
        <button class="btn btn-outline dur-btn ${state.totalDuration === 20 ? 'active' : ''}" data-dur="20">20s</button>
      </div>
    </div>

    <div class="step-actions" style="margin-top: 40px;">
      <div id="loading-container" style="display: none; align-items: center; gap: 10px; color: var(--primary-color);">
        <div class="spinner" style="width: 20px; height: 20px; border-width: 2px;"></div>
        <span id="loading-text">Se procesează...</span>
      </div>
      <button class="btn btn-primary btn-lg" id="btn-next-1" ${(!state.aiMode || !state.totalDuration) ? 'disabled' : ''}>
        Continuă
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
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
        const data = await res.json();
        
        const allUrls = data.videos['luxury'] || [];
        
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
