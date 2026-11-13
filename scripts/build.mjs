import { copyFileSync, mkdirSync } from 'node:fs';
mkdirSync('public/shared', { recursive: true });
copyFileSync('lib/render.js', 'public/shared/render.js');
console.log('build ok');
