import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDir = path.join(__dirname, '../public');

const manifest = {
  videos: {},
  music: []
};

const niches = ['luxury', 'motivational', 'psychology'];

niches.forEach(niche => {
  const dir = path.join(publicDir, niche);
  manifest.videos[niche] = [];
  if (fs.existsSync(dir)) {
    const files = fs.readdirSync(dir).filter(f => f.match(/\.(mp4|mov)$/i));
    manifest.videos[niche] = files.map(f => `/${niche}/${f}`);
  }
});

const musicDir = path.join(publicDir, 'music');
if (fs.existsSync(musicDir)) {
  const files = fs.readdirSync(musicDir).filter(f => f.match(/\.(mp3|wav|ogg|aac|flac|m4a)$/i));
  manifest.music = files.map(f => `/music/${f}`);
}

fs.writeFileSync(path.join(publicDir, 'assets-manifest.json'), JSON.stringify(manifest, null, 2));
console.log('✅ assets-manifest.json a fost generat cu succes!');
