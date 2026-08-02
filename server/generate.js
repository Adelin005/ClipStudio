// ============================================================
// generate.js — Script 100% GRATUIT pentru GitHub Actions
// Stochează starea în state.json și o dă commit pe repo
// ============================================================
const fs = require('fs');
const path = require('path');
const os = require('os');
const fetch = require('node-fetch');
const FormData = require('form-data');
const { spawn } = require('child_process');
const ffmpegPath = require('ffmpeg-static');
const https = require('https');
const http = require('http');

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const GROQ_API_KEY = process.env.GROQ_API_KEY;
const PEXELS_API_KEY = process.env.PEXELS_API_KEY;

if (!BOT_TOKEN) {
    console.error('Lipsește TELEGRAM_BOT_TOKEN.');
    process.exit(1);
}

const STATE_FILE = path.join(__dirname, 'state.json');

// ── Incarcă Starea ──────────────────────────────────────────
let state = { lastUpdateId: 0, chats: {} };
if (fs.existsSync(STATE_FILE)) {
    try {
        state = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
    } catch (e) {
        console.warn('Eroare la citirea state.json, se resetează.');
    }
}

// ── Telegram API Helpers ─────────────────────────────────────
async function getUpdates() {
    const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getUpdates?offset=${state.lastUpdateId + 1}`);
    const data = await res.json();
    return data.result || [];
}

async function sendMessage(chatId, text) {
    const keyboard = [
        [{ text: '⚡ 5min auto generate' }, { text: '🕒 30min auto generate' }],
        [{ text: '🛑 stop auto' }]
    ];

    await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            chat_id: chatId,
            text: text,
            parse_mode: 'Markdown',
            reply_markup: {
                keyboard: keyboard,
                resize_keyboard: true
            }
        })
    });
}

async function sendVideo(chatId, videoPath, caption) {
    const stat = fs.statSync(videoPath);
    if (stat.size > 50 * 1024 * 1024) {
        await sendMessage(chatId, `🎬 **Video Generat**\n\n💬 _"${caption}"_\n\n⚠️ Video prea mare (>50MB).`);
        return;
    }

    const form = new FormData();
    form.append('chat_id', String(chatId));
    form.append('video', fs.createReadStream(videoPath), { filename: 'luxury_clip.mp4' });
    form.append('caption', `🎬 **Video Luxury Generat!**\n\n💬 _"${caption}"_\n\n💾 ${(stat.size / 1048576).toFixed(1)} MB`);
    form.append('parse_mode', 'Markdown');

    await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendVideo`, {
        method: 'POST',
        body: form
    });
}

// ── Generator ───────────────────────────────────────────────
async function fetchQuote() {
    const fallback = { lines: ['Oamenii cumpără lucruri', 'de care nu au nevoie,', 'cu bani pe care nu îi au.'], style: 'white' };
    if (!GROQ_API_KEY) return fallback;

    try {
        const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json', 
                'Authorization': `Bearer ${GROQ_API_KEY}`
            },
            body: JSON.stringify({
                model: 'llama-3.3-70b-versatile',
                messages: [{
                    role: 'system',
                    content: `Ești un copywriter viral. Scrie UN SINGUR mesaj scurt în română, cu un adevăr brutal despre bani.
Aici ai exemple EXACTE de ton, format și atitudine. Folosește STRICT același stil (3 linii scurte, ironie, duritate).
Ex 1: {"lines": ["Ai ultimul iPhone,", "dar intri în panică", "dacă întârzie salariul 3 zile."]}
Ex 2: {"lines": ["Mașina în rate", "te face să pari bogat.", "Dar te ține sărac."]}
Ex 3: {"lines": ["Te vaiți că nu ai bani,", "dar stai pe TikTok", "4 ore pe zi."]}
Ex 4: {"lines": ["Dacă investeai cât ai băut", "în ultimii 5 ani,", "azi erai liber."]}
Ex 5: {"lines": ["Hainele de firmă", "nu ascund faptul că", "contul tău e pe zero."]}
Ex 6: {"lines": ["Muncești 40 de ore pe săptămână", "pentru visul șefului tău.", "Pentru tine câte ore muncești?"]}

REGULI CRITICE:
- MAXIM 3 linii.
- MAXIM 7 cuvinte pe linie.
- Doar diacritice corecte.
- FĂRĂ metafore gen "arma" sau "jug". Fii concret (haine, card, rate).
- Returnează STRICT JSON valid de forma: {"lines": ["l1", "l2", "l3"]}`
                }, { role: 'user', content: 'Citat brutal și original despre educație financiară, care nu e în lista de exemple.' }],
                temperature: 0.9, max_tokens: 150
            })
        });
        const data = await res.json();
        const messageContent = data.choices?.[0]?.message?.content;
        if (!messageContent) return fallback;
        const match = messageContent.match(/\{[\s\S]*\}/);
        if (match) {
            const parsed = JSON.parse(match[0]);
            if (parsed.lines?.length) return { lines: parsed.lines, style: Math.random() > 0.5 ? 'gold' : 'white' };
        }
    } catch (e) {}
    return fallback;
}

