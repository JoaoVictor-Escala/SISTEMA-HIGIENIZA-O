import { Client } from 'ssh2';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const VPS = { host: '72.62.138.34', port: 22, username: 'root', password: 'Black2024@@@', readyTimeout: 30000 };
const DOMAIN = 'sistema.impactoclean.com.br';
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

const conn = new Client();
conn.on('ready', async () => {
  try {
    console.log('\n📦 Passo 1: Instalando Certbot...');
    await exec(conn, 'apt-get update -qq && apt-get install -y certbot');

    console.log('\n🛑 Passo 2: Parando container frontend para liberar porta 80...');
    await exec(conn, 'docker stop limpeja-docker-frontend-1 || true');

    console.log('\n🔐 Passo 3: Gerando certificado SSL gratuito...');
    await exec(conn, `certbot certonly --standalone --non-interactive --agree-tos --email ${EMAIL} -d ${DOMAIN}`);

    console.log('\n✅ Passo 4: Certificado gerado! Subindo containers de volta...');
    await exec(conn, 'cd /var/www/limpeja-docker && docker compose up -d');

    console.log('\n🎉 SSL instalado com sucesso!');
    console.log(`   Certificado em: /etc/letsencrypt/live/${DOMAIN}/`);
    conn.end();
  } catch (e) {
    console.error('Erro:', e.message);
    conn.end();
  }
});
conn.connect(VPS);
