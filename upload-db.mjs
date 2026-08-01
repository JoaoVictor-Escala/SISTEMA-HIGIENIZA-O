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

const localDbPath = path.join(__dirname, 'server', 'saas.db');
const remoteDbPath = '/var/lib/docker/volumes/limpeja-docker_saas_data/_data/saas.db';

console.log('📦 Iniciando upload do banco de dados local para a VPS...');

const conn = new Client();
conn.on('ready', () => {
  conn.sftp((err, sftp) => {
    if (err) throw err;
    console.log('✅ Conexão SFTP estabelecida.');
    
    sftp.fastPut(localDbPath, remoteDbPath, (err) => {
      if (err) throw err;
      console.log('✅ Upload concluído! Reiniciando o container do backend...');
      
      conn.exec('docker restart limpeja-docker-backend-1', (err, stream) => {
        if (err) throw err;
        stream.on('data', (d) => process.stdout.write(d.toString()));
        stream.on('close', () => {
          console.log('✅ Container reiniciado. Banco de dados restaurado!');
          conn.end();
        });
      });
    });
  });
}).connect(VPS);
