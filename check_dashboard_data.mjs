import { Client } from 'ssh2';

const VPS = { host: '72.62.138.34', port: 22, username: 'root', password: 'Black2024@@@' };

function exec(conn, cmd) {
  return new Promise((resolve, reject) => {
    conn.exec(cmd, (err, stream) => {
      if (err) return reject(err);
      let out = '';
      stream.on('data', d => { out += d; process.stdout.write(d.toString()); });
      stream.stderr.on('data', d => { process.stderr.write(d.toString()); });
      stream.on('close', () => resolve(out));
    });
  });
}

const checkScript = `
const Database = require('/var/www/limpeja/server/node_modules/better-sqlite3');
try {
  const db = new Database('/var/www/limpeja/server/data/saas.db', { readonly: true });
  const tenant = db.prepare('SELECT * FROM tenants WHERE email = ?').get('joaovictorwbdesigner@gmail.com');
  if (!tenant) {
    console.log('Tenant not found');
  } else {
    console.log('Tenant:', tenant);
    const clients = db.prepare('SELECT * FROM clients WHERE tenant_id = ?').all(tenant.id);
    console.log('Clients:', clients);
    const orders = db.prepare('SELECT * FROM orders WHERE tenant_id = ?').all(tenant.id);
    console.log('Orders:', orders);
    const config = db.prepare('SELECT * FROM config WHERE tenant_id = ?').get(tenant.id);
    console.log('Config:', config);
  }
  db.close();
} catch (e) {
  console.error('Error reading DB:', e);
}
`;

function uploadFile(conn, content, remotePath) {
  return new Promise((resolve, reject) => {
    conn.sftp((err, sftp) => {
      if (err) return reject(err);
      const ws = sftp.createWriteStream(remotePath);
      ws.on('close', resolve);
      ws.on('error', reject);
      ws.write(Buffer.from(content));
      ws.end();
    });
  });
}

const conn = new Client();
conn.on('ready', async () => {
  await uploadFile(conn, checkScript, '/tmp/check_dashboard_data.js');
  await exec(conn, 'node /tmp/check_dashboard_data.js');
  await exec(conn, 'rm -f /tmp/check_dashboard_data.js');
  conn.end();
});
conn.connect(VPS);
