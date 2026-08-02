import { fetchPexelsVideos } from './pexelsService.js';

// ====================================================================
// NIȘA: Luxury + Motivational Money — texte umane, naturale
// Un singur text pe tot videoclipul, fiecare linie cu propriul fundal
// ====================================================================

// Citate financiare agresive — adevăruri brutale despre bani (CU DIACRITICE) pe 4 linii
const HUMAN_MONEY_QUOTES = [
  {
    lines: [
      'Ai ultimul model de iPhone',
      'Dar intri în panică instant',
      'Dacă întârzie salariul 3 zile',
      'Asta nu e viață de bogat'
    ],
    style: 'white'
  },
  {
    lines: [
      'Banca râde de tine',
      'De fiecare dată când',
      'Folosești cardul de credit',
      'Pentru a părea bogat'
    ],
    style: 'white'
  },
  {
    lines: [
      'Hainele de la branduri scumpe',
      'Nu vor putea ascunde niciodată',
      'Faptul că ești plin de datorii',
      'Și contul tău este pe zero'
    ],
    style: 'white'
  },
  {
    lines: [
      'Muncești 40 de ore pe săptămână',
      'Doar pentru visul șefului tău',
      'Pentru tine câte ore muncești',
      'Ca să fii cu adevărat liber'
    ],
    style: 'white'
  },
  {
    lines: [
      'Ai 3 abonamente la streaming',
      'Dar nu ai citit nicio carte',
      'Despre educație financiară anul ăsta',
      'Timpul tău este irosit'
    ],
    style: 'white'
  },
  {
    lines: [
      'Mașina cumpărată în rate',
      'Te face să pari bogat azi',
      'Dar te ține sărac mâine',
      'Este o iluzie financiară'
    ],
    style: 'white'
  },
  {
    lines: [
      'Dacă investeai cât ai băut',
      'În ultimele tale weekenduri',
      'Azi erai un om complet liber',
      'Alegerile tale te definesc'
    ],
    style: 'white'
  },
  {
    lines: [
      'Sărăcia este un obicei învățat',
      'Bogăția se construiește treptat',
      'Fiecare zi este o alegere',
      'Tu ce alegi astăzi'
    ],
    style: 'white'
  },
  {
    lines: [
      'Datoriile pe care le acumulezi',
      'Sunt profitul celor deștepți',
      'Care știu regulile jocului',
      'Învață să joci corect'
    ],
    style: 'white'
  },
  {
    lines: [
      'Un singur venit lunar',
      'Înseamnă că ești la un pas',
      'Distanță de un dezastru total',
      'Creează noi surse de bani'
    ],
    style: 'white'
  }
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

// ====================================================================
// SISTEM CITATE UNICE — istoric complet persistent (localStorage), doar Groq
// ====================================================================

const HISTORY_KEY = 'clipstudio_used_quotes';

/** Încarcă istoricul complet din localStorage */
function _loadHistory() {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
  } catch {
    return [];
  }
}

/** Salvează istoricul în localStorage */
function _saveHistory(history) {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  } catch { /* localStorage plin — ignorăm */ }
}

/** Adaugă un citat în istoric și salvează */
function _addToHistory(quoteText) {
  const history = _loadHistory();
  if (!history.includes(quoteText)) {
    history.push(quoteText);
    _saveHistory(history);
  }
}

/** Verifică dacă un citat e deja în istoric (comparație normalizată) */
function _isInHistory(lines) {
  const text = lines.join(' ').toLowerCase().trim();
  return _loadHistory().some(h => h.toLowerCase().trim() === text);
}

/** Returnează istoricul formatat pentru promptul Groq */
function _buildHistoryBlock() {
  const history = _loadHistory();
  if (history.length === 0) return '';
  return `\n\nISTORIC CITATE DEJA FOLOSITE — INTERZIS să repeți sau să semeni cu vreunul:\n${history.map((q, i) => `${i + 1}. "${q}"`).join('\n')}`;
}

/**
 * Corectează automat greșelile de diacritice comune din output-ul AI.
 * Folosim doar înlocuiri sigure, fără false positive.
 */
