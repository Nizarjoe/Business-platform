// Usage: node scripts/password-record.mjs ENV_VAR_NAME OUT_FILE
// Reads a password from the named env var and writes only its PBKDF2 record
// ({ alg, iter, salt, hash }) to OUT_FILE (mode 600). The password is never printed.
import fs from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const auth = require('../auth.js');
const [name, out] = process.argv.slice(2);
const pw = process.env[name || ''];
if (!name || !out) { console.error('usage: password-record.mjs ENV_VAR_NAME OUT_FILE'); process.exit(2); }
const problem = auth.passwordProblem(pw);
if (problem) { console.error(name + ': ' + problem); process.exit(1); }
fs.writeFileSync(out, JSON.stringify(await auth.hashPassword(pw)), { mode: 0o600 });
console.log('wrote password record for ' + name + ' to ' + out);
