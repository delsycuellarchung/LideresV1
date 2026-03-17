import fs from 'node:fs';
import path from 'node:path';

const filePath = process.argv[2];
const url = process.argv[3] || 'http://localhost:3000/api/import-stream';

if (!filePath) {
  console.error('Usage: node scripts/upload-import.mjs <path-to-file> [url]');
  process.exit(1);
}

if (!fs.existsSync(filePath)) {
  console.error(`File not found: ${filePath}`);
  process.exit(1);
}

const buffer = fs.readFileSync(filePath);
const res = await fetch(url, {
  method: 'POST',
  headers: {
    'X-Filename': path.basename(filePath),
  },
  body: buffer,
});

const text = await res.text();
console.log(`Status: ${res.status}`);
console.log(text);
