import { Client } from 'ssh2';

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

const checkScript = `
const Database = require('/var/www/limpeja/server/node_modules/better-sqlite3');
const fs = require('fs');

// Check the Docker volume path
const dockerVolumePaths = [
  '/var/lib/docker/volumes/limpeja-docker_saas_data/_data/saas.db',
  '/var/lib/docker/volumes/limpeja_saas_data/_data/saas.db',
];

// Also find all .db files
const { execSync } = require('child_process');
let allDbs = '';
try { allDbs = execSync('find /var/lib/docker/volumes -name "*.db" 2>/dev/null').toString(); } catch {}
console.log('DBs no Docker volumes:\\n' + (allDbs || '  NENHUM'));

for (const dbPath of dockerVolumePaths) {
  if (!fs.existsSync(dbPath)) {
    console.log('\\n❌ NAO EXISTE: ' + dbPath);
    continue;
  }
  
  try {
    const db = new Database(dbPath, { readonly: true });
    const tenants = db.prepare('SELECT * FROM tenants').all();
    
    console.log('\\n✅ ENCONTRADO: ' + dbPath);
    for (const t of tenants) {
      const clients = db.prepare('SELECT * FROM clients WHERE tenant_id = ?').all(t.id);
      const orders = db.prepare('SELECT * FROM orders WHERE tenant_id = ?').all(t.id);
      console.log('  Tenant: ' + t.email + ' | clientes: ' + clients.length + ' | ordens: ' + orders.length);
      if (clients.length > 0) {
        clients.forEach(c => console.log('    -> Cliente: ' + c.name + ' | tel: ' + c.phone));
      }
    }
    db.close();
  } catch (e) {
    console.log('\\nERRO em ' + dbPath + ': ' + e.message);
  }
}
`;

const conn = new Client();
conn.on('ready', async () => {
  console.log('🔍 Procurando dados no volume Docker...\n');
  await uploadFile(conn, checkScript, '/tmp/check_docker.js');
  await exec(conn, 'node /tmp/check_docker.js');
  await exec(conn, 'rm -f /tmp/check_docker.js');
  conn.end();
});
conn.connect(VPS);
