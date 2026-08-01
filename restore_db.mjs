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

const conn = new Client();
conn.on('ready', async () => {
  console.log('🚀 Restaurando banco de dados completo do Docker para o PM2...\n');

  // 1. Stop backend
  console.log('🛑 Parando backend PM2...');
  await exec(conn, 'pm2 stop limpeja-backend || true');

  // 2. Backup current just in case
  console.log('💾 Fazendo backup do banco atual...');
  await exec(conn, 'cp /var/www/limpeja/server/data/saas.db /var/www/limpeja/server/data/saas.db.empty_bak || true');

  // 3. Copy full docker DB
  console.log('🔄 Copiando banco original...');
  await exec(conn, 'cp /var/lib/docker/volumes/limpeja-docker_saas_data/_data/saas.db /var/www/limpeja/server/data/saas.db');
  await exec(conn, 'cp /var/lib/docker/volumes/limpeja-docker_saas_data/_data/saas.db-wal /var/www/limpeja/server/data/saas.db-wal || true');
  await exec(conn, 'cp /var/lib/docker/volumes/limpeja-docker_saas_data/_data/saas.db-shm /var/www/limpeja/server/data/saas.db-shm || true');

  // 4. Start backend
  console.log('▶️ Iniciando backend PM2...');
  await exec(conn, 'pm2 start limpeja-backend');

  console.log('\n✅ Banco de dados restaurado com sucesso!');
  conn.end();
});
conn.connect(VPS);
