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
        console.log(`✅ ${path.basename(localPath)}`);
        resolve();
      });
    });
  });
}

const conn = new Client();
conn.on('ready', async () => {
  try {
    console.log('\n📤 Enviando arquivos do backend...');
    const files = ['index.js', 'database.js', 'db.js'];
    for (const f of files) {
      await upload(conn, path.join(__dirname, 'server', f), `${REMOTE_SERVER}/${f}`);
    }

    console.log('\n🔄 Reiniciando backend container...');
    await exec(conn, 'cd /var/www/limpeja-docker && docker compose restart backend');

    console.log('\n✅ Backend atualizado com sucesso!');
    conn.end();
  } catch (e) {
    console.error('Erro:', e.message);
    conn.end();
  }
});
conn.connect(VPS);
