import { generateClipPlan, getClipPlanSummary } from './clipProcessor.js';
import { getTextSettingsForExport } from './textOverlay.js';
import { loadFFmpeg, writeFileToFFmpeg, execFFmpeg, readFileFromFFmpeg, deleteFileFromFFmpeg, setProgressCallback } from '../services/ffmpegService.js';
import { showToast, formatTime } from '../utils/helpers.js';

export function renderExportPanel(container, state, onBack) {
  const ts = getTextSettingsForExport(state.textSettings);
  const hasText = !!ts;
  const hasMusic = state.musicTracks.length > 0 && state.selectedMusic !== null;

  container.innerHTML = `
    <div class="step-header">
      <h1 class="step-title">Preview & Export</h1>
      <p class="step-subtitle">Configurează setările finale și exportă videoclipul tău. Procesarea se face 100% în browser.</p>
    </div>
    <div class="export-layout">
      <div>
        <div class="preview-phone" id="preview-container">
          <canvas id="preview-canvas" width="1080" height="1920"></canvas>
        </div>
        <div class="preview-controls">
          <button class="btn btn-secondary" id="btn-preview-play">▶ Preview</button>
        </div>
      </div>
      <div class="export-settings">

        <div class="export-card">
          <h4>📋 Sumar</h4>
          <div id="clip-summary" style="font-size:13px;color:var(--text-secondary);line-height:1.8;"></div>
        </div>
        <div class="export-card" id="clip-plan-card">
          <h4>🎬 Plan Clipuri</h4>
          <div class="clip-list" id="clip-list"></div>
        </div>
        <div class="export-card" id="export-progress-card" style="display:none;">
          <h4>⏳ Export în progres</h4>
          <div class="progress-bar"><div class="progress-fill" id="progress-fill"></div></div>
          <p class="progress-text" id="progress-text">Se inițializează FFmpeg...</p>
        </div>
        <button class="btn btn-primary btn-lg btn-block" id="btn-generate">
          🚀 Generează & Exportă Video
        </button>
        <div id="download-section" style="display:none;margin-top:12px;">
          <button class="btn btn-secondary btn-lg btn-block" id="btn-download">📥 Descarcă Video</button>
        </div>
      </div>
    </div>
    <div class="step-actions">
      <button class="btn btn-ghost" id="btn-back-5">← Înapoi</button>
      <div></div>
    </div>
  `;

  let clipPlan = [];
  let downloadBlob = null;

  function updatePlan() {
    clipPlan = generateClipPlan(state.videos, state.totalDuration, state.segmentDuration, state.aiMode);
    const summary = getClipPlanSummary(clipPlan);

    document.getElementById('clip-summary').innerHTML = `
      <div>📹 <strong>${state.videos.length}</strong> videoclipuri sursă</div>
      <div>✂️ <strong>${summary.totalSegments}</strong> segmente de <strong>${state.segmentDuration}s</strong></div>
      <div>⏱️ Durată totală: <strong>${formatTime(summary.totalDuration)}</strong></div>
      <div>🎵 Muzică: <strong>${hasMusic ? state.musicTracks[state.selectedMusic].name : 'Fără'}</strong></div>
      <div>📝 Text: <strong>${hasText ? '"' + ts.text.substring(0, 30) + '..."' : 'Fără'}</strong></div>
    `;

    const list = document.getElementById('clip-list');
    list.innerHTML = '';
    clipPlan.slice(0, 20).forEach((c, i) => {
      const item = document.createElement('div');
      item.className = 'clip-item';
      item.innerHTML = `<span class="clip-number">${i + 1}</span><span>${c.videoName.substring(0, 25)}</span><span style="color:var(--text-muted);font-size:11px">${c.startTime.toFixed(1)}s → ${(c.startTime + c.duration).toFixed(1)}s</span>`;
      list.appendChild(item);
    });
    if (clipPlan.length > 20) {
      const more = document.createElement('div');
      more.className = 'clip-item';
      more.innerHTML = `<span style="color:var(--text-muted)">... și încă ${clipPlan.length - 20} segmente</span>`;
      list.appendChild(more);
    }
  }

  updatePlan();

  // Preview with canvas
  document.getElementById('btn-preview-play').addEventListener('click', () => {
    previewAnimation();
  });

  let previewAnimFrame = null;
  let previewTimeout = null;
  let previewVideo = null;

  function previewAnimation() {
    const canvas = document.getElementById('preview-canvas');
    const ctx = canvas.getContext('2d');
    
    // Stop previous preview
    if (previewAnimFrame) cancelAnimationFrame(previewAnimFrame);
    if (previewTimeout) clearTimeout(previewTimeout);
    if (previewVideo) {
      previewVideo.pause();
      previewVideo.removeAttribute('src');
      previewVideo.load();
    }
    
    let idx = 0;
    previewVideo = document.createElement('video');
    previewVideo.muted = true;
    previewVideo.playsInline = true;
    previewVideo.crossOrigin = 'anonymous';

    function playNextClip() {
      if (idx >= clipPlan.length) { 
        if (previewAnimFrame) cancelAnimationFrame(previewAnimFrame);
        ctx.fillStyle = 'rgba(0,0,0,0.8)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 48px Inter';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('Preview încheiat', canvas.width / 2, canvas.height / 2);
        return; 
      }
      
      const clip = clipPlan[idx];
      previewVideo.src = clip.videoUrl;
      previewVideo.currentTime = clip.startTime;
      previewVideo.play().catch(e => console.error("Preview err:", e));
      
      idx++;
      previewTimeout = setTimeout(playNextClip, clip.duration * 1000);
    }
    
    function renderLoop() {
      if (previewVideo.readyState >= 2) {
        const vW = previewVideo.videoWidth;
        const vH = previewVideo.videoHeight;
        const cW = canvas.width;
        const cH = canvas.height;
        
        // Obținem dimensiunea cu "object-fit: cover"
        const scale = Math.max(cW / vW, cH / vH);
        const dW = vW * scale;
        const dH = vH * scale;
        const dx = (cW - dW) / 2;
        const dy = (cH - dH) / 2;
        
        ctx.drawImage(previewVideo, dx, dy, dW, dH);
      } else {
        ctx.fillStyle = '#111';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
      
      if (hasText) {
        // În modul custom AI, luăm textul specific scenei, altfel textul global
        const displayText = (state.aiMode === 'custom' && clipPlan[idx-1] && clipPlan[idx-1].sceneText) 
                              ? clipPlan[idx-1].sceneText 
                              : ts.text;
        
        if (displayText && displayText.trim() !== '') {
          ctx.font = `bold ${ts.size * 3}px ${ts.fontFamily}`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          
          const maxWidth = canvas.width * 0.85; // 85% of screen width
          const lines = wrapText(ctx, displayText, maxWidth);
          const lineHeight = ts.size * 3 * 1.2;
          const startY = (canvas.height * ts.posY) - ((lines.length - 1) * lineHeight) / 2;
          
          lines.forEach((line, i) => {
            const ly = startY + i * lineHeight;
            if (ts.strokeWidth > 0) { 
              ctx.strokeStyle = ts.stroke; 
              ctx.lineWidth = ts.strokeWidth * 3; 
              ctx.lineJoin = 'round'; 
              ctx.strokeText(line, canvas.width * ts.posX, ly); 
            }
            ctx.fillStyle = ts.color;
            ctx.fillText(line, canvas.width * ts.posX, ly);
          });
        }
      }
      
      previewAnimFrame = requestAnimationFrame(renderLoop);
    }
    
    playNextClip();
    renderLoop();
  }

  // Generate & Export
  document.getElementById('btn-generate').addEventListener('click', async () => {
    const btn = document.getElementById('btn-generate');
    btn.disabled = true;
    btn.textContent = '⏳ Se procesează...';
    document.getElementById('export-progress-card').style.display = 'block';

    const progressFill = document.getElementById('progress-fill');
    const progressText = document.getElementById('progress-text');

    const hasCustomAi = state.aiMode === 'custom' && clipPlan[0] && clipPlan[0].sceneText;

    try {
      if (hasCustomAi) {
        // ===== CUSTOM AI MODE: Canvas + MediaRecorder (NO FFmpeg for video) =====
        await exportWithCanvasRecorder(clipPlan, ts, hasText, hasMusic, state, progressFill, progressText, (blob) => {
          downloadBlob = blob;
          progressFill.style.width = '100%';
          progressText.textContent = `✅ Video generat cu succes! (${(blob.size / 1048576).toFixed(1)} MB)`;
          document.getElementById('download-section').style.display = 'block';
          btn.textContent = '✅ Gata!';
          showToast('Video generat cu succes! Apasă Descarcă.');
        });
      } else {
        // ===== LUXURY MODE: FFmpeg (lightweight local files) =====
        progressText.textContent = 'Se încarcă FFmpeg (~30MB)...';
        progressFill.style.width = '5%';
        setProgressCallback(p => { progressFill.style.width = `${Math.min(95, 20 + p * 0.7)}%`; });
        await loadFFmpeg();
        progressFill.style.width = '15%';

        const segFiles = [];
        for (let i = 0; i < clipPlan.length; i++) {
          const clip = clipPlan[i];
          const inputName = `input_${i}.mp4`;
          const outputName = `seg_${i}.ts`;
          progressText.textContent = `Se procesează clipul ${i + 1}/${clipPlan.length}...`;
          progressFill.style.width = `${15 + (i / clipPlan.length) * 50}%`;

          if (clip.videoFile) {
            await writeFileToFFmpeg(inputName, clip.videoFile);
          } else {
            await writeFileToFFmpeg(inputName, clip.videoUrl);
          }

          const vfArgs = 'scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2';
          await execFFmpeg([
            '-ss', clip.startTime.toString(),
            '-i', inputName,
            '-t', clip.duration.toString(),
            '-vf', vfArgs,
            '-c:v', 'mpeg4', '-q:v', '5',
            '-an', '-f', 'mpegts',
            '-y', outputName
          ]);
          segFiles.push(outputName);
          await deleteFileFromFFmpeg(inputName);
        }

        progressText.textContent = 'Se combină segmentele...';
        progressFill.style.width = '70%';
        const concatInput = `concat:${segFiles.join('|')}`;

        if (hasMusic) {
          const musicTrack = state.musicTracks[state.selectedMusic];
          await writeFileToFFmpeg('music_input.mp3', musicTrack.file || musicTrack.url);
          const vol = state.musicVolume || 0.7;
          await execFFmpeg([
            '-i', concatInput, '-i', 'music_input.mp3',
            '-c:v', 'mpeg4', '-q:v', '5',
            '-filter_complex', `[1:a]volume=${vol}[aout]`,
            '-map', '0:v', '-map', '[aout]',
            '-c:a', 'aac', '-b:a', '128k',
            '-shortest', '-movflags', '+faststart',
            '-y', 'output.mp4'
          ]);
        } else {
          await execFFmpeg([
            '-i', concatInput,
            '-c:v', 'mpeg4', '-q:v', '5',
            '-an', '-movflags', '+faststart',
            '-y', 'output.mp4'
          ]);
        }

        let finalFile = 'output.mp4';
        if (hasText) {
          progressText.textContent = 'Se adaugă textul...';
          progressFill.style.width = '90%';
          try {
            const textBlob = await generateTextOverlayPng(ts.text, ts);
            await writeFileToFFmpeg('text_overlay.png', textBlob);
            const audioArgs = hasMusic ? ['-c:a', 'copy'] : ['-an'];
            await execFFmpeg([
              '-i', 'output.mp4', '-i', 'text_overlay.png',
              '-filter_complex', '[0:v][1:v]overlay=0:0',
              '-c:v', 'mpeg4', '-q:v', '5',
              ...audioArgs, '-movflags', '+faststart',
              '-y', 'final.mp4'
            ]);
            finalFile = 'final.mp4';
          } catch (textErr) {
            console.error('Text overlay err:', textErr);
          }
        }

        progressText.textContent = 'Se finalizează...';
        progressFill.style.width = '95%';
        const data = await readFileFromFFmpeg(finalFile);
        if (data.length < 1000) throw new Error('Fișierul generat este prea mic.');
        downloadBlob = new Blob([data], { type: 'video/mp4' });

        progressFill.style.width = '100%';
        progressText.textContent = `✅ Video generat cu succes! (${(data.length / 1048576).toFixed(1)} MB)`;
        document.getElementById('download-section').style.display = 'block';
        btn.textContent = '✅ Gata!';
        showToast('Video generat cu succes! Apasă Descarcă.');

        for (const f of segFiles) { await deleteFileFromFFmpeg(f); }
        try { await deleteFileFromFFmpeg('output.mp4'); } catch(e) {}
        try { await deleteFileFromFFmpeg(finalFile); } catch(e) {}
      }

    } catch (err) {
      console.error('Export error:', err);
      progressText.textContent = `❌ Eroare: ${err.message}`;
      progressFill.style.width = '0%';
      btn.disabled = false;
      btn.textContent = '🚀 Generează & Exportă Video';
      showToast('Eroare la export: ' + err.message, 'error');
    }
  });

  // Download handler — use proper link with body append
  document.getElementById('btn-download').addEventListener('click', () => {
    if (!downloadBlob) return;
    const url = URL.createObjectURL(downloadBlob);
    const a = document.createElement('a');
    a.href = url;
    const ext = downloadBlob.type.includes('webm') ? 'webm' : 'mp4';
    a.download = `viralclip_${state.niche || 'custom'}_${Date.now()}.${ext}`;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    // Cleanup after a short delay
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 1000);
  });

  document.getElementById('btn-back-5').addEventListener('click', onBack);
}

