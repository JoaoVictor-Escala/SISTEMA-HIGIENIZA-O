import { Client } from 'ssh2';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const VPS = { 
  host: '72.62.138.34', 
  port: 22, 
  username: 'root', 
  privateKey: fs.readFileSync(path.join(process.env.USERPROFILE, '.ssh', 'id_ed25519_higigestor')), 
  readyTimeout: 30000 
};
const DOMAIN = 'vivarecuidadores.com.br';
const EMAIL = 'joaovictorwbdesigner@gmail.com';

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
    console.log('\n🛑 Passo 1: Parando nginx para liberar porta 80...');
    await exec(conn, 'cd /var/www/limpeja-docker && docker compose stop frontend');

    console.log('\n🔐 Passo 2: Gerando certificado SSL gratuito para vivarecuidadores...');
    await exec(conn, `certbot certonly --standalone --non-interactive --agree-tos --email ${EMAIL} -d ${DOMAIN} -d www.${DOMAIN}`);

    console.log('\n📦 Passo 3: Enviando nginx.conf e docker-compose.yml atualizados...');
    await upload(conn, path.join(__dirname, 'nginx.conf'), '/var/www/limpeja-docker/nginx.conf');
    await upload(conn, path.join(__dirname, 'docker-compose.yml'), '/var/www/limpeja-docker/docker-compose.yml');

    console.log('\n✅ Passo 4: Subindo containers de volta...');
    await exec(conn, 'cd /var/www/limpeja-docker && docker compose up -d');
    await exec(conn, 'cd /var/www/limpeja-docker && docker compose restart frontend');

    console.log('\n🎉 SSL instalado com sucesso!');
    conn.end();
  } catch (e) {
    console.error('Erro:', e.message);
    conn.end();
  }
});
conn.connect(VPS);
