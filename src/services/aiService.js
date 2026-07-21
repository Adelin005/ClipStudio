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
    // Auto-detect available Groq model
    let modelName = 'llama3-8b-8192'; // fallback
    try {
      const modelsRes = await fetch('https://api.groq.com/openai/v1/models', {
        headers: { 'Authorization': `Bearer ${apiKey}` }
      });
      if (modelsRes.ok) {
        const modelsData = await modelsRes.json();
        const models = modelsData.data.map(m => m.id);
        // Exclude whisper, guard (classification), and tool models if possible
        const preferred = models.find(m => m.includes('llama') && !m.includes('whisper') && !m.includes('guard') && !m.includes('tool')) 
                          || models.find(m => m.includes('mixtral')) 
                          || models[0];
        if (preferred) modelName = preferred;
      }
    } catch (e) {
      console.warn("Eroare la auto-detectia modelelor Groq:", e);
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: modelName,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt }
        ],
        temperature: 0.85,
        max_tokens: 2000
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Eroare la generarea script-ului cu Groq.');
    }

    const data = await response.json();
    let content = data.choices[0].message.content.trim();
    
    // Strip markdown code blocks if present
    content = content.replace(/```json\s*/gi, '').replace(/```\s*/g, '');
    
    // Extract JSON array from content (handles extra text before/after)
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
    console.error("OpenAI API Error:", err);
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
    const error = await response.json();
    throw new Error(error.detail?.message || 'Eroare la generarea voiceover-ului cu ElevenLabs.');
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
