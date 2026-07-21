import { fetchPexelsVideos } from './pexelsService.js';

// ====================================================================
// NIȘA: Luxury + Motivational Money — texte umane, naturale
// Un singur text pe tot videoclipul, fiecare linie cu propriul fundal
// ====================================================================

// Texte naturale, umane — nu sloganuri robotice
const HUMAN_MONEY_QUOTES = [
  {
    lines: [
      'Dacă tu nu muncești',
      'pentru viitorul tău,',
      'cine crezi că o face?'
    ],
    style: 'gold'
  },
  {
    lines: [
      'Șeful tău e bogat',
      'din cauza ta.'
    ],
    style: 'white'
  },
  {
    lines: [
      'Timpul pierdut cu',
      'persoane nepotrivite',
      'te costă financiar.'
    ],
    style: 'gold'
  },
  {
    lines: [
      'Nu ești sărac pentru că',
      'n-ai avut noroc.',
      'Ești sărac pentru că',
      'nu te-ai educat.'
    ],
    style: 'white'
  },
  {
    lines: [
      'Fiecare zi fără să',
      'înveți ceva nou',
      'e o zi lucrată pentru',
      'altcineva gratis.'
    ],
    style: 'gold'
  },
  {
    lines: [
      'Oamenii bogați citesc.',
      'Oamenii săraci',
      'se uită la televizor.'
    ],
    style: 'white'
  },
  {
    lines: [
      'Nu e vorba despre cât',
      'câștigi. E vorba despre',
      'cât rămâne la tine.'
    ],
    style: 'gold'
  },
  {
    lines: [
      'Dacă nu îți plătești',
      'educația azi,',
      'ignoranța te va costa',
      'mult mai mult mâine.'
    ],
    style: 'white'
  },
  {
    lines: [
      'Banii pe care îi',
      'cheltuiești pe lucruri',
      'inutile azi sunt libertatea',
      'pe care n-o ai mâine.'
    ],
    style: 'gold'
  },
  {
    lines: [
      'Cei mai mulți oameni',
      'știu prețul a orice',
      'și valoarea a nimic.'
    ],
    style: 'white'
  },
  {
    lines: [
      'Nu îți poți permite',
      'să nu investești.',
      'Inflația lucrează',
      'non-stop împotriva ta.'
    ],
    style: 'gold'
  },
  {
    lines: [
      'Obiceiurile de azi',
      'construiesc',
      'realitatea de mâine.'
    ],
    style: 'white'
  },
  {
    lines: [
      'Dacă nu ești dispus',
      'să riști nimic,',
      'trebuie să fii dispus',
      'să rămâi unde ești.'
    ],
    style: 'gold'
  },
  {
    lines: [
      'Salariul te ține în viață.',
      'Profitul te face liber.'
    ],
    style: 'white'
  },
  {
    lines: [
      'Munca grea fără',
      'direcție clară',
      'e un hamster pe roată.'
    ],
    style: 'gold'
  },
  {
    lines: [
      'Mediocritatea',
      'nu e confortabilă.',
      'E doar familiară.'
    ],
    style: 'white'
  },
  {
    lines: [
      'Dacă prietenii tăi',
      'nu vorbesc despre bani,',
      'schimbă prietenii.'
    ],
    style: 'gold'
  },
  {
    lines: [
      'Cel mai prost',
      'lucru pe care îl poți',
      'face cu banii',
      'e să nu faci nimic.'
    ],
    style: 'white'
  },
  {
    lines: [
      'Nu îți e frică să',
      'investești.',
      'Îți e frică să pierzi',
      'ce oricum nu creșe.'
    ],
    style: 'gold'
  },
  {
    lines: [
      'Bogăția se',
      'construiește în liniște.',
      'Sărăcia face gălăgie.'
    ],
    style: 'white'
  },
];

// Query-uri Pexels de fallback (dacă localul nu ajunge)
const PEXELS_LUXURY_QUERIES = [
  'luxury sports car night city',
  'luxury villa swimming pool sunset',
  'private jet interior luxury',
  'luxury yacht ocean',
  'luxury penthouse view city night',
  'expensive watch close up gold',
  'luxury hotel suite interior',
  'lamborghini ferrari driving road',
  'luxury lifestyle mansion',
  'rolex watch luxury',
];

/**
 * Generează un citat uman cu Groq AI sau din lista locală
 * Returnează { lines: string[], style: 'gold' | 'white' }
 */
