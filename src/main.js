import './styles/main.css';
import { renderNicheSelector } from './modules/nicheSelector.js';
import { renderMusicLibrary } from './modules/musicLibrary.js';
import { renderTextOverlay } from './modules/textOverlay.js';
import { renderExportPanel } from './modules/videoExporter.js';
import { renderAutoPanel } from './modules/autoPanel.js';
import { renderHistoryPanel } from './modules/historyPanel.js';
import { showToast } from './utils/helpers.js';

// Global app state
const state = {
  currentStep: 1,
  niche: null, // used for 'luxury'
  aiMode: null, // 'luxury' or 'custom'
  promptText: '',
  pexelsApiKey: localStorage.getItem('viralclip_pexels_key') || '',
  groqApiKey: localStorage.getItem('viralclip_groq_key') || '',
  elevenLabsApiKey: localStorage.getItem('viralclip_elevenlabs_key') || '',
  videos: [],
  musicTracks: [],
  selectedMusic: null,
  musicVolume: 0.7,
  textSettings: null,
  totalDuration: 15,
  segmentDuration: 1.5,
};

// API Key handling
const pexelsKeyInput = document.getElementById('pexels-api-key');
if (pexelsKeyInput) {
  pexelsKeyInput.value = state.pexelsApiKey;
  pexelsKeyInput.addEventListener('input', (e) => {
    state.pexelsApiKey = e.target.value.trim();
    localStorage.setItem('viralclip_pexels_key', state.pexelsApiKey);
  });
}

const groqKeyInput = document.getElementById('groq-api-key');
if (groqKeyInput) {
  groqKeyInput.value = state.groqApiKey;
  groqKeyInput.addEventListener('input', (e) => {
    state.groqApiKey = e.target.value.trim();
    localStorage.setItem('viralclip_groq_key', state.groqApiKey);
  });
}

const elevenLabsKeyInput = document.getElementById('elevenlabs-api-key');
if (elevenLabsKeyInput) {
  elevenLabsKeyInput.value = state.elevenLabsApiKey;
  elevenLabsKeyInput.addEventListener('input', (e) => {
    state.elevenLabsApiKey = e.target.value.trim();
    localStorage.setItem('viralclip_elevenlabs_key', state.elevenLabsApiKey);
  });
}



const mainContent = document.getElementById('main-content');

function goToStep(step) {
  state.currentStep = step;
  // Update nav
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

  switch (state.currentStep) {
    case 1:
      renderNicheSelector(panel, state, () => goToStep(2));
      break;
    case 2:
      renderMusicLibrary(panel, state, () => goToStep(3), () => goToStep(1));
      break;
    case 3:
      renderTextOverlay(panel, state, () => goToStep(4), () => goToStep(2));
      break;
    case 4:
      renderExportPanel(panel, state, () => goToStep(3));
      break;
    case 5:
      renderAutoPanel(panel, state, () => goToStep(6));
      break;
    case 6:
      renderHistoryPanel(panel);
      break;
  }
}

// Sidebar nav clicks
document.querySelectorAll('.nav-step').forEach(btn => {
  btn.addEventListener('click', () => {
    const step = parseInt(btn.dataset.step);
    // Steps 5 and 6 (Auto Mode & History) are always accessible
    if (step === 5 || step === 6 || step <= state.currentStep) goToStep(step);
  });
});

// Init
goToStep(1);
