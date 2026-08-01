import { Client } from 'ssh2';

const VPS = { host: '72.62.138.34', port: 22, username: 'root', password: 'Black2024@@@' };

function runSSH(conn, command) {
  return new Promise((resolve, reject) => {
    let out = '';
    conn.exec(command, (err, stream) => {
      if (err) return reject(err);
      stream.on('data', d => { out += d; process.stdout.write(d.toString()); });
      stream.stderr.on('data', d => process.stdout.write(d.toString()));
      stream.on('close', () => resolve(out));
    });
  });
}

const conn = new Client();
await new Promise((res, rej) => { conn.on('ready', res); conn.on('error', rej); conn.connect(VPS); });

const DB = '/var/www/limpeja/server/saas.db';

console.log('=== Instalando sqlite3 ===');
await runSSH(conn, 'apt-get install -y sqlite3 2>&1 | tail -5');

console.log('\n=== TENANTS ===');
await runSSH(conn, `sqlite3 "${DB}" "SELECT id, name, email, subscription_status, role FROM tenants ORDER BY rowid DESC;"`);

console.log('\n=== DADOS POR TENANT ===');
await runSSH(conn, `sqlite3 "${DB}" "
SELECT t.email, t.name,
  (SELECT COUNT(*) FROM clients WHERE tenant_id = t.id) as clientes,
  (SELECT COUNT(*) FROM orders WHERE tenant_id = t.id) as ordens,
  (SELECT COUNT(*) FROM transactions WHERE tenant_id = t.id) as transacoes
FROM tenants t ORDER BY t.rowid DESC;
"`);

conn.end();
