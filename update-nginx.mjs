import { Client } from 'ssh2';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const VPS = {
  host: '72.62.138.34',
  port: 22,
  username: 'root',
  password: 'Black2024@@@',
  readyTimeout: 20000,
};

const localPath = path.join(__dirname, 'nginx.conf');
const remotePath = '/var/www/limpeja-docker/nginx.conf';

console.log('📦 Iniciando upload do nginx.conf para a VPS...');

const conn = new Client();
conn.on('ready', () => {
  conn.sftp((err, sftp) => {
    if (err) throw err;
    sftp.fastPut(localPath, remotePath, (err) => {
      if (err) throw err;
      console.log('✅ Upload concluído! Fazendo build e recriando frontend...');
      
      // Need to rebuild frontend to copy new nginx.conf into container
      conn.exec('cd /var/www/limpeja-docker && docker compose up -d --build frontend', (err, stream) => {
        if (err) throw err;
        stream.on('data', (d) => process.stdout.write(d.toString()));
        stream.stderr.on('data', (d) => process.stderr.write(d.toString()));
        stream.on('close', () => {
          console.log('✅ Frontend recriado com sucesso!');
          conn.end();
        });
      });
    });
  });
}).connect(VPS);
