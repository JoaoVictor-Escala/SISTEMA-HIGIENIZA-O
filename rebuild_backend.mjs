import { Client } from 'ssh2';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const VPS = { host: '72.62.138.34', port: 22, username: 'root', password: 'Black2024@@@', readyTimeout: 60000 };
const REMOTE_SERVER = '/var/www/limpeja-docker/server';

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

function upload(conn, localPath, remotePath) {
  return new Promise((resolve, reject) => {
    conn.sftp((err, sftp) => {
      if (err) return reject(err);
      sftp.fastPut(localPath, remotePath, (err) => {
        if (err) return reject(err);
        console.log(`  ✅ ${path.basename(localPath)}`);
        resolve();
      });
    });
  });
}

const conn = new Client();
conn.on('ready', async () => {
  try {
    console.log('\n📤 Enviando TODOS os arquivos do backend...');
    const files = ['index.js', 'database.js', 'db.js', 'ai.js', 'followup.js', 'evolution.js', 'package.json'];
    for (const f of files) {
      const localPath = path.join(__dirname, 'server', f);
      if (fs.existsSync(localPath)) {
        await upload(conn, localPath, `${REMOTE_SERVER}/${f}`);
      }
    }

    console.log('\n🔨 Reconstruindo container Docker...');
    await exec(conn, 'cd /var/www/limpeja-docker && docker compose up -d --build --no-deps backend 2>&1');

    console.log('\n✅ Verificando fix dentro do container...');
    await exec(conn, 'docker exec limpeja-docker-backend-1 grep -c "inlineData" /app/ai.js 2>/dev/null && echo "✅ ai.js com suporte a imagens no histórico!" || echo "❌ ai.js NÃO atualizado"');

    console.log('\n📋 Backend logs:');
    await exec(conn, 'sleep 3 && docker logs --tail 5 limpeja-docker-backend-1 2>&1');

    console.log('\n✅ Deploy completo!');
    conn.end();
  } catch (e) {
    console.error('Erro:', e.message);
    conn.end();
  }
});
conn.connect(VPS);