function fixDiacritics(text) {
  const fixes = {
    'seful': 'șeful', 'sef': 'șef', 'sefa': 'șefa',
    'stiu': 'știu', 'stie': 'știe', 'stii': 'știi', 'stiut': 'știut',
    'gresit': 'greșit', 'greseala': 'greșeală', 'greseli': 'greșeli',
    'platesti': 'plătești', 'plateste': 'plătește', 'platit': 'plătit',
    'cheltuiesti': 'cheltuiești', 'cheltuieste': 'cheltuiește',
    'investesti': 'investești', 'investeste': 'investește',
    'castigi': 'câștigi', 'castig': 'câștig',
    'castiga': 'câștigă', 'castigat': 'câștigat',
    'datorita': 'datorită', 'fara': 'fără', 'pana': 'până',
    'macar': 'măcar', 'trebuie': 'trebuie',
    'muncesti': 'muncești', 'munceste': 'muncește',
    'vorbesti': 'vorbești', 'vorbeste': 'vorbește',
    'cresti': 'crești', 'creste': 'crește',
    'reusesti': 'reușești', 'reuseste': 'reușește',
    'ramai': 'rămâi', 'ramane': 'rămâne', 'raman': 'rămân',
    'ajungi': 'ajungi',
    'sarac': 'sărac', 'saraci': 'săraci', 'saracia': 'sărăcia',
    'bogat': 'bogat', 'bogatie': 'bogăție',
    'libertate': 'libertate',
    'sansa': 'șansă', 'sanse': 'șanse',
    'schimbare': 'schimbare', 'timp': 'timp',
  };

  let result = text;
  for (const [wrong, correct] of Object.entries(fixes)) {
    const regex = new RegExp(`\\b${wrong}\\b`, 'gi');
    result = result.replace(regex, (match) => {
      if (match[0] === match[0].toUpperCase() && match[0] !== match[0].toLowerCase()) {
        return correct.charAt(0).toUpperCase() + correct.slice(1);
      }
      return correct;
    });
  }
  return result;
}

/**
 * Generează un citat 100% unic cu Groq AI.
 * Menține un istoric complet persistent în localStorage.
 * Face până la 3 retry-uri cu instrucțiuni mai stricte dacă primește duplicate.
 * Returnează { lines: string[], style: 'gold' | 'white' }
 */
