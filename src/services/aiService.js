export async function generateScript(prompt, apiKey) {
  if (!apiKey) throw new Error('Ai nevoie de un OpenAI API Key pentru a genera povestea.');

  const systemPrompt = `You are an elite viral storyteller and scriptwriter for short-form social media videos (TikTok, Reels, Shorts).
Your job is to write a CINEMATIC, GRIPPING short story in Romanian based on the user's topic.

## STORY STRUCTURE (mandatory):
1. **HOOK (Scene 1):** Start with an extremely captivating, curiosity-driven opening line that makes the viewer STOP scrolling. Use techniques like: a shocking question, a mysterious statement, a bold claim, or an intense in-medias-res moment. Example: "În acea noapte, nimeni nu a mai ieșit din pădure."
2. **RISING ACTION (Scenes 2-3):** Build tension gradually. Add specific sensory details (sounds, visuals, emotions). Make the viewer feel like they are INSIDE the story. Each scene must flow naturally into the next like chapters of a book.
3. **CLIMAX (Scene 4-5):** The peak moment of tension, revelation, or emotional impact. This is the turning point.
4. **ENDING (Final Scene):** A dramatic, memorable conclusion. Use one of these: a plot twist, a haunting final line, a moral lesson, or an open-ended mystery that leaves the viewer thinking.

## WRITING RULES:
- Write in Romanian, using a dramatic, cinematic narrator voice (like a documentary or audiobook).
- Keep each scene's text between 15-35 words (perfect for voiceover pacing).
- Use vivid, emotional language. No generic or boring descriptions.
- The story must feel REAL and IMMERSIVE, like something that actually happened.
- Total: 5-7 scenes for a complete narrative arc.

## VIDEO SEARCH QUERIES (critical):
For each scene, provide an English search query for Pexels stock video that PRECISELY matches:
- The SETTING of that specific scene (forest, city, ocean, bedroom, etc.)
- The MOOD/ATMOSPHERE (dark, mysterious, peaceful, terrifying, etc.)  
- The TIME of day if relevant (night, sunset, dawn, etc.)
- Specific visual ELEMENTS mentioned in the text (rain, fog, fire, shadows, etc.)

BAD example: "nature video" (too generic)
GOOD examples: "dark foggy forest night", "abandoned house hallway", "person running scared dark", "rain falling on window night", "mysterious shadow moving darkness"

The search query must feel like a CINEMATOGRAPHER'S SHOT DESCRIPTION for that exact moment in the story.

## OUTPUT FORMAT:
Respond ONLY with a valid JSON array. No extra text, no markdown, no explanation.
[
  {"text": "Romanian voiceover text for scene 1...", "searchQuery": "precise cinematic english search query"},
  {"text": "Romanian voiceover text for scene 2...", "searchQuery": "precise cinematic english search query"}
]`;

  const url = `https://api.groq.com/openai/v1/chat/completions`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt }
        ],
        temperature: 0.85,
        max_tokens: 2000
      })
    });

    const rawText = await response.text();
    let data;
    try {
      data = JSON.parse(rawText);
    } catch (e) {
      throw new Error('Eroare rețea/parsare răspuns Groq (Posibil server over capacity): ' + rawText.substring(0, 100));
    }

    if (!response.ok) {
      throw new Error(data.error?.message || 'Eroare la generarea script-ului cu Groq API.');
    }
    if (data.error) {
      throw new Error(`Groq Error: ${data.error.message}`);
    }
    const messageContent = data.choices?.[0]?.message?.content;
    if (!messageContent) {
      throw new Error(`Groq a returnat un răspuns gol sau invalid. Detalii: ${JSON.stringify(data)}`);
    }
    let content = messageContent.trim();
    
    // Strip markdown code blocks if present
    content = content.replace(/```json\s*/gi, '').replace(/```\s*/g, '');
    
    // Extract JSON array
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      console.error("No JSON array found in response:", content);
      throw new Error('AI-ul nu a returnat un JSON valid. Încearcă din nou.');
    }
    
    try {
      const parsed = JSON.parse(jsonMatch[0]);
      if (!Array.isArray(parsed) || parsed.length === 0) {
        throw new Error("Parsed result is not a non-empty array");
      }
      // Validate each scene has required fields
      return parsed.filter(s => s.text && s.searchQuery).map(s => ({
        text: s.text.trim(),
        searchQuery: s.searchQuery.trim()
      }));
    } catch (e) {
      console.error("Failed to parse script JSON:", content);
      throw new Error('Eroare la parsarea răspunsului de la AI. Încearcă din nou.');
    }
  } catch (err) {
    console.error("Gemini API Error:", err);
    throw err;
  }
}

export async function generateVoiceover(text, apiKey) {
  if (!apiKey) throw new Error('Ai nevoie de un ElevenLabs API Key pentru voiceover.');

  // "Antoni" voice ID for ElevenLabs (good for stories)
  // Or "Adam" -> pNInz6obpgDQGcFmaJgB
  const voiceId = 'pNInz6obpgDQGcFmaJgB';
  const url = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'xi-api-key': apiKey
    },
    body: JSON.stringify({
      text: text,
      model_id: 'eleven_multilingual_v2',
      voice_settings: {
        stability: 0.5,
        similarity_boost: 0.75
      }
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    let errorMessage = 'Eroare la generarea voiceover-ului cu ElevenLabs.';
    try {
      const errorJson = JSON.parse(errorText);
      errorMessage = errorJson.detail?.message || errorJson.message || errorMessage;
    } catch (e) {
      errorMessage += ` (${response.status} ${response.statusText})`;
    }
    throw new Error(errorMessage);
  }

  return await response.blob();
}

export async function getAudioDuration(blob) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    audio.addEventListener('loadedmetadata', () => {
      resolve(audio.duration);
      URL.revokeObjectURL(url);
    });
    audio.addEventListener('error', (e) => {
      reject(new Error('Failed to load audio metadata'));
      URL.revokeObjectURL(url);
    });
  });
}
