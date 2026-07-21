export function shuffleArray(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function formatFileSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / 1048576).toFixed(1) + ' MB';
}

export function validateVideoFile(file) {
  const types = ['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime', 'video/x-msvideo'];
  return types.includes(file.type) || /\.(mp4|webm|ogg|mov|avi)$/i.test(file.name);
}

export function validateAudioFile(file) {
  const types = ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp3', 'audio/aac', 'audio/flac'];
  return types.includes(file.type) || /\.(mp3|wav|ogg|aac|flac)$/i.test(file.name);
}

export function createObjectURL(blob) {
  return URL.createObjectURL(blob);
}

export function revokeObjectURL(url) {
  if (url && url.startsWith('blob:')) URL.revokeObjectURL(url);
}

export function showToast(message, type = 'success') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => { toast.style.opacity = '0'; toast.style.transition = 'opacity 0.3s'; setTimeout(() => toast.remove(), 300); }, 3000);
}

export function getVideoDuration(file) {
  return new Promise((resolve) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.onloadedmetadata = () => { resolve(video.duration); URL.revokeObjectURL(video.src); };
    video.onerror = () => resolve(0);
    video.src = URL.createObjectURL(file);
  });
}

export function getAudioDuration(file) {
  return new Promise((resolve) => {
    const audio = document.createElement('audio');
    audio.preload = 'metadata';
    audio.onloadedmetadata = () => { resolve(audio.duration); URL.revokeObjectURL(audio.src); };
    audio.onerror = () => resolve(0);
    audio.src = URL.createObjectURL(file);
  });
}