async function fetchVideo() {
    const fallbackUrl = 'https://videos.pexels.com/video-files/857032/857032-sd_640_360_30fps.mp4';
    try {
        const queries = ['luxury sports car night city', 'luxury villa pool', 'private jet interior', 'luxury penthouse'];
        const q = queries[Math.floor(Math.random() * queries.length)];
        const res = await fetch(`https://api.pexels.com/videos/search?query=${encodeURIComponent(q)}&orientation=portrait&per_page=15`, { headers: { Authorization: PEXELS_API_KEY } });
        if (!res.ok) return fallbackUrl;
        const data = await res.json();
        const v = data.videos?.sort(() => Math.random() - 0.5)[0];
        const file = v?.video_files?.find(f => f.quality === 'sd' && f.width < f.height) || v?.video_files?.[0];
        return file?.link || fallbackUrl;
    } catch (e) {
        return fallbackUrl;
    }
}

function download(url, dest) {
    return new Promise((res, rej) => {
        const file = fs.createWriteStream(dest);
        (url.startsWith('https') ? https : http).get(url, response => {
            if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
                file.close(); fs.unlink(dest, () => {}); return download(response.headers.location, dest).then(res).catch(rej);
            }
            response.pipe(file);
            file.on('finish', () => file.close(res));
        }).on('error', err => { fs.unlink(dest, () => {}); rej(err); });
    });
}

const FONT_PATH = path.join(os.tmpdir(), 'Roboto-Bold.ttf');
async function ensureFont() {
    if (!fs.existsSync(FONT_PATH)) {
        await download('https://github.com/google/fonts/raw/main/ofl/roboto/Roboto-Bold.ttf', FONT_PATH);
    }
}

