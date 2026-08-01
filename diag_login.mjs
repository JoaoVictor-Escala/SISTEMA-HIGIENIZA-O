import { Client } from 'ssh2';
import bcrypt from 'bcryptjs';

const VPS = { host: '72.62.138.34', port: 22, username: 'root', password: 'Black2024@@@' };

function exec(conn, cmd) {
  return new Promise((resolve, reject) => {
    conn.exec(cmd, (err, stream) => {
      if (err) return reject(err);
      let out = '';
      stream.on('data', d => { out += d; process.stdout.write(d.toString()); });
      stream.stderr.on('data', d => process.stderr.write(d.toString()));
      stream.on('close', () => resolve(out));
    });
  });
}

const conn = new Client();
conn.on('ready', async () => {
  console.log('🔍 Diagnóstico detalhado do login...\n');

  // 1. Check which process is running and its cwd
  console.log('=== PM2 Process Info ===');
  await exec(conn, 'pm2 show limpeja-backend 2>/dev/null | grep -E "(script path|cwd|pid|status)"');

  // 2. Check env vars the process is using
  console.log('\n=== Env do Processo PM2 ===');
  await exec(conn, 'pm2 env 0 2>/dev/null | grep -E "(cwd|script|DB|DATABASE)" | head -20');

  // 3. Find the database.js to see what DB path it uses
  console.log('\n=== database.js - caminho do banco ===');
  await exec(conn, 'grep -n "saas.db\\|database\\|DB_PATH\\|__dirname" /var/www/limpeja/server/database.js | head -20');

  // 4. Test login via API directly
  console.log('\n=== Teste de Login via API local ===');
  await exec(conn, `curl -s -X POST http://127.0.0.1:3002/api/auth/login -H 'Content-Type: application/json' -d '{"email":"joaovictorwbdesigner@gmail.com","password":"88183170"}'`);

  // 5. Check the password hash actually in the DB the server uses
  console.log('\n\n=== Hash no banco /var/www/limpeja/server/data/saas.db ===');
  await exec(conn, `node -e "
const Database = require('/var/www/limpeja/server/node_modules/better-sqlite3');
const db = new Database('/var/www/limpeja/server/data/saas.db');
const t = db.prepare('SELECT email, password_hash, subscription_status, email_verified FROM tenants WHERE email=?').get('joaovictorwbdesigner@gmail.com');
console.log(JSON.stringify(t));
db.close();
"`);

  conn.end();
});
conn.connect(VPS);
