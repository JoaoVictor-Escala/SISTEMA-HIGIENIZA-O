import { Client } from 'ssh2';

const VPS = { host: '72.62.138.34', port: 22, username: 'root', password: 'Black2024@@@' };
const PASSWORD = '88183170';

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

// Upload a small script to the server and run it there
function uploadFile(conn, content, remotePath) {
  return new Promise((resolve, reject) => {
    conn.sftp((err, sftp) => {
      if (err) return reject(err);
      const buf = Buffer.from(content);
      const ws = sftp.createWriteStream(remotePath);
      ws.on('close', resolve);
      ws.on('error', reject);
      ws.write(buf);
      ws.end();
    });
  });
}

const fixScript = `
const Database = require('/var/www/limpeja/server/node_modules/better-sqlite3');
const bcrypt = require('/var/www/limpeja/server/node_modules/bcryptjs');

const db = new Database('/var/www/limpeja/server/data/saas.db');
const password = '${PASSWORD}';
const hash = bcrypt.hashSync(password, 10);

console.log('Hash gerado:', hash);

const result = db.prepare('UPDATE tenants SET password_hash = ? WHERE email = ?')
  .run(hash, 'joaovictorwbdesigner@gmail.com');

console.log('Rows updated:', result.changes);

const user = db.prepare('SELECT email, password_hash, subscription_status, email_verified FROM tenants WHERE email = ?')
  .get('joaovictorwbdesigner@gmail.com');

console.log('User:', JSON.stringify(user));

// Verify bcrypt works
const ok = bcrypt.compareSync(password, user.password_hash);
console.log('Password verify OK:', ok);

db.close();
`;

const conn = new Client();
conn.on('ready', async () => {
  console.log('✅ SSH conectado.\n');

  // Upload the script to VPS
  await uploadFile(conn, fixScript, '/tmp/fix_password.js');
  console.log('📤 Script enviado para VPS.\n');

  // Run it
  console.log('🔧 Executando na VPS...');
  await exec(conn, 'node /tmp/fix_password.js');

  // Test login
  console.log('\n=== Testando login via API ===');
  await exec(conn, `curl -s -X POST http://127.0.0.1:3002/api/auth/login -H 'Content-Type: application/json' -d '{"email":"joaovictorwbdesigner@gmail.com","password":"${PASSWORD}"}'`);

  // Cleanup
  await exec(conn, 'rm -f /tmp/fix_password.js');

  console.log('\n\n✅ Concluído!');
  conn.end();
});
conn.connect(VPS);
