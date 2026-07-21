import { shuffleArray } from '../utils/helpers.js';

/**
 * Generate a list of clip segments from the video pool.
 * Each segment is 1.5s, taken from a random position in the source video.
 * Segments are shuffled so no two consecutive segments come from the same source.
 */
export function generateClipPlan(videos, totalDuration = 30, segmentDuration = 1.5, aiMode = null) {
  // If custom AI mode, the videos are already mapped 1:1 with scenes and have exact durations
  if (aiMode === 'custom' && videos.length > 0 && videos[0].sceneText) {
    return videos.map((v, i) => ({
      videoIdx: i,
      videoName: v.name || `Scene ${i+1}`,
      videoUrl: v.url,
      videoFile: v.file || null,
      videoType: v.type,
      startTime: 0, // start from beginning of stock clip or random? Let's start from 0 for now.
      duration: v.duration,
      sceneText: v.sceneText,
      audioBlob: v.audioBlob,
      segmentIndex: i
    }));
  }

  const numSegments = Math.ceil(totalDuration / segmentDuration);
  const segments = [];

  // Generate possible segments from each video
  const allPossible = [];
  videos.forEach((video, videoIdx) => {
    const maxStart = Math.max(0, video.duration - segmentDuration);
    // Generate multiple random start points per video
    const count = Math.ceil(numSegments / videos.length) + 2;
    for (let i = 0; i < count; i++) {
      const start = Math.random() * maxStart;
      allPossible.push({
        videoIdx,
        videoName: video.name,
        videoUrl: video.url,
        videoFile: video.file || null,
        videoType: video.type,
        startTime: Math.round(start * 100) / 100,
        duration: segmentDuration,
      });
    }
  });

  // Shuffle all segments
  let shuffled = shuffleArray(allPossible);

  // Ensure no two consecutive segments are from the same video
  const result = [];
  let lastIdx = -1;
  let attempts = 0;
  while (result.length < numSegments && attempts < numSegments * 10) {
    attempts++;
    if (shuffled.length === 0) shuffled = shuffleArray(allPossible);
    const seg = shuffled.shift();
    if (!seg) break;
    if (seg.videoIdx === lastIdx && videos.length > 1) {
      shuffled.push(seg);
      continue;
    }
    result.push({ ...seg, segmentIndex: result.length });
    lastIdx = seg.videoIdx;
  }

  return result;
}

export function getClipPlanSummary(plan) {
  const total = plan.reduce((acc, p) => acc + (p.duration || 1.5), 0);
  const sources = new Set(plan.map(p => p.videoIdx)).size;
  return { totalSegments: plan.length, totalDuration: total, sourcesUsed: sources };
}