export async function generateHumanQuote(cfAccountId, cfApiToken) {
  if (!cfAccountId || !cfApiToken) {
    throw new Error('Cloudflare API Token sau Account ID lipsă. Adaugă-le în sidebar pentru citate AI unice.');
  }

  const historyBlock = _buildHistoryBlock();
  const historyCount = _loadHistory().length;
  const MAX_RETRIES = 3;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    const urgency = attempt === 1
      ? 'Generează acum 1 text unic respectând strict formatul JSON.'
      : attempt === 2
        ? 'ATENȚIE: Ultimul text generat a fost deja folosit. Încearcă o idee nouă, o altă nuanță.'
        : 'ULTIMUL AVERTISMENT: Generează un text COMPLET NOU. Folosește alt unghi de abordare.';

    try {
      const prompt = `Ești un creator de conținut specializat pe educație financiară, psihologie de consum și „reality-check-uri” dure pentru rețelele sociale (Reels / TikTok / Shorts).

Misiunea ta este să generezi un obiect JSON cu proprietatea "lines" care conține EXACT 4 linii scurte.

REGULI STRICTE DE TON ȘI STIL:
1. Tonul: Direct, provocator, dur, fără ocolișuri („hard truth”). Adresează-te la persoana a II-a („tu”).
2. Structura ideilor (cele 4 linii):
   - Linia 1: Cârligul / Observația (prezentarea unei acțiuni sau stări greșite).
   - Linia 2: Continuarea ideii / Contrastul.
   - Linia 3: Consecința sau adevărul dur.
   - Linia 4: Învățătura / Îndemnul la acțiune.
3. LOGICĂ ȘI GRAMATICĂ (CRITIC): Cele 4 linii, citite una după alta, TREBUIE să formeze o frază cu sens perfect, cursivă și gramatical corectă. Nu lăsa idei neterminate.
4. Lungime: Linii scurte, ușor de citit pe ecranul telefonului (3-6 cuvinte pe linie).
5. Subiecte de abordat (variază-le!): credite, cheltuieli impulsive, mentalitate de victimă, muncă pentru visul altora, teama de investiții, capcana confortului, iluzia statutului social, inflație vs. economii, dependența de salariu.
6. REGULĂ DE UNICITATE ABSOLUTĂ: NU copia textele din exemple. Inventează MEREU unghiuri, idei, obiecte sau concepte noi. Fără texte care seamănă între ele. Fără platitudini.
7. Output: Generează EXCLUSIV cod JSON valid (fără introduceri sau explicații).

EXEMPLE DE REFERINȚĂ PENTRU STIL ȘI FORMAT:
{"lines": ["Ai ultimul model de iPhone", "Dar intri în panică instant", "Dacă întârzie salariul 3 zile", "Asta nu e viață de bogat"]}
{"lines": ["Hainele de la branduri scumpe", "Nu vor ascunde niciodată", "Faptul că ești plin de datorii", "Și contul tău este pe zero"]}
{"lines": ["Dacă investeai cât ai băut", "În ultimele tale weekenduri", "Azi erai un om complet liber", "Alegerile tale te definesc pe tine"]}
{"lines": ["Banca râde mereu de tine", "De fiecare dată când folosești", "Acel card de credit pentru ieșiri", "Banii tăi se evaporă rapid"]}
{"lines": ["Muncești 40 de ore săptămânal", "Pentru a construi visul șefului", "Dar pentru visul tău", "Câte ore dedici în fiecare zi?"]}
{"lines": ["Mașina luată în rate", "Te face să pari bogat", "Dar te ține sclavul băncii", "Cumpără active, nu obligații"]}
{"lines": ["Prietenii cu care spargi banii", "În serile lungi de vineri", "Nu vor plăti ei niciodată", "Facturile tale de luna viitoare"]}
{"lines": ["Te plângi că nu ai bani", "Dar stai pe rețele sociale", "Peste patru ore pe zi", "Timpul tău este de fapt aruncat"]}
{"lines": ["Sărăcia se învață de mic", "Bogăția se construiește cu efort", "Tu ce alegi să faci", "În fiecare dimineață când te trezești?"]}
{"lines": ["Nu este greu să faci bani", "Adevărata provocare este", "Să nu îi cheltui pe prostii", "În secunda doi după salariu"]}
{"lines": ["Datoriile pe care le ai", "Sunt profitul curat al celor", "Care înțeleg jocul banilor", "Învață să joci și tu"]}
{"lines": ["Fiecare leu dat pe cafele", "Este un leu furat direct", "De la libertatea ta financiară", "Investește inteligent astăzi"]}
{"lines": ["Dacă nu produci bani", "În timp ce ești la somn", "Vei munci pentru totdeauna", "Până în ultima ta zi"]}
{"lines": ["Abonamentele tale lunare", "Te țin într-un cerc vicios", "Lipsa de economii reale", "Asta înseamnă viața de sărac"]}
{"lines": ["Vrei să pari bogat rapid", "Dar bogăția reală este mută", "Doar sărăcia este gălăgioasă", "Alege să fii bogat în secret"]}
{"lines": ["Educația financiară reală", "Nu se învață niciodată la școală", "Se învață când rămâi fără bani", "Și ești forțat să te adaptezi"]}
{"lines": ["Cumperi lucruri de care nu ai nevoie", "Cu bani pe care nu îi ai", "Pentru a impresiona oameni", "Cărora nu le pasă de tine"]}
{"lines": ["Dacă salariul este singura", "Ta sursă de venit lunar", "Ești la un singur pas", "De o prăbușire financiară totală"]}
{"lines": ["Investițiile par foarte riscante", "Pentru cei care nu le înțeleg", "Dar să trăiești de la lună la lună", "Este cel mai mare risc posibil"]}
{"lines": ["Confortul este cel mai mare", "Inamic al succesului tău financiar", "Ieși din zona de confort", "Și începe să construiești un imperiu"]}
{"lines": ["Ești obosit să tot muncești", "Dar nu ești suficient de obosit", "Încât să îți schimbi viața", "Schimbarea începe din mintea ta"]}
{"lines": ["Să economisești este bine", "Să investești este esențial", "Inflația îți mănâncă toți banii", "Fă banii să muncească pentru tine"]}
{"lines": ["Te gândești ce să mai cumperi", "În loc să te gândești ce să vinzi", "Aceasta este diferența uriașă", "Dintre un sărac și un bogat"]}
{"lines": ["Timpul tău este mai valoros", "Decât orice sumă de bani", "Banii se pot face la loc", "Timpul pierdut este dus pentru totdeauna"]}
{"lines": ["Dacă îți asculți prietenii săraci", "Când îți dau sfaturi financiare", "Vei ajunge exact ca ei", "Fără niciun ban în buzunar"]}
{"lines": ["O minte săracă va găsi mereu", "Motive pentru a cheltui banii", "O minte bogată va găsi mereu", "Oportunități de a îi investi"]}
{"lines": ["Te plângi mereu de ghinion", "Dar norocul adevărat se face", "Prin disciplină și multă muncă", "Nu din scuze zilnice"]}
{"lines": ["Dacă te oprești din învățat", "După ce termini școala", "Ești condamnat la mediocritate", "Succesul cere educație continuă"]}
{"lines": ["Scuzele tale nu produc bani", "Plângerile tale nu plătesc facturi", "Doar acțiunea zilnică și efortul", "Îți pot schimba viața cu adevărat"]}
{"lines": ["Cei din jur te vor critica", "Când încerci să scapi din sărăcie", "Lasă-i să vorbească", "În timp ce tu construiești succesul"]}

ISTORIC (Texte deja folosite, Nu genera texte identice cu acestea):
${historyBlock}

Comandă:
${urgency}`;

      const res = await fetch(`/cf-api/client/v4/accounts/${cfAccountId}/ai/run/@cf/meta/llama-3.1-8b-instruct`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${cfApiToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          messages: [
            { role: 'system', content: prompt }
          ]
        })
      });

      const rawText = await res.text();
      let data;
      try {
        data = JSON.parse(rawText);
      } catch (err) {
        if (rawText.trim().startsWith('<')) {
          throw new Error('Eroare rețea: proxy-ul nu funcționează. Asigură-te că rulezi aplicația cu "npm run dev" și nu din Live Server, pentru ca proxy-ul Cloudflare din Vite să fie activ.');
        }
        throw new Error('Eroare parsare răspuns Cloudflare: ' + err.message);
      }

      if (!res.ok || !data.success) {
        throw new Error(data.errors?.[0]?.message || 'Eroare conectare Cloudflare API');
      }

      let textJSON = data.result?.response || data.result;
      
      if (typeof textJSON !== 'string') {
        console.warn(`[AutoGen] Cloudflare a returnat un obiect:`, data.result);
        textJSON = JSON.stringify(textJSON);
      }

      textJSON = textJSON.replace(/```json\s*/gi, '').replace(/```\s*/g, '');
      const match = textJSON.match(/\{[\s\S]*\}/);
      if (match) textJSON = match[0];
      
      let parsed;
      try {
        parsed = JSON.parse(textJSON);
      } catch (err) {
        console.warn(`[AutoGen] Attempt ${attempt}: Gemini nu a returnat JSON valid.`);
        continue;
      }

      if (!parsed.lines || !Array.isArray(parsed.lines) || parsed.lines.length < 2) {
        console.warn(`[AutoGen] Attempt ${attempt}: JSON invalid (lines lipsă).`);
        continue;
      }

      const lines = parsed.lines.map(l => l.trim()).filter(Boolean);

      // Validare structurală
      if (lines.length < 2) {
        console.warn(`[AutoGen] Attempt ${attempt}: Prea puține linii (${lines.length}).`);
        continue;
      }

      // Corecție automată diacritice frecvent lipsă
      const fixedLines = lines.map(fixDiacritics);

      // Verificăm împotriva istoricului complet din localStorage
      if (_isInHistory(fixedLines)) {
        console.warn(`[AutoGen] Attempt ${attempt}: Duplicat detectat în istoric — retry...`);
        continue;
      }

      // ✅ Citat valid și unic — salvăm în istoricul permanent
      const quoteText = fixedLines.join(' ');
      _addToHistory(quoteText);
      console.log(`[AutoGen] ✅ Citat unic #${historyCount + 1}: "${quoteText}"`);

      return {
        lines: fixedLines,
        style: 'white'
      };

    } catch (e) {
      if (attempt === MAX_RETRIES) throw e;
      console.warn(`[AutoGen] Attempt ${attempt} eroare:`, e.message);
      await new Promise(r => setTimeout(r, 1000));
    }
  }

  throw new Error('Nu s-a putut genera un text unic după 3 încercări. Verifică setările Cloudflare API.');
}

