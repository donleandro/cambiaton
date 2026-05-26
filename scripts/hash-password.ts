import { createHash, randomBytes } from 'node:crypto';

const password = process.argv[2];
if (!password) {
	console.error('Uso: pnpm run hash-password "tu-password-aqui"');
	process.exit(1);
}

const hash = createHash('sha256').update(password).digest('hex');
const secret = randomBytes(32).toString('hex');

console.log('\nAgregá estas dos líneas a tu .env (reemplazá si ya existen):\n');
console.log(`APP_PASSWORD_HASH=${hash}`);
console.log(`SESSION_SECRET=${secret}`);
console.log('\nGuardá tu password en algún lado seguro — no se puede recuperar del hash.');
