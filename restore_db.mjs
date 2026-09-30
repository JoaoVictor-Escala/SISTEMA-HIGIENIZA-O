import { Client } from 'ssh2';
import fs from 'fs';
import path from 'path';

const VPS = { host: '72.62.138.34', port: 22, username: 'root', privateKey: fs.readFileSync(path.join(process.env.USERPROFILE, '.ssh', 'id_ed25519_higigestor')) };

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
  console.log('🚀 Restaurando banco de dados original do PM2 para o Docker...\n');

  // 1. Stop backend
  console.log('🛑 Parando backend do Docker...');
  await exec(conn, 'docker stop limpeja-docker-backend-1');

  // 2. Backup current just in case
  console.log('💾 Fazendo backup do banco Docker zerado atual...');
  await exec(conn, 'cp /var/lib/docker/volumes/limpeja-docker_saas_data/_data/saas.db /var/lib/docker/volumes/limpeja-docker_saas_data/_data/saas.db.empty_bak || true');

  // 3. Copy full PM2 DB to Docker
  console.log('🔄 Copiando banco original do PM2 para o volume do Docker...');
  await exec(conn, 'cp /var/www/limpeja/server/data/saas.db /var/lib/docker/volumes/limpeja-docker_saas_data/_data/saas.db');
  await exec(conn, 'cp /var/www/limpeja/server/data/saas.db-wal /var/lib/docker/volumes/limpeja-docker_saas_data/_data/saas.db-wal 2>/dev/null || true');
  await exec(conn, 'cp /var/www/limpeja/server/data/saas.db-shm /var/lib/docker/volumes/limpeja-docker_saas_data/_data/saas.db-shm 2>/dev/null || true');

  // 4. Start backend
  console.log('▶️ Iniciando backend Docker novamente...');
  await exec(conn, 'docker start limpeja-docker-backend-1');

  console.log('\n✅ Banco de dados restaurado com sucesso! Dados originais aplicados.');
  conn.end();
});
conn.connect(VPS);
