const FONTS = [
  { name: 'Bebas Neue', family: '"Bebas Neue", sans-serif' },
  { name: 'Outfit', family: '"Outfit", sans-serif' },
  { name: 'Oswald', family: '"Oswald", sans-serif' },
  { name: 'Montserrat', family: '"Montserrat", sans-serif' },
  { name: 'Inter', family: '"Inter", sans-serif' },
  { name: 'Impact', family: 'Impact, sans-serif' },
];

const POSITIONS = [
  { id: 'top-left', label: '↖', x: 0.1, y: 0.12 },
  { id: 'top-center', label: '↑', x: 0.5, y: 0.12 },
  { id: 'top-right', label: '↗', x: 0.9, y: 0.12 },
  { id: 'mid-left', label: '←', x: 0.1, y: 0.5 },
  { id: 'mid-center', label: '●', x: 0.5, y: 0.5 },
  { id: 'mid-right', label: '→', x: 0.9, y: 0.5 },
  { id: 'bot-left', label: '↙', x: 0.1, y: 0.88 },
  { id: 'bot-center', label: '↓', x: 0.5, y: 0.88 },
  { id: 'bot-right', label: '↘', x: 0.9, y: 0.88 },
];

export function renderTextOverlay(container, state, onNext, onBack) {
  if (!state.textSettings) {
    state.textSettings = { text: state.aiMode === 'custom' ? 'Acesta este un text generat de AI.' : '', font: 0, size: 48, color: '#ffffff', stroke: '#000000', strokeWidth: 3, position: 'mid-center', shadow: true };
  }
  const ts = state.textSettings;

  container.innerHTML = `
    <div class="step-header">
      <h1 class="step-title">Text Overlay</h1>
      <p class="step-subtitle">Adaugă text pe videoclipul tău. Personalizează font-ul, culoarea și poziția. (Opțional)</p>
    </div>
    <div class="text-editor-layout">
      <div>
        <div class="text-preview-container" id="text-preview-box">
          <canvas class="text-preview-canvas" id="text-canvas" width="360" height="640"></canvas>
        </div>
      </div>
      <div class="text-controls">
        <div class="settings-panel">
        <h3 class="panel-title">Stilizare Text</h3>
        
        <div class="form-group" id="global-text-group" style="display: ${state.aiMode === 'custom' ? 'none' : 'block'};">
          <label class="form-label">Text de afișat pe video</label>
          <textarea id="text-input" class="form-input" rows="3" placeholder="Scrie ceva captivant...">${ts.text}</textarea>
        </div>
        
        ${state.aiMode === 'custom' ? '<div style="margin-bottom:15px; font-size:12px; color:var(--primary-color);">ℹ️ Textul va fi extras automat din scenariul AI pentru fiecare scenă în parte. Folosește setările de mai jos doar pentru a-i schimba aspectul.</div>' : ''}
        <div class="input-group">
          <label class="input-label">🔤 Font</label>
          <div class="font-grid" id="font-grid"></div>
        </div>
        <div class="range-group">
          <div class="range-header">
            <span class="input-label">📏 Mărime</span>
            <span class="range-value" id="size-val">${ts.size}px</span>
          </div>
          <input type="range" id="font-size" min="16" max="96" value="${ts.size}" />
        </div>
        <div class="input-group">
          <label class="input-label">🎨 Culori</label>
          <div class="color-row">
            <input type="color" class="color-input" id="text-color" value="${ts.color}" title="Text" />
            <span style="font-size:13px;color:var(--text-secondary)">Text</span>
            <input type="color" class="color-input" id="stroke-color" value="${ts.stroke}" title="Outline" />
            <span style="font-size:13px;color:var(--text-secondary)">Outline</span>
          </div>
        </div>
        <div class="range-group">
          <div class="range-header">
            <span class="input-label">Grosime Outline</span>
            <span class="range-value" id="stroke-val">${ts.strokeWidth}px</span>
          </div>
          <input type="range" id="stroke-width" min="0" max="10" value="${ts.strokeWidth}" />
        </div>
        <div class="input-group">
          <label class="input-label">📍 Poziție</label>
          <div class="position-grid" id="pos-grid"></div>
        </div>
      </div>
    </div>
    <div class="step-actions">
      <button class="btn btn-ghost" id="btn-back-4">← Înapoi</button>
      <button class="btn btn-primary btn-lg" id="btn-next-4">
        Continuă la Preview
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
      </button>
    </div>
  `;

  // Fonts
  const fontGrid = document.getElementById('font-grid');
  FONTS.forEach((f, i) => {
    const btn = document.createElement('button');
    btn.className = `font-option${ts.font === i ? ' active' : ''}`;
    btn.style.fontFamily = f.family;
    btn.textContent = f.name;
    btn.addEventListener('click', () => {
      fontGrid.querySelectorAll('.font-option').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      ts.font = i;
      drawPreview();
    });
    fontGrid.appendChild(btn);
  });

  // Positions
  const posGrid = document.getElementById('pos-grid');
  POSITIONS.forEach(p => {
    const btn = document.createElement('button');
    btn.className = `pos-btn${ts.position === p.id ? ' active' : ''}`;
    btn.textContent = p.label;
    btn.addEventListener('click', () => {
      posGrid.querySelectorAll('.pos-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      ts.position = p.id;
      drawPreview();
    });
    posGrid.appendChild(btn);
  });

  // Canvas preview
  const canvas = document.getElementById('text-canvas');
  const ctx = canvas.getContext('2d');

  function drawPreview() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    // Dark bg with gradient
    const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
    grad.addColorStop(0, '#1a1a2e'); grad.addColorStop(1, '#0a0a0f');
    ctx.fillStyle = grad; ctx.fillRect(0, 0, canvas.width, canvas.height);
    // Grid lines
    ctx.strokeStyle = 'rgba(255,255,255,0.05)'; ctx.lineWidth = 1;
    for (let i = 0; i < 4; i++) { const y = canvas.height * (i + 1) / 4; ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke(); }

    if (!ts.text.trim()) {
      ctx.fillStyle = 'rgba(255,255,255,0.2)'; ctx.font = '16px Inter'; ctx.textAlign = 'center';
      ctx.fillText('Preview-ul textului apare aici', canvas.width / 2, canvas.height / 2);
      return;
    }

    const pos = POSITIONS.find(p => p.id === ts.position) || POSITIONS[4];
    const x = canvas.width * pos.x;
    const y = canvas.height * pos.y;
    const font = FONTS[ts.font] || FONTS[0];
    const fontSize = ts.size * (canvas.width / 360);

    ctx.font = `bold ${fontSize}px ${font.family}`;
    ctx.textAlign = pos.x < 0.3 ? 'left' : pos.x > 0.7 ? 'right' : 'center';
    ctx.textBaseline = 'middle';

    const lines = ts.text.split('\n');
    const lineHeight = fontSize * 1.2;
    const startY = y - ((lines.length - 1) * lineHeight) / 2;

    lines.forEach((line, i) => {
      const ly = startY + i * lineHeight;
      if (ts.shadow) { ctx.shadowColor = 'rgba(0,0,0,0.7)'; ctx.shadowBlur = 12; ctx.shadowOffsetX = 2; ctx.shadowOffsetY = 2; }
      if (ts.strokeWidth > 0) { ctx.strokeStyle = ts.stroke; ctx.lineWidth = ts.strokeWidth * 2; ctx.lineJoin = 'round'; ctx.strokeText(line, x, ly); }
      ctx.shadowColor = 'transparent'; ctx.fillStyle = ts.color; ctx.fillText(line, x, ly);
    });
  }

  // Event listeners
  document.getElementById('text-input').addEventListener('input', e => { ts.text = e.target.value; drawPreview(); });
  document.getElementById('font-size').addEventListener('input', e => { ts.size = parseInt(e.target.value); document.getElementById('size-val').textContent = ts.size + 'px'; drawPreview(); });
  document.getElementById('text-color').addEventListener('input', e => { ts.color = e.target.value; drawPreview(); });
  document.getElementById('stroke-color').addEventListener('input', e => { ts.stroke = e.target.value; drawPreview(); });
  document.getElementById('stroke-width').addEventListener('input', e => { ts.strokeWidth = parseInt(e.target.value); document.getElementById('stroke-val').textContent = ts.strokeWidth + 'px'; drawPreview(); });

  document.getElementById('btn-back-4').addEventListener('click', onBack);
  document.getElementById('btn-next-4').addEventListener('click', onNext);
  drawPreview();
}

export function getTextSettingsForExport(settings) {
  if (!settings || !settings.text.trim()) return null;
  const pos = POSITIONS.find(p => p.id === settings.position) || POSITIONS[4];
  const font = FONTS[settings.font] || FONTS[0];
  return { ...settings, posX: pos.x, posY: pos.y, fontFamily: font.family, fontName: font.name };
}
