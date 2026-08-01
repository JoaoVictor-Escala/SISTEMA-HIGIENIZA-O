import { Client } from 'ssh2';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const VPS = { host: '72.62.138.34', port: 22, username: 'root', password: 'Black2024@@@', readyTimeout: 30000 };

function exec(conn, cmd) {
  return new Promise((resolve, reject) => {
    conn.exec(cmd, (err, stream) => {
      if (err) return reject(err);
      let out = '';
      stream.on('data', d => { out += d; process.stdout.write(d.toString()); });
      stream.stderr.on('data', d => { out += d; process.stderr.write(d.toString()); });
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
        console.log(`✅ Upload: ${path.basename(localPath)} → ${remotePath}`);
        resolve();
      });
    });
  });
}

const conn = new Client();
conn.on('ready', async () => {
  try {
    console.log('\n📦 Enviando arquivos atualizados para VPS...');
    await upload(conn, path.join(__dirname, 'nginx.conf'), '/var/www/limpeja-docker/nginx.conf');
    await upload(conn, path.join(__dirname, 'docker-compose.yml'), '/var/www/limpeja-docker/docker-compose.yml');

    console.log('\n🔄 Recriando containers com HTTPS...');
    await exec(conn, 'cd /var/www/limpeja-docker && docker compose down && docker compose up -d --build');

    console.log('\n🎉 Deploy concluído! Sistema disponível em: https://sistema.impactoclean.com.br');
    conn.end();
  } catch (e) {
    console.error('Erro:', e.message);
    conn.end();
  }
});
conn.connect(VPS);
