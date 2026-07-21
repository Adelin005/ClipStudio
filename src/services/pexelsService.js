export async function fetchPexelsVideos(prompt, apiKey, neededCount) {
  if (!apiKey) {
    throw new Error('Te rog să adaugi o cheie de API Pexels în meniul din stânga jos pentru a folosi Custom Video AI.');
  }

  // Fetch vertical videos from Pexels based on prompt
  const url = `https://api.pexels.com/videos/search?query=${encodeURIComponent(prompt)}&orientation=portrait&per_page=${Math.max(15, neededCount * 2)}`;
  
  try {
    const res = await fetch(url, {
      headers: {
        'Authorization': apiKey
      }
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Eroare Pexels API: ${res.status} ${res.statusText}`);
    }

    const data = await res.json();
    
    if (!data.videos || data.videos.length === 0) {
      throw new Error(`Nu am găsit niciun video pentru promptul: "${prompt}"`);
    }

    // Filter and process the videos to extract the best quality link
    const processedVideos = [];
    
    for (const video of data.videos) {
      if (!video.video_files || video.video_files.length === 0) continue;
      
      // Prefer SD vertical videos (smaller files = no WASM memory crash)
      let bestFile = video.video_files.find(f => f.quality === 'sd' && f.width < f.height);
      
      // Fallback to smallest available file
      if (!bestFile) {
        bestFile = video.video_files.sort((a, b) => (a.width * a.height) - (b.width * b.height))[0];
      }
      
      if (bestFile) {
        processedVideos.push({
          id: video.id,
          url: bestFile.link,
          duration: video.duration,
          name: `Pexels_${video.id}.mp4`,
          type: 'remote-ai'
        });
      }
    }

    if (processedVideos.length === 0) {
      throw new Error(`Nu am găsit videoclipuri potrivite pentru: "${prompt}"`);
    }

    // Shuffle and pick needed count
    processedVideos.sort(() => 0.5 - Math.random());
    return processedVideos.slice(0, neededCount * 2); // Return more than needed for variety

  } catch (err) {
    console.error('Eroare la fetchPexelsVideos:', err);
    throw err;
  }
}
