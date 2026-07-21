import { FFmpeg } from '@ffmpeg/ffmpeg';
// Import the ESM single-threaded build directly through Vite
import coreURL from '@ffmpeg/core?url';
import wasmURL from '@ffmpeg/core/wasm?url';

let ffmpeg = null;
let loaded = false;
let onProgress = null;
let lastLog = '';

export function setProgressCallback(cb) { onProgress = cb; }
export function getLastLog() { return lastLog; }

export async function loadFFmpeg() {
  if (loaded && ffmpeg) return ffmpeg;
  
  ffmpeg = new FFmpeg();
  
  ffmpeg.on('log', ({ message }) => {
    console.log('[ffmpeg]', message);
    lastLog = message;
  });
  
  ffmpeg.on('progress', ({ progress }) => {
    if (onProgress && progress >= 0) {
      onProgress(Math.round(progress * 100));
    }
  });

  // Load using Vite's URL resolution. It guarantees we load the ESM build,
  // which works flawlessly with dynamic import() in modern browsers.
  await ffmpeg.load({
    coreURL,
    wasmURL,
  });
  
  loaded = true;
  console.log('[ffmpeg] Loaded successfully v0.12.6 (Vite ESM)');
  return ffmpeg;
}

export async function writeFileToFFmpeg(name, data) {
  const ff = await loadFFmpeg();
  
  let buffer;
  if (data instanceof File || data instanceof Blob) {
    buffer = new Uint8Array(await data.arrayBuffer());
  } else if (typeof data === 'string') {
    const res = await fetch(data);
    if (!res.ok) throw new Error(`HTTP fetch failed for ${data}`);
    const ab = await res.arrayBuffer();
    buffer = new Uint8Array(ab);
  } else {
    buffer = data;
  }
  
  await ff.writeFile(name, buffer);
}

export async function execFFmpeg(args) {
  const ff = await loadFFmpeg();
  console.log('[ffmpeg] exec:', args.join(' '));
  
  const ret = await ff.exec(args);
  if (ret !== 0) {
    throw new Error(`FFmpeg eroare (cod ${ret}): ${lastLog}`);
  }
  return ret;
}

export async function readFileFromFFmpeg(name) {
  const ff = await loadFFmpeg();
  const data = await ff.readFile(name);
  if (!data || data.length === 0) {
    throw new Error(`Fișierul ${name} este gol sau nu a fost creat.`);
  }
  return data;
}

export async function deleteFileFromFFmpeg(name) {
  const ff = await loadFFmpeg();
  try { await ff.deleteFile(name); } catch(e) {}
}

export function isLoaded() { return loaded; }
