const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');

function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function drawIcon(size, { maskable = false } = {}) {
  const png = new PNG({ width: size, height: size });
  const bg = hexToRgb('#0b0b14');
  const green = hexToRgb('#00c853');
  const gold = hexToRgb('#ffd700');
  const purple = hexToRgb('#7c3aed');

  const cx = size / 2;
  const cy = size / 2;
  // maskable icons need safe padding (about 10% margin), regular icons can use more space
  const radius = maskable ? size * 0.36 : size * 0.42;
  const ringWidth = size * 0.06;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (size * y + x) << 2;
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const angle = (Math.atan2(dy, dx) + Math.PI) / (2 * Math.PI); // 0..1

      let color = bg;

      if (dist <= radius) {
        // gradient ring blending green -> gold -> purple based on angle
        if (angle < 0.33) color = green;
        else if (angle < 0.66) color = gold;
        else color = purple;

        // inner disc darker for contrast (ticket badge look)
        if (dist < radius - ringWidth) {
          color = bg;
        }
      }

      png.data[idx] = color[0];
      png.data[idx + 1] = color[1];
      png.data[idx + 2] = color[2];
      png.data[idx + 3] = 255;
    }
  }

  return png;
}

function save(png, filePath) {
  return new Promise((resolve, reject) => {
    png.pack()
      .pipe(fs.createWriteStream(filePath))
      .on('finish', resolve)
      .on('error', reject);
  });
}

async function main() {
  const outDir = path.join(__dirname, '..', 'public', 'icons');
  fs.mkdirSync(outDir, { recursive: true });

  await save(drawIcon(192), path.join(outDir, 'icon-192.png'));
  await save(drawIcon(512), path.join(outDir, 'icon-512.png'));
  await save(drawIcon(512, { maskable: true }), path.join(outDir, 'icon-maskable-512.png'));

  console.log('Íconos generados en', outDir);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
