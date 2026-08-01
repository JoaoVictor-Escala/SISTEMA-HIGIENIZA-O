import { Client } from 'ssh2';
import fs from 'fs';
import path from 'path';

const conn = new Client();
conn.on('ready', () => {
  conn.exec('docker exec nginx-proxy cat /etc/nginx/conf.d/default.conf', (err, stream) => {
    let data = '';
    stream.on('data', d => data += d).on('close', () => {
      console.log('nginx-proxy default.conf (checking if it exists):');
      console.log(data);
      conn.exec('docker exec nginx-proxy ls -la /etc/nginx/conf.d', (err, stream2) => {
        let data2 = '';
        stream2.on('data', d => data2 += d).on('close', () => {
          console.log('nginx-proxy ls /etc/nginx/conf.d:');
          console.log(data2);
          conn.end();
        });
      });
    });
  });
}).connect({
  host: '72.62.138.34',
  port: 22,
  username: 'root',
  password: 'Black2024@@@',
  readyTimeout: 60000
});
