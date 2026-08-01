import { Client } from 'ssh2';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = __dirname; 

const VPS = {
  host: '72.62.138.34',
  port: 22,
  username: 'root',
  password: 'Black2024@@@',
  readyTimeout: 20000,
};

const APP_DIR = '/var/www/limpeja-docker';

function runSSH(conn, command) {
  return new Promise((resolve, reject) => {
    let out = '', err = '';
    conn.exec(command, (error, stream) => {
      if (error) return reject(error);
      stream.on('data', d => { out += d; process.stdout.write(d.toString()); });
      stream.stderr.on('data', d => { err += d; process.stderr.write(d.toString()); });
      stream.on('close', (code) => {
        if (code !== 0 && code !== null) reject(new Error(`Exit ${code}: ${err}`));
        else resolve(out);
      });
    });
  });
}

function uploadFile(sftp, localPath, remotePath) {
  return new Promise((resolve, reject) => {
    sftp.fastPut(localPath, remotePath, (err) => {
      if (err) reject(err); else resolve();
    });
  });
}

function mkdirRemote(sftp, dir) {
  return new Promise((resolve) => {
    sftp.mkdir(dir, () => resolve());
  });
}

function uploadDir(sftp, localDir, remoteDir) {
  return new Promise(async (resolve, reject) => {
    try {
      await mkdirRemote(sftp, remoteDir);
      const entries = fs.readdirSync(localDir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.name === 'node_modules' || entry.name === '.git') continue;
        const localPath = path.join(localDir, entry.name);
        const remotePath = remoteDir + '/' + entry.name;
        if (entry.isDirectory()) {
          await uploadDir(sftp, localPath, remotePath);
        } else {
          process.stdout.write(`  ↑ ${remotePath}\n`);
          await uploadFile(sftp, localPath, remotePath);
        }
      }
      resolve();
    } catch(e) { reject(e); }
  });
}

async function deploy() {
  console.log('📦 Compilando frontend localmente...');
  execSync('npm run build', { stdio: 'inherit' });

  const conn = new Client();
  await new Promise((resolve, reject) => { conn.on('ready', resolve); conn.on('error', reject); conn.connect(VPS); });

  console.log('\n✅ SSH conectado!\n');

  console.log('📦 Verificando Docker e Docker Compose...');
  await runSSH(conn, `
    if ! command -v docker &>/dev/null; then
      curl -fsSL https://get.docker.com -o get-docker.sh && sh get-docker.sh
      systemctl enable docker
      systemctl start docker
    fi
  `);

  console.log('\n📁 Criando diretório da aplicação...');
  await runSSH(conn, `mkdir -p ${APP_DIR} ${APP_DIR}/server`);

  console.log('\n📤 Enviando arquivos via SFTP...');
  const sftp = await new Promise((res, rej) => conn.sftp((err, sftp) => err ? rej(err) : res(sftp)));
  await uploadDir(sftp, ROOT, APP_DIR);
  
  // Parar a versão antiga que rodava no PM2
  console.log('\n🛑 Limpando versão antiga (PM2/Nginx Nativo)...');
  await runSSH(conn, `
    pm2 delete limpeja-backend 2>/dev/null || true
    systemctl stop nginx || true
    systemctl disable nginx || true
  `);

  console.log('\n🚀 Subindo containers com Docker Compose...');
  await runSSH(conn, `
    cd ${APP_DIR}
    docker compose down
    docker compose up -d --build
  `);

  conn.end();
  console.log('\n🎉 DEPLOY DOCKER CONCLUÍDO!');
  console.log(`🌐 Sistema disponível em: http://72.62.138.34`);
}

deploy().catch(err => { console.error('\n❌ Erro no deploy:', err.message); process.exit(1); });
