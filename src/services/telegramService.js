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
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.description || 'Eroare Telegram sendMessage');
  }
  return await res.json();
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
  formData.append('video', videoBlob, 'viralclip.webm');
  if (caption) formData.append('caption', caption);
  formData.append('parse_mode', 'HTML');

  const res = await fetch(url, { method: 'POST', body: formData });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.description || 'Eroare Telegram sendVideo');
  }
  return await res.json();
}

/**
 * Verifică dacă bot-ul poate trimite mesaje la chatId
 */
export async function testTelegramConnection(chatId) {
  return sendTelegramMessage(chatId,
    `✅ <b>ClipStudio conectat!</b>\n\nVei primi automat fiecare video generat aici. 🎬💰`
  );
}