/**
 * Rulează întregul proces de generare automată
 */
export async function runFullAutoGeneration({ cfAccountId, cfApiToken, pexelsApiKey, onProgress }) {
  const log = (msg, pct) => {
    console.log(`[AutoGen] ${msg}`);
    if (onProgress) onProgress(msg, pct);
  };

  // 1. Generăm un citat uman
  log('✍️ AI scrie un citat natural...', 5);
  const quote = await generateHumanQuote(cfAccountId, cfApiToken);

  // 2. Încărcăm videoclipurile locale luxury
  log('🎬 Se încarcă videoclipuri locale...', 15);
  let localUrls = [];
  try {
    const res = await fetch('/assets-manifest.json');
    if (res.ok) {
      const text = await res.text();
      if (!text.trim().startsWith('<')) {
        const data = JSON.parse(text);
        localUrls = data.videos['luxury'] || [];
      }
    }
  } catch (e) {
    console.warn('[AutoGen] Nu s-a putut citi assets-manifest.json:', e);
  }

  // Shuffle local videos pentru varietate
  const shuffledLocal = [...localUrls].sort(() => 0.5 - Math.random());

  // 3. Alegem UN SINGUR videoclip de maxim 6 secunde
  const scenes = [];
  let usedPexels = false;

  if (pexelsApiKey && Math.random() < 0.7) {
    const query = PEXELS_LUXURY_QUERIES[Math.floor(Math.random() * PEXELS_LUXURY_QUERIES.length)];
    log(`🔍 Pexels: caut clip pentru "${query}"`, 30);
    try {
      const videos = await fetchPexelsVideos(query, pexelsApiKey, 1);
      if (videos.length > 0) {
        scenes.push({
          videoUrl: videos[0].url,
          videoName: videos[0].name || query,
          duration: 6.0,
          startTime: 0,
          isLocal: false,
        });
        usedPexels = true;
        log(`✅ Pexels video adăugat`, 45);
      }
    } catch (e) {
      console.warn(`[AutoGen] Pexels fetch failed for "${query}":`, e);
    }
  }

  // Dacă nu am folosit Pexels (sau a dat fail), luăm 1 clip local
  if (!usedPexels && shuffledLocal.length > 0) {
    scenes.push({
      videoUrl: shuffledLocal[0],
      videoName: shuffledLocal[0].split('/').pop(),
      duration: 6.0,
      startTime: 0,
      isLocal: true,
    });
    log(`✅ Local video adăugat`, 45);
  }

  if (scenes.length === 0) {
    throw new Error('Nu s-au putut încărca videoclipuri. Verifică folderul local luxury sau API Key-ul Pexels.');
  }

  log(`✅ 1 clip pregătit (6 secunde). Se exportă video...`, 58);

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
    let mimeType = 'video/webm';
    if (MediaRecorder.isTypeSupported('video/webm;codecs=h264')) {
      mimeType = 'video/webm;codecs=h264';
    } else if (MediaRecorder.isTypeSupported('video/webm;codecs=vp9')) {
      mimeType = 'video/webm;codecs=vp9';
    }

    const recorder = new MediaRecorder(stream, {
      mimeType,
      videoBitsPerSecond: 5000000,
    });

    const chunks = [];
    recorder.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data); };
    recorder.onstop = async () => {
      const webmBlob = new Blob(chunks, { type: mimeType });
      try {
        if (onProgress) onProgress('Se convertește în MP4 (TikTok Format)...', 95);
        const { loadFFmpeg, writeFileToFFmpeg, execFFmpeg, readFileFromFFmpeg, deleteFileFromFFmpeg } = await import('./ffmpegService.js');
        await loadFFmpeg();
        await writeFileToFFmpeg('temp.webm', webmBlob);
        
        let ffmpegArgs = ['-i', 'temp.webm', '-c:v', 'libx264', '-preset', 'ultrafast', '-crf', '28', '-c:a', 'aac', '-b:a', '128k', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', 'output.mp4'];
        
        // Dacă browserul a înregistrat cu h264, copiem direct frame-urile (DUREAZĂ < 1 SECUNDĂ)
        if (mimeType.includes('h264')) {
           ffmpegArgs = ['-i', 'temp.webm', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '128k', '-movflags', '+faststart', 'output.mp4'];
        }

        await execFFmpeg(ffmpegArgs);
        const mp4Data = await readFileFromFFmpeg('output.mp4');
        const mp4Blob = new Blob([mp4Data.buffer], { type: 'video/mp4' });
        await deleteFileFromFFmpeg('temp.webm').catch(()=>{});
        await deleteFileFromFFmpeg('output.mp4').catch(()=>{});
        resolve(mp4Blob);
      } catch (err) {
        console.error('Eroare conversie MP4, se păstrează webm:', err);
        resolve(webmBlob);
      }
    };
    recorder.onerror = e => reject(new Error('MediaRecorder: ' + e.error));
    recorder.start(100);

    const video = document.createElement('video');
    video.muted = true;
    video.playsInline = true;
    video.crossOrigin = 'anonymous';

    let animFrame = null;

    // ─── Word-wrap: sparge o linie în mai multe dacă depășește maxWidth ───
    function wrapLine(text, maxWidth, font) {
      ctx.font = font;
      const words = text.split(' ');
      const result = [];
      let current = '';
      for (const word of words) {
        const test = current ? current + ' ' + word : word;
        if (ctx.measureText(test).width <= maxWidth) {
          current = test;
        } else {
          if (current) result.push(current);
          current = word;
        }
      }
      if (current) result.push(current);
      return result.length > 0 ? result : [text];
    }

    // ─── Calculează font size optim ───
    function calcFontSize(wrappedLines, maxWidth) {
      let size = 48;
      const minSize = 40;
      while (size >= minSize) {
        const font = `900 ${size}px "Outfit", "Inter", sans-serif`;
        ctx.font = font;
        const fits = wrappedLines.every(l => ctx.measureText(l).width <= maxWidth);
        if (fits) return size;
        size -= 2;
      }
      return minSize;
    }

    // ─── Desenăm textul: centrat ───
    function drawTextLines(lines) {
      const PAD = 90; // padding lateral
      const maxWidth = canvas.width - PAD * 2;

      // 1. Wrap fiecare linie în sub-linii dacă e prea lungă
      const tempFont = '900 48px "Outfit", "Inter", sans-serif';
      const wrappedLines = lines.flatMap(l => wrapLine(l, maxWidth, tempFont));

      // 2. Calculăm font size-ul optim
      const fontSize = calcFontSize(wrappedLines, maxWidth);
      const fontFace = `900 ${fontSize}px "Outfit", "Inter", sans-serif`;
      const lineHeight = fontSize * 1.45;
      const gap = Math.max(8, fontSize * 0.18);

      // 3. Centrat perfect pe verticală (50%)
      const totalH = wrappedLines.length * lineHeight + (wrappedLines.length - 1) * gap;
      const startY = canvas.height * 0.50 - totalH / 2 + lineHeight / 2;
      const cx = canvas.width / 2;

      ctx.textBaseline = 'middle';
      ctx.textAlign = 'center';

      wrappedLines.forEach((line, i) => {
        const lineY = startY + i * (lineHeight + gap);

        ctx.font = fontFace;
        ctx.textBaseline = 'middle';
        ctx.textAlign = 'center';

        // ── Stroke negru gros (contur) ──
        ctx.lineJoin = 'round';
        ctx.lineWidth = Math.max(10, fontSize * 0.22);
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.92)';
        ctx.shadowColor = 'rgba(0,0,0,0.6)';
        ctx.shadowBlur = 18;
        ctx.shadowOffsetY = 4;
        ctx.strokeText(line, cx, lineY);

        // ── Fill text (alb pur) ──
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#FFFFFF';
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

        // ── Filtru negru semi-transparent (Dark Overlay) ──
        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)'; // Ajustat la 0.6 pt un contrast mai bun (vezi screenshot-uri)
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // ── Text ──
        drawTextLines(quote.lines);

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