function runFFmpeg(inputPath, outputPath, quote) {
    return new Promise((resolve, reject) => {
        const { lines, style } = quote;
        const fontColor = style === 'gold' ? '0xFFE566' : 'white';
        const fontSize = 65; const lineH = Math.round(fontSize * 1.5); const gap = 16;
        const startY = Math.round(1920 / 2 - (lines.length * lineH + (lines.length - 1) * gap) / 2 + lineH / 2);
        
        const escFF = t => t.replace(/\\/g, '\\\\').replace(/'/g, '\u2019').replace(/:/g, '\\:').replace(/,/g, '\\,').replace(/\[/g, '\\[').replace(/\]/g, '\\]');
        const safeFontPath = FONT_PATH.replace(/\\/g, '/').replace(/:/g, '\\:');
        const vf = ['scale=1080:1920:force_original_aspect_ratio=increase', 'crop=1080:1920:0:0', ...lines.map((l, i) => `drawtext=fontfile='${safeFontPath}':text='${escFF(l)}':fontsize=${fontSize}:fontcolor=${fontColor}:x=(w-tw)/2:y=${startY + i * (lineH + gap)}:borderw=13:bordercolor=black@0.93:shadowx=2:shadowy=3`)].join(',');

        const args = ['-y', '-i', inputPath, '-t', '20', '-vf', vf, '-c:v', 'libx264', '-preset', 'fast', '-crf', '26', '-pix_fmt', 'yuv420p', '-an', '-movflags', '+faststart', outputPath];
        
        const proc = spawn(ffmpegPath, args);
        let errLog = '';
        if (proc.stderr) proc.stderr.on('data', d => errLog += d.toString());
        proc.on('close', code => code === 0 ? resolve() : reject(new Error('FFmpeg error ' + code + ' - ' + errLog)));
    });
}

// ── Main Loop ───────────────────────────────────────────────
async function main() {
    console.log('Verific mesaje noi din Telegram...');
    const updates = await getUpdates();
    
    for (const u of updates) {
        state.lastUpdateId = u.update_id;
        if (!u.message || !u.message.text) continue;

        const text = u.message.text;
        const chatId = u.message.chat.id;

        if (!state.chats[chatId]) state.chats[chatId] = { isRunning: false, lastGenMs: 0, intervalMs: 30 * 60 * 1000 };

        if (text.includes('5min') || text.includes('5 minute')) {
            state.chats[chatId].isRunning = true;
            state.chats[chatId].intervalMs = 5 * 60 * 1000;
            await sendMessage(chatId, '⚡ **Auto Mode PORNIT!**\nVoi genera clipuri o dată la 5 minute.');
        } else if (text.includes('30min') || text.includes('30 minute') || text.includes('/start') || text.includes('Pornește')) {
            state.chats[chatId].isRunning = true;
            state.chats[chatId].intervalMs = 30 * 60 * 1000;
            await sendMessage(chatId, '🕒 **Auto Mode PORNIT!**\nVoi genera clipuri o dată la 30 minute.');
        } else if (text.includes('stop') || text.includes('/stop') || text.includes('Oprește')) {
            state.chats[chatId].isRunning = false;
            await sendMessage(chatId, '🛑 **Auto Mode OPRIT!**\nNu voi mai trimite clipuri automat.');
        } else {
            await sendMessage(chatId, 'Alege o opțiune de mai jos pentru a controla frecvența clipurilor:');
        }
    }

    // Salvăm state.json cu noile comenzi
    fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));

    // Generăm pentru toate chat-urile active
    for (const [chatIdStr, chatState] of Object.entries(state.chats)) {
        if (!chatState.isRunning) continue;

        const interval = chatState.intervalMs || 30 * 60 * 1000;
        const timeSinceLastGen = Date.now() - chatState.lastGenMs;
        if (timeSinceLastGen >= interval || chatState.lastGenMs === 0) {
            console.log(`Generez video pentru chat ${chatIdStr}...`);
            
            const tmpDir = os.tmpdir();
            const ts = Date.now();
            const inputPath = path.join(tmpDir, `in_${ts}.mp4`);
            const outputPath = path.join(tmpDir, `out_${ts}.mp4`);

            try {
                const quote = await fetchQuote();
                const url = await fetchVideo();
                await download(url, inputPath);
                await ensureFont();
                await runFFmpeg(inputPath, outputPath, quote);
                await sendVideo(chatIdStr, outputPath, quote.lines.join(' '));
                
                chatState.lastGenMs = Date.now(); // Actualizăm timpul
                fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2)); // Salvăm din nou
                
                console.log('Video trimis cu succes!');
            } catch (err) {
                console.error(`Eroare generare chat ${chatIdStr}:`, err);
            } finally {
                [inputPath, outputPath].forEach(f => { try { fs.unlinkSync(f); } catch(_) {} });
            }
        }
    }
}

main().catch(console.error);