export async function generateHumanQuote(groqApiKey) {
  if (groqApiKey) {
    try {
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${groqApiKey}`
        },
        body: JSON.stringify({
          model: 'llama3-8b-8192',
          messages: [{
            role: 'system',
            content: `Ești un creator de conținut viral pe TikTok și Instagram în România, specializat în mindset financiar autentic.
Scrie UN SINGUR gând/citat provocator în română, care să lovească direct în realitatea oamenilor despre bani, timp sau libertate.

REGULI STRICTE:
- Propoziția trebuie să aibă sens complet și să transmită o idee clară
- Sună ca o persoană reală care vorbește direct, NU ca un poster motivational generic
- Poate fi o întrebare retorică, o observație dură, o comparație sau o realitate incomodă
- 2-3 LINII scurte, maxim 7 cuvinte per linie
- Returnează STRICT JSON: {"lines": ["linie 1", "linie 2", "linie 3"]}
- FĂRĂ alte texte, fără explicații

EXEMPLE BUNE (inspiră-te din stil, nu copia):
{"lines": ["Șeful tău e bogat", "din cauza ta."]}
{"lines": ["Dacă nu muncești", "pentru visul tău,", "cineva te angajează", "pentru al lui."]}
{"lines": ["Salariul îți acoperă", "facturile.", "Investițiile îți acoperă", "viața."]}
{"lines": ["Oamenii cumpără lucruri", "de care nu au nevoie,", "cu bani pe care nu îi au."]}

EXEMPLE PROASTE (evită):
- "Investește în tine!" (prea vag)
- "Bogăția vine din muncă!" (clișeu gol)
- "Fii disciplinat!" (nu spune nimic concret)`
          }, {
            role: 'user',
            content: 'Generează un citat uman și provocator despre bani sau libertate financiară.'
          }],
          temperature: 0.92,
          max_tokens: 200
        })
      });

      if (res.ok) {
        const data = await res.json();
        let content = data.choices[0].message.content.trim();
        content = content.replace(/```json\s*/gi, '').replace(/```\s*/g, '');
        const match = content.match(/\{[\s\S]*\}/);
        if (match) {
          const parsed = JSON.parse(match[0]);
          if (parsed.lines && Array.isArray(parsed.lines) && parsed.lines.length >= 2) {
            return {
              lines: parsed.lines.map(l => l.trim()),
              style: Math.random() > 0.5 ? 'gold' : 'white'
            };
          }
        }
      }
    } catch (e) {
      console.warn('[AutoGen] Groq quote generation failed, using local:', e);
    }
  }

  // Fallback local — alege random
  return HUMAN_MONEY_QUOTES[Math.floor(Math.random() * HUMAN_MONEY_QUOTES.length)];
}

/**
 * Rulează întregul proces de generare automată
 */
export async function runFullAutoGeneration({ groqApiKey, pexelsApiKey, onProgress }) {
  const log = (msg, pct) => {
    console.log(`[AutoGen] ${msg}`);
    if (onProgress) onProgress(msg, pct);
  };

  // 1. Generăm un citat uman
  log('✍️ AI scrie un citat natural...', 5);
  const quote = await generateHumanQuote(groqApiKey);

  // 2. Încărcăm videoclipurile locale luxury
  log('🎬 Se încarcă videoclipuri locale...', 15);
  let localUrls = [];
  try {
    const res = await fetch('/assets-manifest.json');
    if (res.ok) {
      const data = await res.json();
      localUrls = data.videos['luxury'] || [];
    }
  } catch (e) {
    console.warn('[AutoGen] Nu s-a putut citi assets-manifest.json:', e);
  }

  // Shuffle local videos și ia 5 random
  const shuffledLocal = [...localUrls].sort(() => 0.5 - Math.random());
  const chosenLocal = shuffledLocal.slice(0, 5);

  // 3. Completăm cu Pexels dacă avem API key și avem nevoie
  const scenes = [];

  // Adăugăm videoclipurile locale
  for (let i = 0; i < chosenLocal.length; i++) {
    scenes.push({
      videoUrl: chosenLocal[i],
      videoName: chosenLocal[i].split('/').pop(),
      duration: 4.0,
      startTime: 0,
      isLocal: true,
    });
    log(`✅ Local video ${i + 1}/${chosenLocal.length} adăugat`, 15 + (i / chosenLocal.length) * 20);
  }

  // Dacă avem Pexels key, adăugăm 2-3 extra de pe Pexels
  if (pexelsApiKey && scenes.length < 8) {
    const queries = [...PEXELS_LUXURY_QUERIES].sort(() => 0.5 - Math.random()).slice(0, 2);
    for (let i = 0; i < queries.length; i++) {
      log(`🔍 Pexels: "${queries[i]}"`, 40 + (i / queries.length) * 15);
      try {
        const videos = await fetchPexelsVideos(queries[i], pexelsApiKey, 1);
        if (videos.length > 0) {
          scenes.push({
            videoUrl: videos[0].url,
            videoName: videos[0].name || queries[i],
            duration: 4.0,
            startTime: 0,
            isLocal: false,
          });
        }
      } catch (e) {
        console.warn(`[AutoGen] Pexels fetch failed for "${queries[i]}":`, e);
      }
    }
  }

  if (scenes.length === 0) {
    throw new Error('Nu s-au putut încărca videoclipuri. Verifică folderul local luxury.');
  }

  // Re-shuffle pentru varietate
  scenes.sort(() => 0.5 - Math.random());

  log(`✅ ${scenes.length} clipuri pregătite. Se exportă video...`, 58);

  // 4. Export video
  const blob = await exportAutoVideo(scenes, quote, (msg, pct) => log(msg, 58 + pct * 0.42));

  return {
    blob,
    prompt: quote.lines.join(' '),
    scenes,
    quote,
  };
}

// ====================================================================
// EXPORT VIDEO cu Canvas + MediaRecorder
// UN singur text pe tot videoclipul, fiecare linie cu propriul fundal
// ====================================================================
async function exportAutoVideo(scenes, quote, onProgress) {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    canvas.width = 1080;
    canvas.height = 1920;
    const ctx = canvas.getContext('2d');

    const stream = canvas.captureStream(30);
    const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
      ? 'video/webm;codecs=vp9'
      : 'video/webm';

    const recorder = new MediaRecorder(stream, {
      mimeType,
      videoBitsPerSecond: 5000000,
    });

    const chunks = [];
    recorder.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data); };
    recorder.onstop = () => resolve(new Blob(chunks, { type: mimeType }));
    recorder.onerror = e => reject(new Error('MediaRecorder: ' + e.error));
    recorder.start(100);

    const video = document.createElement('video');
    video.muted = true;
    video.playsInline = true;
    video.crossOrigin = 'anonymous';

    let animFrame = null;

    // ─── Desenăm textul: centrat, fără fundal, doar stroke pe litere ───
    function drawTextLines(lines, style) {
      const isGold = style === 'gold';
      const fontSize = 72;
      const fontFace = '900 ' + fontSize + 'px "Outfit", "Inter", sans-serif';

      ctx.font = fontFace;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      const lineHeight = fontSize * 1.5;
      const gap = 14;

      // ── Centrat perfect pe verticală (50%) ──
      const totalH = lines.length * lineHeight + (lines.length - 1) * gap;
      const startY = canvas.height * 0.50 - totalH / 2 + lineHeight / 2;

      lines.forEach((line, i) => {
        const lineY = startY + i * (lineHeight + gap);
        const cx = canvas.width / 2;

        ctx.font = fontFace;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // ── Stroke gros negru (contur/outline) ──
        ctx.lineJoin = 'round';
        ctx.lineWidth = 16;
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.92)';
        ctx.shadowColor = 'rgba(0,0,0,0.6)';
        ctx.shadowBlur = 18;
        ctx.shadowOffsetY = 4;
        ctx.strokeText(line, cx, lineY);

        // ── Fill text (auriu sau alb) ──
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;

        if (isGold) {
          const textW = ctx.measureText(line).width;
          const grad = ctx.createLinearGradient(
            cx - textW / 2, lineY - fontSize / 2,
            cx + textW / 2, lineY + fontSize / 2
          );
          grad.addColorStop(0,   '#FFE566');
          grad.addColorStop(0.4, '#FFFBE0');
          grad.addColorStop(1,   '#C8960A');
          ctx.fillStyle = grad;
        } else {
          ctx.fillStyle = '#FFFFFF';
        }

        ctx.fillText(line, cx, lineY);
      });
    }

    // pillRect removed — no background used

    // ─── Playback scenă ───
    async function playScene(idx) {
      if (idx >= scenes.length) {
        if (animFrame) cancelAnimationFrame(animFrame);
        setTimeout(() => recorder.stop(), 400);
        return;
      }

      const scene = scenes[idx];
      if (onProgress) onProgress(`Scenă ${idx + 1}/${scenes.length}...`, idx / scenes.length);

      video.src = scene.videoUrl;
      video.currentTime = 0;

      await new Promise(res => {
        video.oncanplay = () => res();
        video.onerror = () => res();
        setTimeout(res, 6000);
      });

      video.play().catch(() => {});

      const clipMs = scene.duration * 1000;
      const t0 = performance.now();

      function frame() {
        // ── Video (cover fit) ──
        if (video.readyState >= 2 && video.videoWidth > 0) {
          const vW = video.videoWidth;
          const vH = video.videoHeight;
          const cW = canvas.width;
          const cH = canvas.height;
          const scale = Math.max(cW / vW, cH / vH);
          const dW = vW * scale;
          const dH = vH * scale;
          ctx.drawImage(video, (cW - dW) / 2, (cH - dH) / 2, dW, dH);
        } else {
          ctx.fillStyle = '#080810';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        }

        // ── Fără vignette — textul e centrat, nu jos ──

        // ── Text ──
        drawTextLines(quote.lines, quote.style);

        const elapsed = performance.now() - t0;
        if (elapsed < clipMs) {
          animFrame = requestAnimationFrame(frame);
        } else {
          video.pause();
          playScene(idx + 1);
        }
      }

      animFrame = requestAnimationFrame(frame);
    }

    playScene(0);
  });
}
