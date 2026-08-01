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

const migrateScript = `
const Database = require('/var/www/limpeja/server/node_modules/better-sqlite3');

const SRC = '/var/lib/docker/volumes/limpeja-docker_saas_data/_data/saas.db';
const TGT = '/var/www/limpeja/server/data/saas.db';

const src = new Database(SRC, { readonly: true });
const tgt = new Database(TGT);

const EMAIL = 'joaovictorwbdesigner@gmail.com';
const srcTenant = src.prepare('SELECT * FROM tenants WHERE email = ?').get(EMAIL);
const tgtTenant = tgt.prepare('SELECT * FROM tenants WHERE email = ?').get(EMAIL);

if (!srcTenant) { console.log('ERRO: tenant não encontrado na origem'); process.exit(1); }
if (!tgtTenant) { console.log('ERRO: tenant não encontrado no destino'); process.exit(1); }

const srcId = srcTenant.id;
const tgtId = tgtTenant.id;
console.log('Migrando de', srcId, 'para', tgtId);

let total = 0;

// Migrate clients
const clients = src.prepare('SELECT * FROM clients WHERE tenant_id = ?').all(srcId);
console.log('\\nClientes encontrados:', clients.length);
const tgtCols_clients = tgt.prepare('PRAGMA table_info(clients)').all().map(c => c.name);
for (const row of clients) {
  const newRow = { ...row, tenant_id: tgtId };
  const cols = Object.keys(newRow).filter(k => tgtCols_clients.includes(k));
  const vals = cols.map(k => newRow[k]);
  try {
    tgt.prepare('INSERT OR IGNORE INTO clients (' + cols.join(',') + ') VALUES (' + cols.map(() => '?').join(',') + ')').run(...vals);
    console.log('  ✅ Cliente: ' + row.name);
    total++;
  } catch(e) { console.log('  ❌ Erro cliente ' + row.name + ': ' + e.message); }
}

// Migrate orders
const orders = src.prepare('SELECT * FROM orders WHERE tenant_id = ?').all(srcId);
console.log('\\nOrdens encontradas:', orders.length);
const tgtCols_orders = tgt.prepare('PRAGMA table_info(orders)').all().map(c => c.name);
for (const row of orders) {
  const newRow = { ...row, tenant_id: tgtId };
  const cols = Object.keys(newRow).filter(k => tgtCols_orders.includes(k));
  const vals = cols.map(k => newRow[k]);
  try {
    tgt.prepare('INSERT OR IGNORE INTO orders (' + cols.join(',') + ') VALUES (' + cols.map(() => '?').join(',') + ')').run(...vals);
    console.log('  ✅ Ordem: ' + row.service + ' - ' + row.client_name);
    total++;
  } catch(e) { console.log('  ❌ Erro ordem: ' + e.message); }
}

// Migrate transactions
const txs = src.prepare('SELECT * FROM transactions WHERE tenant_id = ?').all(srcId);
console.log('\\nTransações encontradas:', txs.length);
const tgtCols_txs = tgt.prepare('PRAGMA table_info(transactions)').all().map(c => c.name);
for (const row of txs) {
  const newRow = { ...row, tenant_id: tgtId };
  const cols = Object.keys(newRow).filter(k => tgtCols_txs.includes(k));
  const vals = cols.map(k => newRow[k]);
  try {
    tgt.prepare('INSERT OR IGNORE INTO transactions (' + cols.join(',') + ') VALUES (' + cols.map(() => '?').join(',') + ')').run(...vals);
    total++;
  } catch(e) {}
}

// Migrate inventory
const inv = src.prepare('SELECT * FROM inventory WHERE tenant_id = ?').all(srcId);
console.log('\\nEstoque encontrado:', inv.length, 'itens');
const tgtCols_inv = tgt.prepare('PRAGMA table_info(inventory)').all().map(c => c.name);
for (const row of inv) {
  const newRow = { ...row, tenant_id: tgtId };
  const cols = Object.keys(newRow).filter(k => tgtCols_inv.includes(k));
  const vals = cols.map(k => newRow[k]);
  try {
    tgt.prepare('INSERT OR IGNORE INTO inventory (' + cols.join(',') + ') VALUES (' + cols.map(() => '?').join(',') + ')').run(...vals);
    total++;
  } catch(e) {}
}

// Migrate quotes
const quotes = src.prepare('SELECT * FROM quotes WHERE tenant_id = ?').all(srcId);
console.log('\\nOrçamentos encontrados:', quotes.length);
const tgtCols_q = tgt.prepare('PRAGMA table_info(quotes)').all().map(c => c.name);
for (const row of quotes) {
  const newRow = { ...row, tenant_id: tgtId };
  const cols = Object.keys(newRow).filter(k => tgtCols_q.includes(k));
  const vals = cols.map(k => newRow[k]);
  try {
    tgt.prepare('INSERT OR IGNORE INTO quotes (' + cols.join(',') + ') VALUES (' + cols.map(() => '?').join(',') + ')').run(...vals);
    total++;
  } catch(e) {}
}

src.close();
tgt.close();

console.log('\\n🎉 Total migrado:', total, 'registros');
`;

const conn = new Client();
conn.on('ready', async () => {
  console.log('🚀 Migrando dados do volume Docker para o banco ativo...\n');

  // Backup first
  await exec(conn, 'cp /var/www/limpeja/server/data/saas.db /var/www/limpeja/server/data/saas.db.bak2');
  console.log('✅ Backup criado\n');

  await uploadFile(conn, migrateScript, '/tmp/migrate_docker.js');
  await exec(conn, 'node /tmp/migrate_docker.js');
  await exec(conn, 'rm -f /tmp/migrate_docker.js');

  console.log('\n🔄 Reiniciando backend...');
  await exec(conn, 'pm2 restart limpeja-backend');

  console.log('\n✅ Dados migrados! Recarregue o higigestor.com');
  conn.end();
});
conn.connect(VPS);
