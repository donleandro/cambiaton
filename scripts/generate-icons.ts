/**
 * Genera los íconos PNG para PWA y apple-touch a partir del SVG del favicon.
 * Se corre una vez por cambio de logo:
 *   pnpm exec tsx scripts/generate-icons.ts
 */
import sharp from 'sharp';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SVG = readFileSync(resolve(__dirname, '..', 'src', 'lib', 'assets', 'favicon.svg'));

const STATIC = resolve(__dirname, '..', 'static');

async function emit(name: string, size: number, padding = 0, bg = '#0c0a09') {
	const inner = size - padding * 2;
	const composed = await sharp({
		create: { width: size, height: size, channels: 4, background: bg }
	})
		.composite([{ input: await sharp(SVG).resize(inner, inner).png().toBuffer(), top: padding, left: padding }])
		.png()
		.toBuffer();
	await sharp(composed).toFile(resolve(STATIC, name));
	console.log(`wrote ${name} (${size}x${size})`);
}

// Iconos PWA: el SVG ya viene con su propio fondo, así que padding=0.
await emit('icon-192.png', 192);
await emit('icon-512.png', 512);
// Apple touch: iOS recorta esquinas; conviene que el contenido tenga margen.
await emit('apple-touch-icon.png', 180);
// Maskable (Android adaptive icons): safe zone ~20%
await emit('icon-512-maskable.png', 512, 80);
