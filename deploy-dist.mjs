import { Client } from 'ssh2';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const VPS = { host: '72.62.138.34', port: 22, username: 'root', password: 'Black2024@@@', readyTimeout: 60000 };

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
        console.log(`✅ Upload: ${path.basename(localPath)}`);
        resolve();
      });
    });
  });
}

// Upload directory recursively
function uploadDir(conn, localDir, remoteDir) {
  return new Promise((resolve, reject) => {
    conn.sftp((err, sftp) => {
      if (err) return reject(err);

      const files = [];
      function walk(local, remote) {
        const entries = fs.readdirSync(local, { withFileTypes: true });
        for (const e of entries) {
          if (e.isDirectory()) {
            walk(path.join(local, e.name), `${remote}/${e.name}`);
          } else {
            files.push({ local: path.join(local, e.name), remote: `${remote}/${e.name}` });
          }
        }
      }
      walk(localDir, remoteDir);

      let done = 0;
      let errors = 0;
      if (files.length === 0) return resolve();

      for (const f of files) {
        // Ensure remote dir exists
        const dir = path.dirname(f.remote).replace(/\\/g, '/');
        sftp.mkdir(dir, () => {
          sftp.fastPut(f.local, f.remote, (err) => {
            if (err) errors++;
            done++;
            process.stdout.write(`\r  Enviando arquivos... ${done}/${files.length}`);
            if (done === files.length) {
              console.log('');
              resolve();
            }
          });
        });
      }
    });
  });
}

const conn = new Client();
conn.on('ready', async () => {
  try {
    console.log('\n📦 Enviando novo dist (frontend) para VPS...');
    
    // Clear remote dist and upload new one
    await exec(conn, 'rm -rf /var/www/limpeja-docker/dist && mkdir -p /var/www/limpeja-docker/dist');
    await uploadDir(conn, path.join(__dirname, 'dist'), '/var/www/limpeja-docker/dist');

    // Clear remote server and upload new one
    console.log('\n📦 Enviando novo backend para VPS...');
    await exec(conn, 'rm -rf /var/www/limpeja-docker/server && mkdir -p /var/www/limpeja-docker/server');
    await uploadDir(conn, path.join(__dirname, 'server'), '/var/www/limpeja-docker/server');

    console.log('\n🔄 Parando Nginx nativo e Rebuilding containers...');
    await exec(conn, 'systemctl stop nginx && systemctl disable nginx || true');
    await exec(conn, 'cd /var/www/limpeja-docker && docker compose up -d --build');

    console.log('\n🎉 Deploy concluído! Acesse: https://sistema.impactoclean.com.br');
    conn.end();
  } catch (e) {
    console.error('Erro:', e.message);
    conn.end();
  }
});
conn.connect(VPS);
