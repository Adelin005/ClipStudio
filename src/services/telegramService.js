const BOT_TOKEN = '8848837748:AAHpo0b2EVOdAgBsITsvbvdUchp5389a_A4';

/**
 * Trimite un mesaj text prin Telegram Bot
 */
export async function sendTelegramMessage(chatId, text) {
  if (!chatId) throw new Error('Chat ID Telegram lipsă.');
  const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' })
  });
  const rawText = await res.text();
  let data;
  try {
    data = JSON.parse(rawText);
  } catch (e) {
    throw new Error('Eroare rețea Telegram (posibil blocat/indisponibil)');
  }
  if (!res.ok) {
    throw new Error(data.description || 'Eroare Telegram sendMessage');
  }
  return data;
}

/**
 * Trimite un video blob prin Telegram Bot (max 50MB)
 * Dacă e prea mare, trimite doar notificare text
 */
export async function sendTelegramVideo(chatId, videoBlob, caption = '') {
  if (!chatId) throw new Error('Chat ID Telegram lipsă.');

  const MAX_SIZE = 50 * 1024 * 1024; // 50MB

  if (videoBlob.size > MAX_SIZE) {
    // Videoul e prea mare — trimitem doar o notificare
    const sizeMB = (videoBlob.size / 1048576).toFixed(1);
    await sendTelegramMessage(chatId,
      `🎬 <b>Nou video generat!</b>\n\n` +
      `📦 Dimensiune: ${sizeMB} MB (prea mare pentru trimitere directă)\n` +
      `💡 Descarcă-l din <b>Istoricul</b> aplicației.\n\n` +
      caption
    );
    return { skipped: true, reason: 'too_large' };
  }

  const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendVideo`;
  const formData = new FormData();
  formData.append('chat_id', chatId);
  const ext = videoBlob.type.includes('mp4') ? 'mp4' : 'webm';
  formData.append('video', videoBlob, `viralclip.${ext}`);
  if (caption) formData.append('caption', caption);
  formData.append('parse_mode', 'HTML');

  const res = await fetch(url, { method: 'POST', body: formData });
  const rawText = await res.text();
  let data;
  try {
    data = JSON.parse(rawText);
  } catch (e) {
    throw new Error('Eroare rețea Telegram (sendVideo)');
  }
  if (!res.ok) {
    throw new Error(data.description || 'Eroare Telegram sendVideo');
  }
  return data;
}

/**
 * Verifică dacă bot-ul poate trimite mesaje la chatId
 */
export async function testTelegramConnection(chatId) {
  return sendTelegramMessage(chatId,
    `✅ <b>ClipStudio conectat!</b>\n\nVei primi automat fiecare video generat aici. 🎬💰`
  );
}