// Helper to generate text overlay image
async function generateTextOverlayPng(text, ts) {
  return new Promise(resolve => {
    const canvas = document.createElement('canvas');
    canvas.width = 1080;
    canvas.height = 1920;
    const ctx = canvas.getContext('2d');
    
    const xPos = 1080 * ts.posX;
    const yPos = 1920 * ts.posY;
    
    ctx.font = `bold ${ts.size * 3}px ${ts.fontFamily}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    const lines = wrapText(ctx, text, 1080 * 0.85);
    const lineHeight = ts.size * 3 * 1.2;
    const startY = yPos - ((lines.length - 1) * lineHeight) / 2;
    
    lines.forEach((line, i) => {
      const ly = startY + i * lineHeight;
      if (ts.strokeWidth > 0) {
        ctx.strokeStyle = ts.stroke;
        ctx.lineWidth = ts.strokeWidth * 3;
        ctx.lineJoin = 'round';
        ctx.strokeText(line, xPos, ly);
      }
      ctx.fillStyle = ts.color;
      ctx.fillText(line, xPos, ly);
    });
    
    canvas.toBlob(blob => resolve(blob), 'image/png');
  });
}

function wrapText(ctx, text, maxWidth) {
  const blocks = text.split('\n');
  const lines = [];
  blocks.forEach(block => {
    const words = block.split(' ');
    let currentLine = words[0] || '';
    for (let i = 1; i < words.length; i++) {
      const word = words[i];
      const width = ctx.measureText(currentLine + " " + word).width;
      if (width < maxWidth) {
        currentLine += " " + word;
      } else {
        lines.push(currentLine);
        currentLine = word;
      }
    }
    lines.push(currentLine);
  });
  return lines;
}

// ============================================================
// Canvas + MediaRecorder export (NO FFmpeg needed for video!)
// Records the canvas playback exactly like Preview does it,
// then mixes in audio blobs using Web Audio API.
// ============================================================
async function exportWithCanvasRecorder(clipPlan, ts, hasText, hasMusic, state, progressFill, progressText, onDone) {
  progressText.textContent = 'Se pregătește înregistrarea video...';
  progressFill.style.width = '10%';

  const canvas = document.getElementById('preview-canvas');
  const ctx = canvas.getContext('2d');

  // Setup MediaRecorder on canvas stream
  const stream = canvas.captureStream(30); // 30 fps
  
  // Create AudioContext to mix voiceover audio
  const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  const audioDest = audioCtx.createMediaStreamDestination();
  
  // Add audio track to stream so MediaRecorder captures both
  const audioTrack = audioDest.stream.getAudioTracks()[0];
  if (audioTrack) stream.addTrack(audioTrack);

  const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus') 
    ? 'video/webm;codecs=vp9,opus' 
    : 'video/webm';
  
  const recorder = new MediaRecorder(stream, { 
    mimeType, 
    videoBitsPerSecond: 4000000 // 4 Mbps
  });
  
  const chunks = [];
  recorder.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data); };
  
  return new Promise((resolve, reject) => {
    recorder.onstop = async () => {
      progressText.textContent = 'Se finalizează videoul...';
      progressFill.style.width = '95%';
      const blob = new Blob(chunks, { type: mimeType });
      audioCtx.close();
      onDone(blob);
      resolve();
    };

    recorder.onerror = (e) => {
      reject(new Error('Eroare MediaRecorder: ' + e.error));
    };

    recorder.start(100); // collect chunks every 100ms

    let clipIdx = 0;
    const video = document.createElement('video');
    video.muted = true;
    video.playsInline = true;
    video.crossOrigin = 'anonymous';
    let animFrame = null;

    function drawTextOnCanvas(sceneText) {
      if (!hasText || !ts) return;
      const displayText = sceneText || '';
      if (!displayText.trim()) return;
      
      ctx.font = `bold ${ts.size * 3}px ${ts.fontFamily}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      
      const maxWidth = canvas.width * 0.85;
      const lines = wrapText(ctx, displayText, maxWidth);
      const lineHeight = ts.size * 3 * 1.2;
      const startY = (canvas.height * ts.posY) - ((lines.length - 1) * lineHeight) / 2;
      
      lines.forEach((line, i) => {
        const ly = startY + i * lineHeight;
        if (ts.strokeWidth > 0) { 
          ctx.strokeStyle = ts.stroke; 
          ctx.lineWidth = ts.strokeWidth * 3; 
          ctx.lineJoin = 'round'; 
          ctx.strokeText(line, canvas.width * ts.posX, ly); 
        }
        ctx.fillStyle = ts.color;
        ctx.fillText(line, canvas.width * ts.posX, ly);
      });
    }

    async function playClip(idx) {
      if (idx >= clipPlan.length) {
        // All clips done, stop recording
        if (animFrame) cancelAnimationFrame(animFrame);
        setTimeout(() => recorder.stop(), 300); // small delay to flush
        return;
      }

      const clip = clipPlan[idx];
      const progress = Math.round(10 + (idx / clipPlan.length) * 80);
      progressFill.style.width = `${progress}%`;
      progressText.textContent = `Se înregistrează scena ${idx + 1}/${clipPlan.length}...`;

      // Play voiceover audio for this clip
      if (clip.audioBlob) {
        try {
          const arrayBuf = await clip.audioBlob.arrayBuffer();
          const audioBuf = await audioCtx.decodeAudioData(arrayBuf);
          const source = audioCtx.createBufferSource();
          source.buffer = audioBuf;
          source.connect(audioDest);
          source.start(0);
        } catch (audioErr) {
          console.warn('Audio decode err for clip', idx, audioErr);
        }
      }

      video.src = clip.videoUrl;
      video.currentTime = clip.startTime || 0;
      
      await new Promise((res) => {
        video.oncanplay = () => res();
        video.onerror = () => res(); // skip on error
      });
      
      video.play().catch(() => {});

      // Record this clip for its duration
      const clipDurationMs = clip.duration * 1000;
      const startTime = performance.now();

      function renderFrame() {
        if (video.readyState >= 2) {
          const vW = video.videoWidth;
          const vH = video.videoHeight;
          const cW = canvas.width;
          const cH = canvas.height;
          const scale = Math.max(cW / vW, cH / vH);
          const dW = vW * scale;
          const dH = vH * scale;
          const dx = (cW - dW) / 2;
          const dy = (cH - dH) / 2;
          ctx.drawImage(video, dx, dy, dW, dH);
        } else {
          ctx.fillStyle = '#111';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        }

        // Draw text/caption overlay
        drawTextOnCanvas(clip.sceneText);

        const elapsed = performance.now() - startTime;
        if (elapsed < clipDurationMs) {
          animFrame = requestAnimationFrame(renderFrame);
        } else {
          // Move to next clip
          video.pause();
          clipIdx++;
          playClip(clipIdx);
        }
      }

      animFrame = requestAnimationFrame(renderFrame);
    }

    // Start playback chain
    playClip(0);
  });
}
