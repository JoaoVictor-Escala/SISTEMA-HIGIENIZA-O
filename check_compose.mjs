import { Client } from 'ssh2';
import fs from 'fs';
import path from 'path';

const conn = new Client();
conn.on('ready', () => {
  conn.exec('cat /var/www/limpeja-docker/docker-compose.yml', (err, stream) => {
    let data = '';
    stream.on('data', d => data += d).on('close', () => {
      console.log('docker-compose.yml:');
      console.log(data);
      conn.end();
    });
  });
}).connect({
  host: '72.62.138.34',
  port: 22,
  username: 'root',
  password: 'Black2024@@@',
  readyTimeout: 60000
});
